import type { LocationId } from '@ecs/shared';
import { boxFaces, facePoly, leftFacePt, proj, pts, shade, windowGrid, type Box } from './iso';

function IsoBox({ b, color, topColor, stroke = true }: { b: Box; color: string; topColor?: string; stroke?: boolean }) {
  const f = boxFaces(b);
  const s = stroke ? { stroke: shade(color, -0.35), strokeWidth: 0.8, strokeLinejoin: 'round' as const } : {};
  return (
    <g>
      <polygon points={f.left} fill={color} {...s} />
      <polygon points={f.right} fill={shade(color, -0.22)} {...s} />
      <polygon points={f.top} fill={topColor ?? shade(color, 0.28)} {...s} />
    </g>
  );
}

function Windows({ b, face, cols, rows, color, opts }: { b: Box; face: 'left' | 'right'; cols: number; rows: number; color: string; opts?: Parameters<typeof windowGrid>[4] }) {
  return (
    <g fill={color}>
      {windowGrid(face, b, cols, rows, opts).map((p, i) => (
        <polygon key={i} points={p} />
      ))}
    </g>
  );
}

/** Building footprint height (px) used to place labels. */
export const BUILDING_HEIGHT: Record<LocationId, number> = {
  airport: 112,
  restaurant: 64,
  university: 92,
  hotel: 100,
  office: 124,
  mall: 64,
};

function Airport({ cx, cy }: { cx: number; cy: number }) {
  const terminal: Box = { cx: cx + 0.02, cy: cy - 0.1, hx: 0.34, hy: 0.2, h: 36 };
  const stem: Box = { cx: cx - 0.2, cy: cy - 0.22, hx: 0.04, hy: 0.04, h: 92 };
  const cab: Box = { cx: cx - 0.2, cy: cy - 0.22, hx: 0.09, hy: 0.09, h: 14, z0: 92 };
  const roof: Box = { cx: cx - 0.2, cy: cy - 0.22, hx: 0.1, hy: 0.1, h: 4, z0: 106 };
  const [px, py] = proj(cx + 0.06, cy + 0.28, 0);
  return (
    <g>
      <IsoBox b={stem} color="#e2e8f0" />
      <IsoBox b={cab} color="#0ea5e9" topColor="#7dd3fc" />
      <IsoBox b={roof} color="#334155" />
      <IsoBox b={terminal} color="#38bdf8" topColor="#e0f2fe" />
      <polygon points={facePoly('left', terminal, 0.05, 0.95, 0.35, 0.8)} fill="#0c4a6e" opacity="0.75" />
      <polygon points={facePoly('right', terminal, 0.1, 0.9, 0.35, 0.8)} fill="#0c4a6e" opacity="0.6" />
      {/* parked plane, drawn on the ground plane */}
      <g transform={`translate(${px} ${py - 6}) matrix(1 0.5 -1 0.5 0 0)`}>
        <ellipse cx="0" cy="0" rx="62" ry="9" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
        <polygon points="-6,-6 14,-6 -10,-46 -22,-46" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        <polygon points="-6,6 14,6 -10,46 -22,46" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        <polygon points="-52,-3 -42,-3 -52,-18 -60,-18" fill="#ef4444" />
        <polygon points="-52,3 -42,3 -52,18 -60,18" fill="#ef4444" />
        <circle cx="54" cy="0" r="4" fill="#0ea5e9" />
      </g>
    </g>
  );
}

