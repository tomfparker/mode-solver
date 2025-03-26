import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import "./Canvas.css";

const Canvas = () => {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [layers, setLayers] = useState<any[]>([]); // List of added objects
  const [showModal, setShowModal] = useState(false); // Show/hide modal
  const [selectedType, setSelectedType] = useState<string>(""); // Selected structure type
  const [properties, setProperties] = useState<any>({
    vertices: "",
    refractiveIndex: 1,
    center: "",
    radii: "",
  }); // Properties for the selected structure

  useEffect(() => {
    const canvas = new fabric.Canvas("waveguide-canvas", {
      backgroundColor: "#f0f0f0",
      selection: false,
    });
    canvasRef.current = canvas;

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
        { id: newObject.id, type: selectedType, properties: { ...properties }, object: newObject },
      ]);
      setShowModal(false); // Close the modal
    }
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
      <div className="canvas-wrapper">
        <canvas id="waveguide-canvas" width={600} height={400} />
      </div>
      <div className="controls">
        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setShowModal(true); // Show modal when a type is selected
          }}
        >
          <option value="">Select Structure</option>
          <option value="Polygon">Polygon</option>
          <option value="Ellipse">Ellipse</option>
        </select>
      </div>

      {/* Modal for Adding Structures */}
      {showModal && (
        <div className="modal">
          <h3>Add {selectedType}</h3>
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
          <button onClick={handleAddObject}>Add</button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </div>
      )}

      {/* Layers Table */}
      <div className="layers-table">
        <h3>Layers</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{layer.type}</td>
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