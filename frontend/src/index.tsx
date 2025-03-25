import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles.css"; // Ensure styles are imported

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
  );