function Restaurant({ cx, cy }: { cx: number; cy: number }) {
  const b: Box = { cx, cy: cy - 0.04, hx: 0.3, hy: 0.24, h: 50 };
  const roof: Box = { cx, cy: cy - 0.04, hx: 0.32, hy: 0.26, h: 6, z0: 50 };
  const sign: Box = { cx: cx - 0.05, cy: cy - 0.04, hx: 0.16, hy: 0.02, h: 14, z0: 56 };
  const stripes = 7;
  const awn = (i: number) => {
    const u0 = 0.06 + (i * 0.88) / stripes;
    const u1 = 0.06 + ((i + 1) * 0.88) / stripes;
    const a = leftFacePt(b, u0, 0.66);
    const bb = leftFacePt(b, u1, 0.66);
    const c = proj(b.cx - b.hx + u1 * 2 * b.hx, b.cy + b.hy + 0.1, 0.46 * b.h);
    const d = proj(b.cx - b.hx + u0 * 2 * b.hx, b.cy + b.hy + 0.1, 0.46 * b.h);
    return pts([a, bb, c, d]);
  };
  return (
    <g>
      <IsoBox b={b} color="#fde7c8" />
      <IsoBox b={roof} color="#ea580c" />
      <IsoBox b={sign} color="#7c2d12" />
      <Windows b={b} face="right" cols={2} rows={1} color="#7c2d12" opts={{ top: 0.8, bottom: 0.3, gapU: 0.5 }} />
      <polygon points={facePoly('left', b, 0.12, 0.88, 0.08, 0.6)} fill="#fbbf24" opacity="0.55" />
      <polygon points={facePoly('left', b, 0.44, 0.58, 0.0, 0.5)} fill="#7c2d12" />
      {Array.from({ length: stripes }, (_, i) => (
        <polygon key={i} points={awn(i)} fill={i % 2 ? '#ffffff' : '#ef4444'} stroke="#b91c1c" strokeWidth="0.6" />
      ))}
      {/* café table with umbrella */}
      {(() => {
        const [tx, ty] = proj(cx + 0.24, cy + 0.34, 0);
        return (
          <g>
            <line x1={tx} y1={ty} x2={tx} y2={ty - 22} stroke="#78350f" strokeWidth="2" />
            <ellipse cx={tx} cy={ty - 22} rx="16" ry="7" fill="#f97316" />
            <ellipse cx={tx} cy={ty - 6} rx="8" ry="3.5" fill="#fafaf9" stroke="#a8a29e" />
          </g>
        );
      })()}
    </g>
  );
}

function University({ cx, cy }: { cx: number; cy: number }) {
  const base: Box = { cx, cy, hx: 0.36, hy: 0.28, h: 8 };
  const b: Box = { cx, cy, hx: 0.32, hy: 0.24, h: 50, z0: 8 };
  const roof: Box = { cx, cy, hx: 0.34, hy: 0.26, h: 6, z0: 58 };
  const columns = 6;
  const peakL = leftFacePt(roof, 0, 1);
  const peakR = leftFacePt(roof, 1, 1);
  const mid = leftFacePt(roof, 0.5, 1);
  const [fx, fy] = proj(cx + 0.18, cy - 0.12, 64);
  return (
    <g>
      <IsoBox b={base} color="#d6d3d1" />
      <IsoBox b={b} color="#ede9fe" />
      <Windows b={b} face="right" cols={3} rows={2} color="#6d28d9" opts={{ gapU: 0.5, gapV: 0.5 }} />
      {Array.from({ length: columns }, (_, i) => {
        const u = 0.08 + (i * 0.84) / (columns - 1);
        return <polygon key={i} points={facePoly('left', b, u - 0.025, u + 0.025, 0, 0.92)} fill="#ffffff" stroke="#c4b5fd" strokeWidth="0.6" />;
      })}
      <polygon points={facePoly('left', b, 0.4, 0.6, 0, 0.55)} fill="#5b21b6" opacity="0.8" />
      <IsoBox b={roof} color="#a855f7" />
      <polygon points={pts([peakL, peakR, [mid[0], mid[1] - 26]])} fill="#c084fc" stroke="#7e22ce" strokeWidth="0.8" />
      <line x1={fx} y1={fy} x2={fx} y2={fy - 40} stroke="#475569" strokeWidth="2" />
      <rect className="city-flag" x={fx + 1} y={fy - 40} width="22" height="13" fill="#ef4444" />
      <polygon points={`${fx + 9},${fy - 37} ${fx + 10.5},${fy - 34} ${fx + 13.5},${fy - 34} ${fx + 11},${fy - 32} ${fx + 12},${fy - 29} ${fx + 9},${fy - 31} ${fx + 6},${fy - 29} ${fx + 7},${fy - 32} ${fx + 4.5},${fy - 34} ${fx + 7.5},${fy - 34}`} fill="#facc15" />
    </g>
  );
}

function Hotel({ cx, cy }: { cx: number; cy: number }) {
  const b: Box = { cx, cy, hx: 0.24, hy: 0.22, h: 96 };
  const sign = leftFacePt(b, 0.18, 0.86);
  return (
    <g>
      <IsoBox b={b} color="#14b8a6" />
      <Windows b={b} face="left" cols={4} rows={6} color="#ccfbf1" opts={{ top: 0.8 }} />
      <Windows b={b} face="right" cols={3} rows={6} color="#99f6e4" opts={{ top: 0.8 }} />
      <text transform={`translate(${sign[0]} ${sign[1]}) matrix(1 0.5 0 1 0 0)`} fontSize="12" fontWeight="800" fill="#f0fdfa" letterSpacing="2">
        HOTEL
      </text>
    </g>
  );
}

