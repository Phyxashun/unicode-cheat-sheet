// ~ FILE-PATH: src/utils/Options.ts

export interface MousePosition {
  x: number;
  y: number;
  isPressed: boolean;
}

export interface MinMax {
  min: number;
  max: number;
}

export interface MouseForce {
  radius: number;
  strength: number;
}

const LINE_DIST = 100;

class StaticOptions {
  /*   colors: Array<string> = [
    "rgba(136, 136, 170, 0.4)",
    "rgba(156, 163, 175, 0.5)",
    "rgba(243, 244, 246, 0.7)",
    "rgba(192, 132, 252, 0.8)",
    "rgba(192, 132, 252, 0.5)",
    "rgba(192, 132, 252, 0.15)",
  ]; */
  colors: Array<string> = [
    "#c084fc", // Purple
    "#fef08a", // Yellow
    "#60a5fa", // Blue
    "#9ca3af", // Neutral Gray
  ];
  alphas: Array<number> = [0.6, 0.4, 0.2, 0.05];

  count: MinMax = { min: 40, max: 160 };
  radius: MinMax = { min: 1.2, max: 3.2 };
  distance: MinMax = { min: LINE_DIST, max: LINE_DIST * LINE_DIST };
  repel: MouseForce = { radius: 80, strength: 0.5 };
  attract: MouseForce = { radius: 300, strength: 0.8 };

  vi: number = 0.4;
  density: number = 1 / 12000;
  friction: number = 0.02;

  constructor() {}

  // UTILITY FUNCTIONS

  private validateAndNormalize(
    min: number,
    max?: number,
  ): { low: number; high: number } {
    let low = min;
    let high = max === undefined ? min : max;

    if (max === undefined) {
      low = 0;
    }

    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      throw new Error("Both min and max must be finite numbers.");
    }

    if (low > high) {
      const temp = low;
      low = high;
      high = temp;
    }

    return { low, high };
  }

  public random(min: number, max?: number): number {
    const { low, high } = this.validateAndNormalize(min, max);
    if (low === high) return low;
    return Math.random() * (high - low) + low;
  }

  public randomInt(min: number, max?: number): number {
    const { low, high } = this.validateAndNormalize(min, max);
    const lowCeil = Math.ceil(low);
    const highFloor = Math.floor(high);
    if (lowCeil > highFloor) return lowCeil;
    return Math.floor(Math.random() * (highFloor - lowCeil + 1)) + lowCeil;
  }

  public clamp(n: number, min: number, max: number): number {
    if (!Number.isFinite(n) || !Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error("All arguments must be finite numbers.");
    }
    let low = min;
    let high = max;
    if (low > high) {
      low = max;
      high = min;
    }
    return n < low ? low : n > high ? high : n;
  }

  public randomColor(): string {
    const len = this.colors.length;
    if (len === 0) throw new Error("colors array is empty or invalid.");
    const index = Math.floor(Math.random() * len);
    return this.colors[index];
  }

  public randomColorIndex(): number {
    const len = this.colors.length;
    if (len === 0) throw new Error("colors array is empty or invalid.");
    return Math.floor(Math.random() * len);
  }
}

const Options = new StaticOptions();

export default Options;
