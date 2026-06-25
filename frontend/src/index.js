import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Inyectar @font-face para Plane Crash en runtime.
// (El preview de Emergent strippea <style> y <link> custom de index.html,
// por lo que registramos la fuente desde JS para garantizar que cargue.)
(function injectPlaneCrashFont() {
  if (document.getElementById("fsc-plane-crash-font")) return;
  const style = document.createElement("style");
  style.id = "fsc-plane-crash-font";
  style.textContent = `
    @font-face {
      font-family: 'Plane Crash';
      src: local('Plane Crash'), local('PlaneCrash'),
           url('/fonts/PlaneCrash.ttf') format('truetype');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
