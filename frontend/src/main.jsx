import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { SystemProvider } from "./context/SystemContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <SystemProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SystemProvider>
    </BrowserRouter>
  </StrictMode>
);
