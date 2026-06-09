import React from "react";
import ReactDOM from "react-dom/client";
import { initTheme } from "@inventario/ui/theme";
import App from "./App";
import "@inventario/ui/globals.css";
import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
