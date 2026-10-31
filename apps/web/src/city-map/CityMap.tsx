import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocationId, LocationInfo } from '@ecs/shared';
import { useLocalized } from '../i18n';
import { BUILDING_HEIGHT, BuildingShape, SmallHouse, Tree } from './Buildings';
import { gridToWorld, proj, pts, type Pt } from './iso';

const ROAD_HALF = 0.07;

function Ground() {
  const c: Pt[] = [proj(-0.5, -1.5), proj(2.5, -1.5), proj(2.5, 1.5), proj(-0.5, 1.5)];
  const depth = 22;
  const down = (p: Pt): Pt => [p[0], p[1] + depth];
  return (
    <g>
      <polygon points={pts([c[3]!, c[2]!, down(c[2]!), down(c[3]!)])} fill="#a3a38a" />
      <polygon points={pts([c[2]!, c[1]!, down(c[1]!), down(c[2]!)])} fill="#8b8b73" />
      <polygon points={pts(c)} fill="var(--ecs-ground)" stroke="#86b47c" strokeWidth="1.5" />
      {/* blocks */}
      {[0, 1, 2].flatMap((wx) =>
        [-1, 0, 1].map((wy) => (
          <polygon
            key={`${wx}:${wy}`}
            points={pts([proj(wx - 0.43, wy - 0.43), proj(wx + 0.43, wy - 0.43), proj(wx + 0.43, wy + 0.43), proj(wx - 0.43, wy + 0.43)])}
            fill="var(--ecs-ground-2)"
          />
        )),
      )}
    </g>
  );
}

function Roads() {
  const roads: { a: Pt[]; line: [Pt, Pt] }[] = [];
  for (const x of [0.5, 1.5]) {
    roads.push({
      a: [proj(x - ROAD_HALF, -1.5), proj(x + ROAD_HALF, -1.5), proj(x + ROAD_HALF, 1.5), proj(x - ROAD_HALF, 1.5)],
      line: [proj(x, -1.5), proj(x, 1.5)],
    });
  }
  for (const y of [-0.5, 0.5]) {
    roads.push({
      a: [proj(-0.5, y - ROAD_HALF), proj(2.5, y - ROAD_HALF), proj(2.5, y + ROAD_HALF), proj(-0.5, y + ROAD_HALF)],
      line: [proj(-0.5, y), proj(2.5, y)],
    });
  }
  return (
    <g>
      {roads.map((r, i) => (
        <polygon key={i} points={pts(r.a)} fill="var(--ecs-road)" />
      ))}
      {roads.map((r, i) => (
        <line key={`l${i}`} x1={r.line[0][0]} y1={r.line[0][1]} x2={r.line[1][0]} y2={r.line[1][1]} stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="10 12" opacity="0.8" />
      ))}
    </g>
  );
}

function Car({ start, dir, color }: { start: Pt; dir: 'a' | 'b'; color: string }) {
  // Simple flat car sprite following the road direction.
  const angle = dir === 'a' ? 26.57 : -26.57;
  return (
    <g className={dir === 'a' ? 'city-car-a' : 'city-car-b'}>
      <g transform={`translate(${start[0]} ${start[1] - 4}) rotate(${angle})`}>
        <rect x="-11" y="-5" width="22" height="10" rx="3" fill={color} />
        <rect x="-4" y="-4" width="9" height="8" rx="2" fill="#e0f2fe" />
      </g>
    </g>
  );
}

function Clouds() {
  return (
    <g fill="#ffffff" opacity="0.85" aria-hidden="true">
      <g className="city-cloud">
        <g transform="translate(-420 -190)">
          <ellipse cx="0" cy="0" rx="34" ry="14" />
          <ellipse cx="22" cy="-8" rx="22" ry="14" />
          <ellipse cx="-18" cy="-4" rx="18" ry="10" />
        </g>
      </g>
      <g className="city-cloud slow">
        <g transform="translate(-380 -120) scale(0.7)">
          <ellipse cx="0" cy="0" rx="34" ry="14" />
          <ellipse cx="22" cy="-8" rx="22" ry="14" />
        </g>
      </g>
    </g>
  );
}

export interface CityMapProps {
  locations: (LocationInfo & { missionCount?: number })[];
  selected: LocationId | null;
  onSelect: (id: LocationId) => void;
}

