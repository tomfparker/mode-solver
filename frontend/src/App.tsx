import React, { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import Canvas from "./components/Canvas.tsx";
import "./styles.css"; // Import the CSS file

const App = () => {
  const [structure, setStructure] = useState<string>(""); // Stores the index profile
  const [modes, setModes] = useState<number[][] | null>(null); // Stores the modes returned by the backend

  const handleRun = async () => {
    try {
      console.log("Running simulation with structure:", structure); // Debug log

      if (!structure) {
        console.error("Structure is empty. Please draw on the canvas before running the simulation.");
        return;
      }

      // Send the structure to the backend
      const response = await axios.post("http://localhost:5000/simulate", {
        structure, // Send the 2D array directly
      });

      console.log("Backend response:", response.data); // Debug log
      setModes(response.data.modes); // Update the modes state
    } catch (error) {
      console.error("Error during simulation:", error);
    }
  };

  return (
    <div className="app">
      <h1>Guide Mode</h1>
      <div className="canvas-container">
        <Canvas onSave={setStructure} /> {/* Canvas for drawing the index profile */}
      </div>
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

