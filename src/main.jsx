import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

import App from "./App.jsx";
import { queryClient } from "./lib/queryClient.js";
import { QueryClientProvider } from "@tanstack/react-query";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