function Office({ cx, cy }: { cx: number; cy: number }) {
  const low: Box = { cx: cx + 0.12, cy: cy + 0.1, hx: 0.22, hy: 0.2, h: 30 };
  const tower: Box = { cx: cx - 0.06, cy: cy - 0.08, hx: 0.2, hy: 0.2, h: 120 };
  return (
    <g>
      <IsoBox b={tower} color="#64748b" topColor="#cbd5e1" />
      <Windows b={tower} face="left" cols={1} rows={9} color="#bae6fd" opts={{ padU: 0.08, gapU: 0.04, gapV: 0.45 }} />
      <Windows b={tower} face="right" cols={1} rows={9} color="#7dd3fc" opts={{ padU: 0.08, gapU: 0.04, gapV: 0.45 }} />
      <IsoBox b={low} color="#94a3b8" />
      <Windows b={low} face="left" cols={4} rows={1} color="#e0f2fe" />
    </g>
  );
}

function Mall({ cx, cy }: { cx: number; cy: number }) {
  const b: Box = { cx, cy, hx: 0.36, hy: 0.28, h: 42 };
  const [dx, dy] = proj(cx, cy, 42);
  const sign = leftFacePt(b, 0.62, 0.9);
  return (
    <g>
      <IsoBox b={b} color="#ec4899" topColor="#fbcfe8" />
      <polygon points={facePoly('left', b, 0.08, 0.52, 0.06, 0.7)} fill="#fdf2f8" opacity="0.8" />
      <Windows b={b} face="right" cols={3} rows={1} color="#fdf2f8" opts={{ top: 0.7 }} />
      <ellipse cx={dx} cy={dy} rx="40" ry="20" fill="#f9a8d4" stroke="#be185d" strokeWidth="0.8" />
      <path d={`M${dx - 40} ${dy} a40 30 0 0 1 80 0`} fill="#fce7f3" stroke="#be185d" strokeWidth="0.8" />
      <text transform={`translate(${sign[0]} ${sign[1]}) matrix(1 0.5 0 1 0 0)`} fontSize="11" fontWeight="800" fill="#ffffff" letterSpacing="2">
        MALL
      </text>
    </g>
  );
}

export function BuildingShape({ id, cx, cy }: { id: LocationId; cx: number; cy: number }) {
  switch (id) {
    case 'airport':
      return <Airport cx={cx} cy={cy} />;
    case 'restaurant':
      return <Restaurant cx={cx} cy={cy} />;
    case 'university':
      return <University cx={cx} cy={cy} />;
    case 'hotel':
      return <Hotel cx={cx} cy={cy} />;
    case 'office':
      return <Office cx={cx} cy={cy} />;
    case 'mall':
      return <Mall cx={cx} cy={cy} />;
  }
}

export function Tree({ wx, wy, scale = 1 }: { wx: number; wy: number; scale?: number }) {
  const [x, y] = proj(wx, wy);
  return (
    <g>
      <ellipse cx={x} cy={y} rx={10 * scale} ry={5 * scale} fill="#000" opacity="0.12" />
      <rect x={x - 2} y={y - 14 * scale} width="4" height={14 * scale} fill="#92400e" />
      <circle cx={x} cy={y - 22 * scale} r={12 * scale} fill="#22c55e" />
      <circle cx={x - 4 * scale} cy={y - 26 * scale} r={6 * scale} fill="#4ade80" />
    </g>
  );
}

export function SmallHouse({ wx, wy, color }: { wx: number; wy: number; color: string }) {
  const b: Box = { cx: wx, cy: wy, hx: 0.1, hy: 0.08, h: 18 };
  const roof: Box = { cx: wx, cy: wy, hx: 0.11, hy: 0.09, h: 5, z0: 18 };
  return (
    <g>
      <IsoBox b={b} color={color} />
      <IsoBox b={roof} color={shade(color, -0.45)} />
      <polygon points={facePoly('left', b, 0.4, 0.6, 0, 0.6)} fill={shade(color, -0.5)} />
    </g>
  );
}
