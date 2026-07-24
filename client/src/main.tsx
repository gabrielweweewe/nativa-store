import { createRoot } from "react-dom/client";
import { prefetchActiveBanners } from "./lib/banners";
import App from "./App";
import "./index.css";

// Dispara GET /api/banners em paralelo com o parse/execução do restante do bundle.
prefetchActiveBanners();

createRoot(document.getElementById("root")!).render(<App />);