export function CityMap({ locations, selected, onSelect }: CityMapProps) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [hover, setHover] = useState<LocationId | null>(null);

  const placed = useMemo(
    () =>
      locations
        .map((l) => ({ ...l, ...gridToWorld(l.grid) }))
        .sort((a, b) => a.wx + a.wy - (b.wx + b.wy) || a.wx - b.wx),
    [locations],
  );

  const decor = (
    <g aria-hidden="true">
      {/* park on the back block */}
      <ellipse cx={proj(0, -1)[0]} cy={proj(0, -1)[1]} rx="46" ry="20" fill="#7dd3fc" stroke="#38bdf8" />
      <Tree wx={-0.25} wy={-1.25} />
      <Tree wx={0.25} wy={-1.28} scale={0.8} />
      <Tree wx={-0.28} wy={-0.72} scale={0.9} />
      <Tree wx={0.28} wy={-0.7} />
      {/* houses on the right block */}
      <SmallHouse wx={1.8} wy={-1.2} color="#fca5a5" />
      <SmallHouse wx={2.2} wy={-1.2} color="#fde68a" />
      <Tree wx={1.85} wy={-0.75} scale={0.8} />
      <SmallHouse wx={2.2} wy={-0.8} color="#bfdbfe" />
      {/* trees on the left block */}
      <Tree wx={-0.25} wy={0.75} />
      <Tree wx={0.2} wy={0.8} scale={0.85} />
      <Tree wx={-0.2} wy={1.25} scale={0.9} />
      <Tree wx={0.25} wy={1.25} />
    </g>
  );

  const keyHandler = (id: LocationId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg data-testid="city-map" viewBox="-400 -215 1180 630" className="block h-auto w-full min-w-[620px] select-none sm:min-w-0" role="group" aria-label={t('city.mapLabel')}>
      <defs>
        <linearGradient id="ecs-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--ecs-sky)" />
          <stop offset="1" stopColor="var(--ecs-sky)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="-400" y="-215" width="1180" height="300" fill="url(#ecs-sky)" />
      <Clouds />
      <Ground />
      <Roads />
      <g aria-hidden="true">
        <Car start={proj(-0.5, 0.5 - 0.035)} dir="a" color="#ef4444" />
        <Car start={proj(1.5 + 0.035, 1.5)} dir="b" color="#facc15" />
      </g>
      {decor}
      {placed.map((l) => (
        <g
          key={l.id}
          data-testid={`building-${l.id}`}
          data-available={l.available}
          data-selected={selected === l.id}
          className="city-building"
          role="button"
          tabIndex={0}
          aria-label={`${L(l.name)}${l.available ? '' : ` – ${t('city.comingSoon')}`}`}
          aria-pressed={selected === l.id}
          onClick={() => onSelect(l.id)}
          onKeyDown={keyHandler(l.id)}
          onMouseEnter={() => setHover(l.id)}
          onMouseLeave={() => setHover((h) => (h === l.id ? null : h))}
          onFocus={() => setHover(l.id)}
          onBlur={() => setHover((h) => (h === l.id ? null : h))}
        >
          {/* generous invisible hit area */}
          <polygon
            className="city-focus"
            points={pts([proj(l.wx - 0.45, l.wy - 0.45), proj(l.wx + 0.45, l.wy - 0.45), proj(l.wx + 0.45, l.wy + 0.45), proj(l.wx - 0.45, l.wy + 0.45)])}
            fill="transparent"
            stroke="transparent"
          />
          <g className="city-body">
            <BuildingShape id={l.id} cx={l.wx} cy={l.wy} />
          </g>
        </g>
      ))}
      {/* labels on top so taller buildings never hide them */}
      <g pointerEvents="none">
        {placed.map((l) => {
          const [x, y] = proj(l.wx, l.wy, BUILDING_HEIGHT[l.id] + 22);
          const name = L(l.name);
          const sub = l.available ? (l.missionCount !== undefined ? t('city.missionCount', { count: l.missionCount }) : '') : t('city.comingSoon');
          const w = Math.max(name.length * 8.6, sub.length * 7.2) + 32;
          const active = hover === l.id || selected === l.id;
          return (
            <g key={l.id} transform={`translate(${x} ${y - (active && l.available ? 8 : 0)})`} style={{ transition: 'transform 180ms ease' }}>
              <rect x={-w / 2} y={sub ? -26 : -16} width={w} height={sub ? 48 : 32} rx="13" fill={l.available ? 'var(--ecs-surface)' : 'var(--ecs-surface-2)'} stroke={active ? 'var(--ecs-primary)' : 'var(--ecs-line)'} strokeWidth={active ? 2.5 : 1.2} />
              <circle cx={-w / 2 + 15} cy={sub ? -10 : 0} r="5.5" fill={l.available ? l.color : '#94a3b8'} />
              <text x={-w / 2 + 26} y={sub ? -5 : 5} fontSize="15.5" fontWeight="700" fill="var(--ecs-fg)">
                {name}
              </text>
              {sub && (
                <text x={-w / 2 + 26} y="14" fontSize="12.5" fontWeight="600" fill={l.available ? 'var(--ecs-muted)' : 'var(--ecs-warn)'}>
                  {sub}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
