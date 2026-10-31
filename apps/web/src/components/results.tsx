import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CRITERIA, type Criterion, type CriterionResult } from '@ecs/shared';
import type { ResultTurn } from '../api/types';
import { Badge, cx } from './ui';

export function CriterionSource({ source }: { source: CriterionResult['source'] }) {
  const { t } = useTranslation();
  const tone = source === 'teacher' ? 'success' : source === 'engine' ? 'primary' : 'neutral';
  return <Badge tone={tone}>{t(`criteria.source.${source}`)}</Badge>;
}

/** Rubric table: 5 criteria with score/max or "not assessed" + reason. */
export function RubricTable({ criteria, testIds = false }: { criteria: Record<Criterion, CriterionResult>; testIds?: boolean }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-line">
      {CRITERIA.map((k) => {
        const c = criteria[k];
        if (!c) return null;
        const assessed = c.status === 'assessed' && c.score !== null;
        const pct = assessed && c.max ? (c.score! / c.max) * 100 : 0;
        return (
          <li key={k} data-testid={testIds ? `results-criterion-${k}` : undefined} data-status={c.status} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                {t(`criteria.${k}`)}
                <CriterionSource source={c.source} />
              </div>
              <div className="text-right">
                {assessed ? (
                  <span className="text-lg font-bold tabular-nums">
                    {c.score}
                    <span className="text-sm font-medium text-muted">/{c.max}</span>
                  </span>
                ) : (
                  <Badge tone="warn">{t('results.notAssessed')}</Badge>
                )}
              </div>
            </div>
            {assessed && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className={cx('h-full rounded-full', pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warn')} style={{ width: `${pct}%` }} />
              </div>
            )}
            {c.comment && (
              <p className="mt-1.5 text-sm text-muted" lang="en">
                {c.comment}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function BulletList({ title, items, icon }: { title: ReactNode; items: string[] | undefined; icon: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 font-semibold">
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <ul className="space-y-1.5 text-sm" lang="en">
        {items.map((x, i) => (
          <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Transcript({ turns, npcName, renderAudio }: { turns: ResultTurn[]; npcName: string; renderAudio?: (t: ResultTurn) => ReactNode }) {
  const { t } = useTranslation();
  return (
    <ol className="space-y-2">
      {turns.map((tn) => {
        if (tn.speaker === 'system') {
          return (
            <li key={tn.id} className="text-center text-xs text-warn" lang="en">
              💡 {tn.text}
            </li>
          );
        }
        const npc = tn.speaker === 'npc';
        return (
          <li key={tn.id} className={cx('rounded-xl px-3 py-2', npc ? 'bg-surface-2' : 'bg-primary-soft')}>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
              <span>{npc ? npcName : t('results.you')}</span>
              {!npc && <Badge tone={tn.mode === 'voice' ? 'primary' : 'neutral'}>{tn.mode === 'voice' ? `🎙️ ${t('play.voiceTurn')}` : `⌨️ ${t('play.textTurn')}`}</Badge>}
              {npc && tn.fallback && <Badge tone="warn">{t('results.fallback')}</Badge>}
              {tn.objectivesCredited.length > 0 && <Badge tone="success">✓ {tn.objectivesCredited.length}</Badge>}
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap" lang="en">
              {tn.text}
            </p>
            {renderAudio?.(tn)}
          </li>
        );
      })}
    </ol>
  );
}
