import React, { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import Canvas from "./components/Canvas.tsx";
import "./styles.css"; // Import the CSS file

const App = () => {
  const [structure, setStructure] = useState<string>(""); // Stores the index profile
  const [wavelength, setWavelength] = useState<string>(""); // Stores the wavelength
  const [modes, setModes] = useState<number[][] | null>(null); // Stores the modes returned by the backend

  const handleRun = async () => {
    try {
      console.log("Running simulation with structure:", structure, "and wavelength:", wavelength); // Debug log

      if (!structure) {
        console.error("Structure is empty. Please draw on the canvas before running the simulation.");
        return;
      }

      if (!wavelength) {
        console.error("Wavelength is empty. Please enter a wavelength before running the simulation.");
        return;
      }

      // Send the structure and wavelength to the backend
      const response = await axios.post("http://localhost:5000/simulate", {
        structure, // Send the 2D array directly
        wavelength: parseFloat(wavelength), // Convert wavelength to a number
      });

      console.log("Backend response:", response.data); // Debug log
      setModes(response.data.modes); // Update the modes state
    } catch (error) {
      console.error("Error during simulation:", error);
    }
  };

  return (
    <div className="app">
      <h1>EM Mode Solver</h1>
      <div className="canvas-container">
        <Canvas onSave={setStructure} /> {/* Canvas for drawing the index profile */}
      </div>
      <div>
        <label htmlFor="wavelength"> Wavelength (nm) : </label>
        <input
          id="wavelength"
          type="number"
          value={wavelength}
          onChange={(e) => setWavelength(e.target.value)} // Update wavelength state
          placeholder="Enter wavelength"
        />
      </div>
      <button onClick={handleRun} className="btn">Run</button> {/* Single "Run" button */}
      {modes && modes.length > 0 && (
        <div className="plot-container">
          <Plot
            data={[
              {
                z: modes,
                type: "heatmap",
                colorscale: "Viridis",
              },
            ]}
            layout={{ title: "Mode Profile", width: 500, height: 400 }}
          />
        </div>
      )}
    </div>
  );
};

export default App;

