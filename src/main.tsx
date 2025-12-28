import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

console.log("main.tsx loading");

const root = document.getElementById("root");
console.log("Root element:", root);

if (!root) {
  console.error("Root element not found!");
  throw new Error("Root element #root not found in DOM");
}

try {
  console.log("Creating React root");
  const reactRoot = createRoot(root);
  console.log("Rendering App component");
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("App rendered successfully");
} catch (error) {
  console.error("Error rendering app:", error);
  root.innerHTML = `<div style="color:red;padding:20px"><h1>Error loading app</h1><pre>${String(error)}</pre></div>`;
}
