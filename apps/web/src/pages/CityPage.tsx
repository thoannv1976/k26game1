import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LOCATIONS, type LocationId } from '@ecs/shared';
import { api, qs } from '../api/client';
import type { LocationWithCount, MissionListItem } from '../api/types';
import { CityMap } from '../city-map/CityMap';
import { useLocalized } from '../i18n';
import { Badge, Card, EmptyState, ErrorBox, LevelBadge, PageHeader, Skeleton, cx } from '../components/ui';

function MissionList({ locationId }: { locationId: LocationId }) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const q = useQuery({
    queryKey: ['missions', locationId],
    queryFn: () => api.get<{ missions: MissionListItem[] }>(`/api/missions${qs({ locationId })}`),
  });
  if (q.isPending)
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.missions.length === 0) return <EmptyState icon="📝" title={t('city.noMissions')}>{t('city.noMissionsBody')}</EmptyState>;
  return (
    <ul className="space-y-3">
      {q.data.missions.map((m) => (
        <li key={m.id}>
          <Link
            to={`/missions/${m.id}`}
            data-testid={`mission-card-${m.id}`}
            className="block rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted">{m.id}</div>
                <div className="font-semibold">{L(m.title)}</div>
              </div>
              {m.completed ? <Badge tone="success">✓ {t('city.completed')}</Badge> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{L(m.summary)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <LevelBadge level={m.level} />
              <span>⏱ {t('common.minutes', { count: m.estimatedMinutes })}</span>
              <span>⭐ {m.xpReward} XP</span>
              {m.bestPercent !== null && <span className="font-semibold text-fg">{t('city.best', { percent: m.bestPercent })}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CityPage() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [params, setParams] = useSearchParams();
  const selected = (params.get('location') as LocationId | null) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  const mapScroll = useRef<HTMLDivElement>(null);
  // Center the (pannable) map on small screens.
  useEffect(() => {
    const el = mapScroll.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  const [announce, setAnnounce] = useState('');

  const locQ = useQuery({ queryKey: ['locations'], queryFn: () => api.get<{ locations: LocationWithCount[] }>('/api/locations') });
  const locations: LocationWithCount[] = locQ.data?.locations ?? LOCATIONS.map((l) => ({ ...l, missionCount: 0 }));
  const current = locations.find((l) => l.id === selected) ?? null;

  const select = (id: LocationId) => {
    setParams(id === selected ? {} : { location: id }, { replace: true });
  };

  const currentName = current ? L(current.name) : '';
  useEffect(() => {
    if (!selected) return;
    setAnnounce(currentName);
    // Bring the panel into view on small screens.
    if (window.matchMedia('(max-width: 1023px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div>
      <PageHeader title={t('city.title')} subtitle={t('city.subtitle')} />
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[var(--ecs-sky)] to-surface shadow-sm">
          <div ref={mapScroll} className="overflow-x-auto overscroll-x-contain">
            <CityMap locations={locations} selected={selected} onSelect={select} />
          </div>
          {locQ.isError && (
            <div className="p-3">
              <ErrorBox error={locQ.error} onRetry={() => void locQ.refetch()} />
            </div>
          )}
          {/* Accessible list / quick picker (also handy on small phones) */}
          <ul className="grid grid-cols-2 gap-2 border-t border-line bg-surface p-3 sm:grid-cols-3">
            {locations.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => select(l.id)}
                  aria-pressed={selected === l.id}
                  className={cx(
                    'flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium',
                    selected === l.id ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:border-primary',
                    !l.available && 'opacity-60',
                  )}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.available ? l.color : '#94a3b8' }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{L(l.name)}</span>
                  {!l.available && <span className="text-[11px] text-warn">{t('city.soon')}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div ref={panelRef} className="scroll-mt-20">
          {current ? (
            <Card className="lg:sticky lg:top-20">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{L(current.name)}</h2>
                  <p className="text-sm text-muted">{L(current.description)}</p>
                </div>
                <button type="button" onClick={() => setParams({}, { replace: true })} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label={t('common.close')}>
                  ×
                </button>
              </div>
              {current.available ? (
                <MissionList locationId={current.id} />
              ) : (
                <EmptyState icon="🚧" title={t('city.comingSoon')}>
                  {t('city.comingSoonBody')}
                </EmptyState>
              )}
            </Card>
          ) : (
            <Card className="lg:sticky lg:top-20">
              <EmptyState icon="👆" title={t('city.pickTitle')}>
                {t('city.pickBody')}
              </EmptyState>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
