/**
 * Friendly flat NPC illustrations drawn in SVG, keyed by mission `npc.avatar`
 * (airport-agent, baggage-agent, waiter, restaurant-manager, academic-officer, intl-student).
 */
import { useId } from 'react';

interface AvatarStyle {
  bg: string;
  skin: string;
  hair: string;
  outfit: string;
  hairStyle: 'bun' | 'short' | 'slick' | 'bob' | 'long' | 'curly';
  extra?: 'airline-hat' | 'cap' | 'bowtie' | 'tie' | 'glasses' | 'headphones';
  accent: string;
}

const STYLES: Record<string, AvatarStyle> = {
  'airport-agent': { bg: '#bae6fd', skin: '#f2c9a0', hair: '#5b3a1e', outfit: '#1e3a8a', hairStyle: 'bun', extra: 'airline-hat', accent: '#ef4444' },
  'baggage-agent': { bg: '#fde68a', skin: '#b97a4c', hair: '#1f1a17', outfit: '#f97316', hairStyle: 'short', extra: 'cap', accent: '#facc15' },
  waiter: { bg: '#fed7aa', skin: '#e8b88e', hair: '#111827', outfit: '#1f2937', hairStyle: 'slick', extra: 'bowtie', accent: '#ffffff' },
  'restaurant-manager': { bg: '#fecaca', skin: '#f5d0b0', hair: '#9ca3af', outfit: '#334155', hairStyle: 'bob', extra: 'tie', accent: '#b91c1c' },
  'academic-officer': { bg: '#e9d5ff', skin: '#d9a77c', hair: '#7c2d12', outfit: '#7c3aed', hairStyle: 'long', extra: 'glasses', accent: '#f5f3ff' },
  'intl-student': { bg: '#bbf7d0', skin: '#8d5a3b', hair: '#18181b', outfit: '#0d9488', hairStyle: 'curly', extra: 'headphones', accent: '#f43f5e' },
};

const FALLBACK: AvatarStyle = { bg: '#e2e8f0', skin: '#e0b48c', hair: '#3f3f46', outfit: '#4f46e5', hairStyle: 'short', accent: '#a5b4fc' };

function Hair({ s }: { s: AvatarStyle }) {
  switch (s.hairStyle) {
    case 'bun':
      return (
        <g fill={s.hair}>
          <circle cx="60" cy="24" r="9" />
          <path d="M37 52c0-17 10-27 23-27s23 10 23 27c-4-9-12-14-23-14s-19 5-23 14z" />
        </g>
      );
    case 'short':
      return <path fill={s.hair} d="M38 50c0-15 9-24 22-24s22 9 22 24c-3-7-10-11-22-11s-19 4-22 11z" />;
    case 'slick':
      return <path fill={s.hair} d="M38 48c1-14 10-22 23-22 12 0 20 7 21 20-6-6-15-9-26-8-8 1-14 4-18 10z" />;
    case 'bob':
      return <path fill={s.hair} d="M36 66c-3-24 6-40 24-40s27 16 24 40h-6c1-14-3-24-18-26-10 2-16 8-18 26z" />;
    case 'long':
      return <path fill={s.hair} d="M34 86c-6-36 2-60 26-60s32 24 26 60h-8c3-24 1-38-18-42-14 3-21 14-18 42z" />;
    case 'curly':
      return (
        <g fill={s.hair}>
          {[
            [42, 40],
            [48, 31],
            [57, 27],
            [66, 28],
            [74, 33],
            [79, 42],
            [39, 49],
            [81, 50],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />
          ))}
        </g>
      );
  }
}

function Extra({ s }: { s: AvatarStyle }) {
  switch (s.extra) {
    case 'airline-hat':
      return (
        <g>
          <path d="M44 32c4-6 28-6 32 0l-2 6H46z" fill={s.outfit} />
          <rect x="56" y="31" width="8" height="3" rx="1.5" fill="#fbbf24" />
          <path d="M52 86l8 9 8-9-8 4z" fill={s.accent} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M38 40c0-12 10-18 22-18s22 6 22 18z" fill="#15803d" />
          <path d="M60 40h30c0 3-3 5-8 5H60z" fill="#166534" />
          <rect x="44" y="96" width="32" height="5" fill={s.accent} />
          <rect x="44" y="106" width="32" height="5" fill={s.accent} />
        </g>
      );
    case 'bowtie':
      return (
        <g>
          <path d="M48 84h24l-2 36H50z" fill="#ffffff" />
          <path d="M52 86l8 4 8-4v8l-8-4-8 4z" fill="#dc2626" />
        </g>
      );
    case 'tie':
      return (
        <g>
          <path d="M50 83h20l-4 37H54z" fill="#ffffff" />
          <path d="M58 86h4l2 6-4 18-4-18z" fill={s.accent} />
        </g>
      );
    case 'glasses':
      return (
        <g fill="none" stroke="#1f2937" strokeWidth="2.2">
          <circle cx="51" cy="53" r="6.5" />
          <circle cx="69" cy="53" r="6.5" />
          <path d="M57.5 53h5" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M40 92c-2-8 4-12 20-12s22 4 20 12" fill="none" stroke="#111827" strokeWidth="4" />
          <rect x="34" y="88" width="10" height="12" rx="4" fill={s.accent} />
          <rect x="76" y="88" width="10" height="12" rx="4" fill={s.accent} />
        </g>
      );
    default:
      return null;
  }
}

export function Avatar({ avatar, size = 72, speaking = false, label }: { avatar: string; size?: number; speaking?: boolean; label?: string }) {
  const s = STYLES[avatar] ?? FALLBACK;
  const clip = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label ?? avatar} className="shrink-0">
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>
      {speaking && <circle className="speaking-ring" cx="60" cy="60" r="59" fill="none" stroke="var(--ecs-primary)" strokeWidth="3" />}
      <circle cx="60" cy="60" r="56" fill={s.bg} />
      <g clipPath={`url(#${clip})`}>
        {/* body */}
        <path d="M18 124c0-26 18-40 42-40s42 14 42 40z" fill={s.outfit} />
        <rect x="53" y="70" width="14" height="16" rx="6" fill={s.skin} />
        {s.hairStyle === 'long' || s.hairStyle === 'bob' ? <Hair s={s} /> : null}
        {/* head */}
        <circle cx="38" cy="55" r="5" fill={s.skin} />
        <circle cx="82" cy="55" r="5" fill={s.skin} />
        <ellipse cx="60" cy="54" rx="22" ry="24" fill={s.skin} />
        {s.hairStyle !== 'long' && s.hairStyle !== 'bob' ? <Hair s={s} /> : null}
        {s.hairStyle === 'long' || s.hairStyle === 'bob' ? <path d="M38 50c2-14 10-22 22-22s20 8 22 22c-6-8-14-12-22-12s-16 4-22 12z" fill={s.hair} /> : null}
        {/* face */}
        <circle cx="51" cy="54" r="2.6" fill="#1f2937" />
        <circle cx="69" cy="54" r="2.6" fill="#1f2937" />
        <circle cx="46" cy="63" r="3.5" fill="#f87171" opacity="0.25" />
        <circle cx="74" cy="63" r="3.5" fill="#f87171" opacity="0.25" />
        {speaking ? <ellipse cx="60" cy="66" rx="5" ry="3.6" fill="#7f1d1d" /> : <path d="M53 64c4 4 10 4 14 0" fill="none" stroke="#7f1d1d" strokeWidth="2.4" strokeLinecap="round" />}
        <Extra s={s} />
      </g>
    </svg>
  );
}
