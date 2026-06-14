// ~ FILE-PATH: src/main.tsx

import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./styles/styles.css";
import Settings from "./Settings.ts";
import App from "./components/App.tsx";

const settings: Settings = Settings.getInstance();

const rootElement: HTMLDivElement = document.getElementById(
  "root",
) as HTMLDivElement;
const root: Root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App {...settings} />
  </StrictMode>,
);
