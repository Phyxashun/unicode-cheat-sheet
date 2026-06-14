// ~ FILE-PATH: src/utils/Particle.ts

import Options, { type MousePosition } from "./Options";

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  r: number;
  colorIndex: number;

  constructor(width: number, height: number) {
    this.x = Options.random(0, width);
    this.y = Options.random(0, height);

    // Set a constant baseline speed so they never stop moving
    this.baseVx = Options.random(-Options.vi, Options.vi);
    this.baseVy = Options.random(-Options.vi, Options.vi);

    this.vx = this.baseVx;
    this.vy = this.baseVy;

    this.r = Options.random(Options.radius.min, Options.radius.max);
    this.colorIndex = Options.randomColorIndex();
  }

  // Update the particle's location, repel, and wrap
  update(mouse: MousePosition, width: number, height: number) {
    this.handleMouseInteraction(mouse);

    // Ease back to their constant base speed instead of stopping
    this.vx += (this.baseVx - this.vx) * Options.friction;
    this.vy += (this.baseVy - this.vy) * Options.friction;

    this.x += this.vx;
    this.y += this.vy;

    this.wrapEdges(width, height);
  }

  // Draw the particle
  draw(ctx: CanvasRenderingContext2D, activeColors: string[]) {
    ctx.fillStyle = activeColors[this.colorIndex] || "rgba(156, 163, 175, 0.5)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }

  private handleMouseInteraction(mouse: MousePosition) {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const d2 = dx * dx + dy * dy;

    const d = Math.sqrt(d2) || 1;
    const ux = dx / d;
    const uy = dy / d;

    if (mouse.isPressed) {
      // Attract
      if (d2 < Options.attract.radius * Options.attract.radius) {
        this.vx -= ux * Options.attract.strength;
        this.vy -= uy * Options.attract.strength;
      }
    } else {
      // Repel
      if (d2 < Options.repel.radius * Options.repel.radius) {
        this.vx += ux * Options.repel.strength;
        this.vy += uy * Options.repel.strength;
      }
    }
  }

  // Ensures particles wrap around when that reach canvas boundaries
  private wrapEdges(width: number, height: number) {
    if (this.x < -10) this.x = width + 10;
    if (this.x > width + 10) this.x = -10;
    if (this.y < -10) this.y = height + 10;
    if (this.y > height + 10) this.y = -10;
  }
}

export default Particle;
