import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLocation } from '@ecs/shared';
import { api } from '../api/client';
import type { MissionDetailResponse, PublicMission, SessionResponse } from '../api/types';
import { useLocalized } from '../i18n';
import { errorMessage } from '../i18n/errors';
import { Avatar } from '../components/Avatar';
import { Badge, Button, ButtonLink, Card, ConfirmModal, ErrorBox, LevelBadge, PageSkeleton, SectionTitle } from '../components/ui';
import { useToast } from '../components/Toast';

export function StudentCard({ mission, compact = false }: { mission: Pick<PublicMission, 'studentCard' | 'title' | 'id'>; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary-soft to-surface" aria-label={t('mission.studentCard')} role="group">
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-primary/40 px-4 py-2.5">
        <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">🎫 {t('mission.studentCard')}</span>
        <span className="font-mono text-xs text-muted">{mission.id}</span>
      </div>
      {/* ticket perforations */}
      <span className="absolute top-9 -left-2.5 h-5 w-5 rounded-full border-2 border-dashed border-primary/40 bg-canvas" aria-hidden="true" />
      <span className="absolute top-9 -right-2.5 h-5 w-5 rounded-full border-2 border-dashed border-primary/40 bg-canvas" aria-hidden="true" />
      <dl className={compact ? 'grid gap-x-4 gap-y-1.5 px-4 py-3 text-sm' : 'grid gap-x-6 gap-y-2.5 px-4 py-4 sm:grid-cols-2'} lang="en">
        {mission.studentCard.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{f.label}</dt>
            <dd className="font-mono text-sm font-semibold break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MissionPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const assignmentId = params.get('assignment') ?? undefined;
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmRestart, setConfirmRestart] = useState(false);

  const q = useQuery({ queryKey: ['mission', id], queryFn: () => api.get<MissionDetailResponse>(`/api/missions/${id}`) });

  const start = useMutation({
    mutationFn: (restart: boolean) =>
      api.post<SessionResponse>('/api/sessions', { missionId: id, ...(assignmentId ? { assignmentId } : {}), ...(restart ? { restart: true } : {}) }),
    onSuccess: (r) => {
      qc.setQueryData(['session', r.session.id], r);
      void qc.invalidateQueries({ queryKey: ['mission', id] });
      void qc.invalidateQueries({ queryKey: ['student-progress'] });
      navigate(`/play/${r.session.id}`);
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const { mission: m, activeSessionId } = q.data;
  const loc = getLocation(m.locationId);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted" aria-label="breadcrumb">
        <ButtonLink to={`/city?location=${m.locationId}`} variant="ghost" size="sm" className="-ml-3">
          ← {loc ? L(loc.name) : t('nav.city')}
        </ButtonLink>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>{m.id}</Badge>
              <LevelBadge level={m.level} />
              <Badge>⏱ {t('common.minutes', { count: m.estimatedMinutes })}</Badge>
              <Badge tone="warn">⭐ {m.xpReward} XP</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{L(m.title)}</h1>
            <p className="mt-1 text-muted">{L(m.summary)}</p>
            <h2 className="mt-5 text-sm font-semibold tracking-wide text-muted uppercase">{t('mission.briefing')}</h2>
            <p className="mt-1 leading-relaxed">{L(m.briefing)}</p>
            <h2 className="mt-5 text-sm font-semibold tracking-wide text-muted uppercase">{t('mission.goals')}</h2>
            <ul className="mt-2 space-y-2">
              {m.goals.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                  <span>{L(g)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <StudentCard mission={m} />

          <Card>
            <SectionTitle>{t('mission.stages')}</SectionTitle>
            <ol className="space-y-3">
              {m.stages.map((s, i) => (
                <li key={s.id} className="rounded-xl border border-line p-3">
                  <div className="font-semibold">
                    {t('mission.stageN', { n: i + 1 })} · <span lang="en">{s.title}</span>
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
                    {s.objectives.map((o) => (
                      <li key={o.id}>
                        {L(o.label)}
                        {!o.required && <span className="ml-1 text-xs">({t('mission.optional')})</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {m.targetVocabulary.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold tracking-wide text-muted uppercase">{t('mission.vocabulary')}</h3>
                <ul className="mt-2 flex flex-wrap gap-2" lang="en">
                  {m.targetVocabulary.map((v) => (
                    <li key={v} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                      {v}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <div className="flex items-center gap-4">
              <Avatar avatar={m.npc.avatar} size={80} label={m.npc.name} />
              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-wide text-muted uppercase">{t('mission.youWillTalkTo')}</div>
                <div className="text-lg font-bold">{m.npc.name}</div>
                <div className="text-sm text-muted" lang="en">
                  {m.npc.role}
                </div>
                <div className="text-xs text-muted">{m.npc.accent === 'en-GB' ? t('mission.accentGB') : t('mission.accentUS')}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-surface-2 p-2.5">
                <dt className="text-xs text-muted">{t('mission.maxTurns')}</dt>
                <dd className="font-semibold">{m.limits.maxTurns}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-2.5">
                <dt className="text-xs text-muted">{t('mission.timeLimit')}</dt>
                <dd className="font-semibold">{t('common.minutes', { count: m.limits.maxMinutes })}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-2.5">
                <dt className="text-xs text-muted">{t('mission.hints')}</dt>
                <dd className="font-semibold">{m.limits.maxHints}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-2.5">
                <dt className="text-xs text-muted">{t('mission.replays')}</dt>
                <dd className="font-semibold">{m.limits.maxReplays}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              {activeSessionId ? (
                <>
                  <Button data-testid="mission-continue" size="lg" onClick={() => navigate(`/play/${activeSessionId}`)}>
                    ▶ {t('mission.continue')}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmRestart(true)} loading={start.isPending}>
                    ↺ {t('mission.startOver')}
                  </Button>
                </>
              ) : (
                <Button data-testid="mission-start" size="lg" onClick={() => start.mutate(false)} loading={start.isPending}>
                  🎙️ {t('mission.start')}
                </Button>
              )}
              <p className="text-xs text-muted">{t('mission.startNote')}</p>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmModal
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        onConfirm={() => {
          setConfirmRestart(false);
          start.mutate(true);
        }}
        title={t('mission.startOverTitle')}
        confirmLabel={t('mission.startOver')}
        tone="danger"
      >
        <p>{t('mission.startOverBody')}</p>
      </ConfirmModal>
    </div>
  );
}
