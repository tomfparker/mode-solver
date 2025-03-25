// filepath: /home/tom/Projects/mode-solver/frontend/src/components/Canvas.tsx
import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";


const Canvas = ({ onSave }: { onSave: (data: number[][]) => void }) => {
  const canvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas("waveguide-canvas", {
      backgroundColor: "#fff", // Background representing refractive index 1
      selection: false,
    });
    canvas.isDrawingMode = true; // Enable drawing mode
    canvasRef.current = canvas;

    // Add a rectangle in the middle with refractive index 2
    const rect = new fabric.Rect({
      left: canvas.width! / 2 - 50, // Center horizontally
      top: canvas.height! / 2 - 50, // Center vertically
      fill: "rgba(255, 0, 0, 0.5)", // Red color to represent refractive index 2
      width: 100, // Width of the rectangle
      height: 100, // Height of the rectangle
    });
    canvas.add(rect); // Add the rectangle to the canvas
    canvas.renderAll(); // Render the canvas

    // Function to convert the canvas to a 2D array of refractive index values
    const convertCanvasToArray = () => {
      if (!canvasRef.current) return [];

      const context = canvasRef.current.getContext(); // Get the canvas context
      const width = canvasRef.current.getWidth();
      const height = canvasRef.current.getHeight();
      const imageData = context.getImageData(0, 0, width, height).data; // Get pixel data

      const refractiveIndexArray: number[][] = [];
      for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4; // RGBA values
          const red = imageData[index]; // Red channel
          const alpha = imageData[index + 3]; // Alpha channel

          // Map pixel color to refractive index
          if (alpha === 0) {
            row.push(1); // Background (transparent) -> refractive index 1
          } else if (red > 200) {
            row.push(2); // Red -> refractive index 2
          } else {
            row.push(1); // Default -> refractive index 1
          }
        }
        refractiveIndexArray.push(row);
      }
      return refractiveIndexArray;
    };

    // Automatically save the structure
    const saveStructure = () => {
      const refractiveIndexArray = convertCanvasToArray();
      onSave(refractiveIndexArray); // Pass the 2D array to the parent component
    };

    // Save the initial structure
    saveStructure();

    // Save the structure whenever the user draws on the canvas
    canvas.on("path:created", saveStructure); // Trigger save on new drawing

    return () => {
      canvas.off("path:created", saveStructure); // Clean up event listener
      canvas.dispose();
    };
  }, [onSave]);

  return <canvas id="waveguide-canvas" width={400} height={300} />;
};

export default Canvas;