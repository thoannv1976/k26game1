/**
 * Isometric projection helpers for the SVG city map.
 * World units: one city block = 1. Screen: 2:1 diamond tiles.
 */
export const HALF_W = 190;
export const HALF_H = 95;

export type Pt = [number, number];

export function proj(wx: number, wy: number, z = 0): Pt {
  return [(wx - wy) * HALF_W, (wx + wy) * HALF_H - z];
}

export function pts(points: Pt[]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/** Location grid (staggered map coordinates) → world block coordinates. */
export function gridToWorld(grid: { x: number; y: number }): { wx: number; wy: number } {
  return { wx: (grid.x + grid.y) / 2, wy: (grid.y - grid.x) / 2 };
}

/** Mixes a hex color with white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = amt > 0 ? 255 : 0;
  const a = Math.abs(amt);
  const mix = (c: number) => Math.round(c + (t - c) * a);
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

export interface Box {
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  h: number;
  z0?: number;
}

/** Polygons of the three visible faces of an iso box. */
export function boxFaces({ cx, cy, hx, hy, h, z0 = 0 }: Box) {
  const z1 = z0 + h;
  return {
    top: pts([proj(cx - hx, cy - hy, z1), proj(cx + hx, cy - hy, z1), proj(cx + hx, cy + hy, z1), proj(cx - hx, cy + hy, z1)]),
    left: pts([proj(cx - hx, cy + hy, z0), proj(cx + hx, cy + hy, z0), proj(cx + hx, cy + hy, z1), proj(cx - hx, cy + hy, z1)]),
    right: pts([proj(cx + hx, cy + hy, z0), proj(cx + hx, cy - hy, z0), proj(cx + hx, cy - hy, z1), proj(cx + hx, cy + hy, z1)]),
  };
}

/** Point on the front-left face (u: 0..1 along x, v: 0..1 up). */
export function leftFacePt(b: Box, u: number, v: number): Pt {
  return proj(b.cx - b.hx + u * 2 * b.hx, b.cy + b.hy, (b.z0 ?? 0) + v * b.h);
}

/** Point on the front-right face (u: 0..1 along -y, v: 0..1 up). */
export function rightFacePt(b: Box, u: number, v: number): Pt {
  return proj(b.cx + b.hx, b.cy + b.hy - u * 2 * b.hy, (b.z0 ?? 0) + v * b.h);
}

export function facePoly(face: 'left' | 'right', b: Box, u0: number, u1: number, v0: number, v1: number): string {
  const f = face === 'left' ? leftFacePt : rightFacePt;
  return pts([f(b, u0, v0), f(b, u1, v0), f(b, u1, v1), f(b, u0, v1)]);
}

/** A grid of window parallelograms on a face. */
export function windowGrid(face: 'left' | 'right', b: Box, cols: number, rows: number, opts: { padU?: number; padV?: number; gapU?: number; gapV?: number; top?: number; bottom?: number } = {}): string[] {
  const { padU = 0.1, gapU = 0.35, gapV = 0.4, top = 0.92, bottom = 0.12 } = opts;
  const out: string[] = [];
  const cw = (1 - padU * 2) / cols;
  const rh = (top - bottom) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const u0 = padU + c * cw + (cw * gapU) / 2;
      const u1 = padU + (c + 1) * cw - (cw * gapU) / 2;
      const v0 = bottom + r * rh + (rh * gapV) / 2;
      const v1 = bottom + (r + 1) * rh - (rh * gapV) / 2;
      out.push(facePoly(face, b, u0, u1, v0, v1));
    }
  }
  return out;
}
