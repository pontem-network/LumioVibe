import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

function getBasename(): string {
  const baseUrl = import.meta.env.VITE_BASE_URL || '';
  if (!baseUrl) return '/';
  try {
    const url = new URL(baseUrl);
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    const match = baseUrl.match(/^https?:\/\/[^/]+(\/.*?)\/?$/);
    return match ? match[1] : '/';
  }
}

const basename = getBasename();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>
);
