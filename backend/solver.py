import numpy as np
import scipy.sparse as sps
import time
from typing import Optional, Tuple, Dict
from scipy.sparse import csr_matrix
import scipy.constants as cst
import scipy.sparse.linalg as linalg

def construct_p_matrix(
    wav_num_0: float,
    index_map: np.ndarray,
    dx: float,
    dy: float,
    x_boundary: Optional[str] = None,
    y_boundary: Optional[str] = None
) -> Tuple[csr_matrix, Dict[str, csr_matrix]]:
    """
    Constructs the P matrix and related operators for a finite difference grid.

    Args:
        wav_num_0 (float): Wave number.
        index_map (np.ndarray): 3D array containing refractive index values.
        dx (float): Grid spacing in the x-direction.
        dy (float): Grid spacing in the y-direction.
        x_boundary (Optional[str]): Boundary condition in the x-direction ('periodic' or None).
        y_boundary (Optional[str]): Boundary condition in the y-direction ('periodic' or None).

    Returns:
        Tuple[csr_matrix, Dict[str, csr_matrix]]: The P matrix and a dictionary of related operators.
    """
    nx, ny, _ = np.shape(index_map)
    print(f"Assembling matrix for {nx * ny} grid points...\n")

    # Construct finite difference operators
    Ux_temp = (-np.eye(nx, k=0) + np.eye(nx, k=1)) / dx
    Uy = (-sps.eye(nx * ny, k=0) + sps.eye(nx * ny, k=nx)) / dy

    if x_boundary == 'periodic':
        Ux_temp[nx - 1, 0] = 1.0 / dx

    if y_boundary == 'periodic':
        Uy += sps.eye(nx * ny, k=-(nx - 1) * ny) / dy

    Ux = sps.block_diag([Ux_temp for _ in range(ny)], format='csr')
    Vx = -Ux.transpose()
    Vy = -Uy.transpose()
    I = sps.eye(nx * ny)

    # Build relative permittivity tensors
    epsx = np.empty(nx * ny, dtype=index_map.dtype)
    epsy = np.empty(nx * ny, dtype=index_map.dtype)
    epszi = np.empty(nx * ny, dtype=index_map.dtype)

    for count, (i, j) in enumerate(np.ndindex(nx, ny)):
        epsx[count] = index_map[i, j, 0] ** 2
        epsy[count] = index_map[i, j, 1] ** 2
        epszi[count] = 1.0 / index_map[i, j, 2] ** 2

    epsx = sps.spdiags(epsx, 0, nx * ny, nx * ny, format='csr')
    epsy = sps.spdiags(epsy, 0, nx * ny, nx * ny, format='csr')
    epszi = sps.spdiags(epszi, 0, nx * ny, nx * ny, format='csr')

    # Construct full operator matrices
    t = time.time()
    Pxx = (
        -Ux * epszi * Vy * Vx * Uy / wav_num_0**2
        + (wav_num_0**2 * I + Ux * epszi * Vx) * (epsx + Vy * Uy / wav_num_0**2)
    )
    Pyy = (
        -Uy * epszi * Vx * Vy * Ux / wav_num_0**2
        + (wav_num_0**2 * I + Uy * epszi * Vy) * (epsy + Vx * Ux / wav_num_0**2)
    )
    Pxy = (
        Ux * epszi * Vy * (epsy + Vx * Ux / wav_num_0**2)
        - (wav_num_0**2 * I + Ux * epszi * Vx) * Vy * Ux / wav_num_0**2
    )
    Pyx = (
        Uy * epszi * Vx * (epsx + Vy * Uy / wav_num_0**2)
        - (wav_num_0**2 * I + Uy * epszi * Vy) * Vx * Uy / wav_num_0**2
    )
    print(f"Matrix assembly completed in {time.time() - t:.2f} seconds.")

    # Final assembly
    P = sps.vstack([sps.hstack([Pxx, Pxy]), sps.hstack([Pyx, Pyy])])

    return P, {'epsx': epsx, 'epsy': epsy, 'epszi': epszi, 'ux': Ux, 'uy': Uy, 'vx': Vx, 'vy': Vy}
    
def reconstruct_fields(
    k0: float,
    beta: float,
    Ex: csr_matrix,
    Ey: csr_matrix,
    matrices: Dict[str, csr_matrix]
) -> Tuple[csr_matrix, csr_matrix, csr_matrix, csr_matrix]:
    """
    Reconstructs the electromagnetic field components from eigenvalues and solutions.

    Args:
        k0 (float): Wave number (2 * pi / wavelength).
        beta (float): Propagation constant.
        Ex (csr_matrix): Electric field component in the x-direction.
        Ey (csr_matrix): Electric field component in the y-direction.
        matrices (Dict[str, csr_matrix]): Dictionary of precomputed matrices.

    Returns:
        Tuple[csr_matrix, csr_matrix, csr_matrix, csr_matrix]: Reconstructed field components (Ez, Hx, Hy, Hz).
    """
    Hz = 1j * (matrices['uy'] @ Ex - matrices['ux'] @ Ey) / k0
    Hx = (1j * matrices['vx'] @ Hz - k0 * matrices['epsy'] @ Ey) / beta
    Hy = (k0 * matrices['epsx'] @ Ex - 1j * matrices['vy'] @ Hz) / beta
    Ez = matrices['epszi'] @ (-matrices['vy'] @ Hx + matrices['vx'] @ Hy)

    return Ez, Hx, Hy, Hz


def solve(
    P: csr_matrix, 
    beta_trial: float, 
    E_trial: Optional[np.ndarray] = None, 
    neigs: int = 1
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Solves the eigenproblem and returns beta and the transverse E-fields.

    Args:
        P (csr_matrix): The system matrix.
        beta_trial (float): Initial guess for the propagation constant.
        E_trial (Optional[np.ndarray]): Initial guess for the eigenvector.
        neigs (int): Number of eigenvalues and eigenvectors to compute.

    Returns:
        Tuple[np.ndarray, np.ndarray, np.ndarray]: Propagation constants (beta), 
        and transverse electric field components (Ex, Ey).
    """
    print('Solving eigenmodes on CPU...')
    t = time.time()

    # Solve the eigenvalue problem
    beta_squared, E = linalg.eigs(P, k=neigs, sigma=beta_trial**2, v0=E_trial)

    # Split the eigenvectors into Ex and Ey components
    Ex, Ey = np.split(E, 2, axis=0)

    # Transpose the results for consistency
    Ex, Ey = Ex.T, Ey.T

    print(f"Solution completed in {time.time() - t:.2f} seconds.")

    # Return the square root of eigenvalues as beta and the field components
    return np.sqrt(beta_squared.real), Ex, Ey
