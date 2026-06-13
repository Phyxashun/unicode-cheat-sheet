// ~ FILE-PATH: src/components/Particles.tsx

import { type FC, useEffect, useRef } from "react";
import ParticleSystem from "../utils/ParticleSystem";

const Particles: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<ParticleSystem>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize the app
    const app = new ParticleSystem(canvas);
    appRef.current = app;

    const observer = new MutationObserver(() => {
      app.updateThemeColors();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Return a cleanup function to prevent memory leaks
    return () => {
      observer.disconnect();
      app.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="
        pointer-events-none fixed inset-0 -z-10 block size-full w-full bg-bg
      "
    />
  );
};

export default Particles;
