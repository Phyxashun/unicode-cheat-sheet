import Particle from "./Particle";
import Options, { type MousePosition } from "./Options";

class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private frameId: number = 0;
  private mouse: MousePosition = { x: -9999, y: -9999, isPressed: false };
  private themeColors: string[] = [];
  private lineColor: string = "rgba(192, 132, 252, 0.5)";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.updateThemeColors();
    this.bindEvents();
    this.resize();
    this.loop();
  }

  public updateThemeColors() {
    const root = document.documentElement;
    const styles = window.getComputedStyle(root);

    // Read raw values from your Tailwind @theme definitions
    const text = styles.getPropertyValue("--text").trim() || "#9ca3af";
    const textH = styles.getPropertyValue("--text-h").trim() || "#f3f4f6";
    const accent = styles.getPropertyValue("--accent").trim() || "#c084fc";
    const accentBg =
      styles.getPropertyValue("--accent-bg").trim() ||
      "rgba(192, 132, 252, 0.15)";
    //const accentBorder = styles.getPropertyValue("--accent-border").trim() || "rgba(192, 132, 252, 0.5)";

    const accentBorder =
      styles.getPropertyValue("--accent-border").trim() || "#c084fc";

    this.themeColors = [text, text, textH, accent, accentBorder, accentBg];

    // Set connection lines to use your theme's accent border color
    this.lineColor = accentBorder;
  }

  private handleResize = () => {
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seed();
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  private handlePointerLeave = () => {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
    this.mouse.isPressed = false;
  };

  private handlePointerDown = () => {
    this.mouse.isPressed = true;
  };

  private handlePointerUp = () => {
    this.mouse.isPressed = false;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frameId);
    } else {
      this.loop();
    }
  };

  private bindEvents() {
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", this.handlePointerLeave, {
      passive: true,
    });
    window.addEventListener("pointerdown", this.handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", this.handlePointerUp, {
      passive: true,
    });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  public destroy() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerleave", this.handlePointerLeave);
    window.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointerup", this.handlePointerUp);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  private resize() {
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seed();
  }

  private seed() {
    const area = this.width * this.height;
    const target = Options.clamp(
      Math.floor(area * Options.density),
      Options.count.min,
      Options.count.max,
    );

    this.particles = Array.from(
      { length: target },
      () => new Particle(this.width, this.height),
    );

    console.assert(this.particles.length > 0, "Particles should be seeded");
  }

  private update() {
    for (const p of this.particles) {
      p.update(this.mouse, this.width, this.height);
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const p of this.particles) {
      p.draw(this.ctx, this.themeColors);
    }
    this.drawLines();
  }

  private drawLines() {
    const particleCount = this.particles.length;
    if (particleCount < 2) return;

    const paths: Path2D[] = [
      new Path2D(),
      new Path2D(),
      new Path2D(),
      new Path2D(),
    ];

    for (let i = 0; i < particleCount; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < particleCount; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= Options.distance.max) continue;

        const bucketIndex = Math.min(
          3,
          Math.floor((d2 / Options.distance.max) * 4),
        );
        const path = paths[bucketIndex];
        path.moveTo(a.x, a.y);
        path.lineTo(b.x, b.y);
      }
    }

    // Use dynamic theme line color instead of static constant
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.strokeStyle = this.lineColor;
    for (let k = 0; k < 4; k++) {
      this.ctx.globalAlpha = Options.alphas[k];
      this.ctx.stroke(paths[k]);
    }
    this.ctx.globalAlpha = 1.0;
    this.ctx.globalCompositeOperation = "source-over";
  }

  private loop = () => {
    this.update();
    this.draw();
    this.frameId = requestAnimationFrame(this.loop);
  };
}

export default ParticleSystem;
