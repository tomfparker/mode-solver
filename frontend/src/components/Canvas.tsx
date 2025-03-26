import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import "./Canvas.css";

const Canvas = ({ onRunSimulation }: { onRunSimulation: () => void }) => {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [layers, setLayers] = useState<any[]>([]); // List of added objects
  const [showModal, setShowModal] = useState(false); // Show/hide modal for adding objects
  const [showSimulationModal, setShowSimulationModal] = useState(false); // Show/hide modal for simulation options
  const [selectedType, setSelectedType] = useState<string>("Polygon"); // Default structure type
  const [properties, setProperties] = useState<any>({
    name: "",
    material: "Custom",
    refractiveIndex: 1,
    vertices: "",
    center: "",
    radii: "",
  }); // Properties for the selected structure

  // Simulation options
  const [wavelength, setWavelength] = useState<number>(1550); // Default wavelength in nm
  const [dx, setDx] = useState<number>(0.001); // Default dx in microns
  const [dy, setDy] = useState<number>(0.001); // Default dy in microns

  const materialRefractiveIndices: { [key: string]: number } = {
    Silicon: 3.48,
    Silica: 1.44,
    Air: 1.0,
    Custom: properties.refractiveIndex, // Custom value
  };

  useEffect(() => {
    // Initialize the Fabric.js canvas
    const canvas = new fabric.Canvas("waveguide-canvas", {
      backgroundColor: "#ffffff", // White background
      selection: false, // Disable selection for the grid
    });
    canvasRef.current = canvas;

    // Draw the grid
    const gridSize = 20; // Grid cell size in pixels
    const canvasWidth = 600;
    const canvasHeight = 400;

    for (let i = 0; i < canvasWidth / gridSize; i++) {
      const x = i * gridSize;
      canvas.add(
        new fabric.Line([x, 0, x, canvasHeight], {
          stroke: "#e0e0e0",
          selectable: false,
        })
      );
    }

    for (let i = 0; i < canvasHeight / gridSize; i++) {
      const y = i * gridSize;
      canvas.add(
        new fabric.Line([0, y, canvasWidth, y], {
          stroke: "#e0e0e0",
          selectable: false,
        })
      );
    }

    // Add scale reference in the bottom-left corner
    const scaleLine = new fabric.Line([10, canvasHeight - 20, 110, canvasHeight - 20], {
      stroke: "#000",
      strokeWidth: 2,
      selectable: false,
    });
    const scaleText = new fabric.Text("100 µm", {
      left: 115,
      top: canvasHeight - 30,
      fontSize: 14,
      fill: "#000",
      selectable: false,
    });
    canvas.add(scaleLine, scaleText);

    return () => {
      canvas.dispose();
    };
  }, []);

  const handleAddObject = () => {
    if (!canvasRef.current) return;

    let newObject;
    if (selectedType === "Polygon") {
      const points = properties.vertices
        .split(";")
        .map((pair: string) => pair.split(",").map(Number))
        .map(([x, y]) => ({ x, y }));

      if (points.length < 3) {
        alert("A polygon must have at least 3 vertices.");
        return;
      }

      newObject = new fabric.Polygon(points, {
        fill: `rgba(${Math.min(properties.refractiveIndex * 50, 255)}, 0, 0, 0.5)`,
        selectable: true,
      });
    } else if (selectedType === "Ellipse") {
      const [cx, cy] = properties.center.split(",").map(Number);
      const [rx, ry] = properties.radii.split(",").map(Number);

      if (isNaN(cx) || isNaN(cy) || isNaN(rx) || isNaN(ry)) {
        alert("Invalid ellipse parameters. Please provide valid numbers.");
        return;
      }

      newObject = new fabric.Ellipse({
        left: cx - rx,
        top: cy - ry,
        rx,
        ry,
        fill: `rgba(${Math.min(properties.refractiveIndex * 50, 255)}, 0, 0, 0.5)`,
        selectable: true,
      });
    }

    if (newObject) {
      canvasRef.current.add(newObject);
      setLayers((prevLayers) => [
        ...prevLayers,
        {
          id: newObject.id,
          name: properties.name || `Layer ${prevLayers.length + 1}`,
          type: selectedType,
          material: properties.material,
          refractiveIndex: properties.refractiveIndex,
          properties: { ...properties },
          object: newObject,
        },
      ]);
      setShowModal(false); // Close the modal
    }
  };

  const handleMaterialChange = (material: string) => {
    setProperties({
      ...properties,
      material,
      refractiveIndex: materialRefractiveIndices[material],
    });
  };

  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    if (!canvasRef.current) return;

    const reorderedLayers = [...layers];
    const [movedLayer] = reorderedLayers.splice(fromIndex, 1);
    reorderedLayers.splice(toIndex, 0, movedLayer);

    // Update z-order on the canvas
    reorderedLayers.forEach((layer, index) => {
      canvasRef.current?.moveTo(layer.object, index);
    });

    setLayers(reorderedLayers);
  };

  const handleDeleteLayer = (index: number) => {
    const updatedLayers = [...layers];
    const [removedLayer] = updatedLayers.splice(index, 1);
    setLayers(updatedLayers);

    if (canvasRef.current) {
      canvasRef.current.remove(removedLayer.object);
    }
  };

  return (
    <div className="canvas-container">
      {/* Canvas Plotter */}
      <div className="canvas-wrapper">
        <canvas id="waveguide-canvas" width={600} height={400} />
      </div>

      <div className="controls">
        {/* Plus Button to Add Objects */}
        <button className="add-button" onClick={() => setShowModal(true)}>
          +
        </button>

        {/* Simulation Options Button */}
        <button
          className="simulation-button"
          onClick={() => setShowSimulationModal(true)}
        >
          ⚙
        </button>

        {/* Run Simulation Button */}
        <button className="run-button" onClick={onRunSimulation}>
          ▶
        </button>
      </div>

      {/* Modal for Adding Structures */}
      {showModal && (
        <div className="modal">
          <h3>Add Object</h3>
          <label>
            Name:
            <input
              type="text"
              value={properties.name}
              onChange={(e) =>
                setProperties({ ...properties, name: e.target.value })
              }
              placeholder="Enter layer name"
            />
          </label>
          <label>
            Object Type:
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="Polygon">Polygon</option>
              <option value="Ellipse">Ellipse</option>
            </select>
          </label>
          {selectedType === "Polygon" && (
            <div>
              <label>
                Vertices (x,y;x,y;...):
                <input
                  type="text"
                  value={properties.vertices}
                  onChange={(e) =>
                    setProperties({ ...properties, vertices: e.target.value })
                  }
                />
              </label>
            </div>
          )}
          {selectedType === "Ellipse" && (
            <div>
              <label>
                Center (cx,cy):
                <input
                  type="text"
                  value={properties.center}
                  onChange={(e) =>
                    setProperties({ ...properties, center: e.target.value })
                  }
                />
              </label>
              <label>
                Radii (rx,ry):
                <input
                  type="text"
                  value={properties.radii}
                  onChange={(e) =>
                    setProperties({ ...properties, radii: e.target.value })
                  }
                />
              </label>
            </div>
          )}
          <label>
            Material:
            <select
              value={properties.material}
              onChange={(e) => handleMaterialChange(e.target.value)}
            >
              <option value="Silicon">Silicon</option>
              <option value="Silica">Silica</option>
              <option value="Air">Air</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
          {properties.material === "Custom" && (
            <label>
              Refractive Index:
              <input
                type="number"
                value={properties.refractiveIndex}
                onChange={(e) =>
                  setProperties({
                    ...properties,
                    refractiveIndex: Number(e.target.value),
                  })
                }
              />
            </label>
          )}
          <button onClick={handleAddObject}>Add</button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </div>
      )}

      {/* Modal for Simulation Options */}
      {showSimulationModal && (
        <div className="modal">
          <h3>Simulation Options</h3>
          <label>
            Wavelength (nm):
            <input
              type="number"
              value={wavelength}
              onChange={(e) => setWavelength(Number(e.target.value))}
            />
          </label>
          <label>
            dx (µm):
            <input
              type="number"
              value={dx}
              onChange={(e) => setDx(Number(e.target.value))}
            />
          </label>
          <label>
            dy (µm):
            <input
              type="number"
              value={dy}
              onChange={(e) => setDy(Number(e.target.value))}
            />
          </label>
          <button onClick={() => setShowSimulationModal(false)}>Close</button>
        </div>
      )}

      {/* Layers Table */}
      <div className="layers-table">
        <h3>Layers</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Type</th>
              <th>Material</th>
              <th>Refractive Index</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{layer.name}</td>
                <td>{layer.type}</td>
                <td>{layer.material}</td>
                <td>{layer.refractiveIndex}</td>
                <td>
                  <button
                    onClick={() => handleReorderLayers(index, index - 1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorderLayers(index, index + 1)}
                    disabled={index === layers.length - 1}
                  >
                    ↓
                  </button>
                  <button onClick={() => handleDeleteLayer(index)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Canvas;