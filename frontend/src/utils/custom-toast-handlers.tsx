import { CSSProperties } from "react";
import toast, { ToastOptions } from "react-hot-toast";
import { calculateToastDuration } from "./toast-duration";

const TOAST_STYLE: CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #2a2a2a",
  color: "#fff",
  borderRadius: "8px",
};

export const TOAST_OPTIONS: ToastOptions = {
  position: "top-right",
  style: TOAST_STYLE,
};

export const displayErrorToast = (error: string) => {
  const duration = calculateToastDuration(error, 4000);
  toast.error(error, { ...TOAST_OPTIONS, duration });
};

export const displaySuccessToast = (message: string) => {
  const duration = calculateToastDuration(message, 5000);
  toast.success(message, { ...TOAST_OPTIONS, duration });
};
