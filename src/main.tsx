// ~ FILE-PATH: src/main.tsx

import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./styles.css";
import App from "./App.tsx";

const rootElement: HTMLDivElement = document.getElementById(
  "root",
) as HTMLDivElement;
const root: Root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
