import { useContext } from "react";
import { ToastContext } from "../context/toastContext";

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast harus digunakan di dalam ToastProvider");
  }

  return context;
};
