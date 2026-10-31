import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENTS, LEVELS, type Level } from '@ecs/shared';
import { api } from '../api/client';
import type { MeUser, StudentProgress } from '../api/types';
import { useAuth, useSetMeUser } from '../auth/AuthProvider';
import { useLocalized } from '../i18n';
import { errorMessage } from '../i18n/errors';
import { formatDate } from '../lib/format';
import { Badge, ButtonLink, Card, EmptyState, ErrorBox, LevelBadge, PageHeader, PageSkeleton, ProgressBar, SectionTitle, StatCard, cx } from '../components/ui';
import { useToast } from '../components/Toast';

export function StudentDashboard() {
  const { t } = useTranslation();
  const { L, lang } = useLocalized();
  const { me } = useAuth();
  const setMeUser = useSetMeUser();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['student-progress'], queryFn: () => api.get<StudentProgress>('/api/student/progress') });

  const levelMut = useMutation({
    mutationFn: (level: Level) => api.patch<{ user: MeUser }>('/api/me', { level }),
    onSuccess: (r) => {
      setMeUser(r.user);
      void qc.invalidateQueries({ queryKey: ['student-progress'] });
      toast.success(t('student.levelSaved'));
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const name = d.user.displayName || me?.user?.displayName || '';
  const now = Date.now();
  const assignments = [...d.assignments].sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('student.hello', { name })}
        subtitle={me?.tenant?.name}
        actions={
          <ButtonLink to="/city" size="lg">🏙️ {t('student.goToCity')}</ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-muted uppercase">{t('student.level')}</div>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t('student.level')}>
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                role="radio"
                aria-checked={d.stats.level === lv}
                disabled={levelMut.isPending}
                onClick={() => d.stats.level !== lv && levelMut.mutate(lv)}
                className={cx(
                  'min-h-11 flex-1 rounded-xl border text-lg font-bold transition-colors',
                  d.stats.level === lv ? 'border-primary bg-primary text-primary-fg' : 'border-line text-muted hover:border-primary hover:text-fg',
                )}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
        <StatCard label="XP" value={d.stats.xp.toLocaleString()} />
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-muted uppercase">{t('student.missionsCompleted')}</div>
          <div className="mt-1 text-2xl font-bold">
            {d.stats.missionsCompleted}/{d.stats.missionsTotal}
          </div>
          <div className="mt-2">
            <ProgressBar value={d.stats.missionsCompleted} max={d.stats.missionsTotal || 1} label={t('student.missionsCompleted')} tone="success" />
          </div>
        </div>
        <StatCard label={t('student.average')} value={d.stats.averagePercent === null ? '—' : `${d.stats.averagePercent}%`} hint={t('student.sessionsPlayed', { count: d.stats.sessionsPlayed })} />
      </div>

      {d.activeSessions.length > 0 && (
        <Card className="border-primary/40 bg-primary-soft/40">
          <SectionTitle>{t('student.continueTitle')}</SectionTitle>
          <ul className="space-y-2">
            {d.activeSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
                <div>
                  <div className="font-semibold">
                    {s.missionId} · {L(s.title)}
                  </div>
                  <div className="text-xs text-muted">
                    {t(`sessionStatus.${s.status}`)} · {formatDate(s.lastActivityAt, lang, true)}
                  </div>
                </div>
                <ButtonLink to={`/play/${s.id}`}>{t('student.continue')}</ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <SectionTitle>{t('student.recommendation')}</SectionTitle>
            {d.recommendation ? (
              <div className="space-y-3">
                <p>
                  {d.recommendation.nextMissionId ? (
                    <>
                      <span className="font-semibold">
                        {d.recommendation.nextMissionId} · {L(d.recommendation.title)}
                      </span>{' '}
                      <LevelBadge level={d.recommendation.nextLevel} />
                    </>
                  ) : (
                    t('student.allDone')
                  )}
                </p>
                <p className="text-sm text-muted" lang="en">
                  {d.recommendation.reason}
                </p>
                {d.recommendation.tips.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm" lang="en">
                    {d.recommendation.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                )}
                {d.recommendation.nextMissionId && (
                  <ButtonLink to={`/missions/${d.recommendation.nextMissionId}`} variant="secondary">{t('student.openMission')}</ButtonLink>
                )}
              </div>
            ) : (
              <EmptyState icon="✨" title={t('student.noRecommendation')}>
                {t('student.noRecommendationBody')}
              </EmptyState>
            )}
          </Card>

          <Card>
            <SectionTitle>{t('student.recent')}</SectionTitle>
            {d.recent.length === 0 ? (
              <EmptyState icon="🎧" title={t('student.noResults')} action={<ButtonLink to="/city" variant="secondary">{t('student.goToCity')}</ButtonLink>}>
                {t('student.noResultsBody')}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {d.recent.map((r) => (
                  <li key={r.sessionId}>
                    <Link to={`/results/${r.sessionId}`} className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {r.missionId} · {L(r.title)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <LevelBadge level={r.level} />
                          <span>{formatDate(r.createdAt, lang, true)}</span>
                          {!r.missionCompleted && <Badge tone="warn">{t('results.partial')}</Badge>}
                          {r.reviewed && <Badge tone="success">✓ {t('results.teacherReviewed')}</Badge>}
                        </div>
                      </div>
                      <span className={cx('text-xl font-bold', r.percent >= 80 ? 'text-success' : r.percent >= 50 ? 'text-fg' : 'text-warn')}>{r.percent}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>{t('student.assignments')}</SectionTitle>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted">{t('student.noAssignments')}</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => {
                  const overdue = a.dueAt && !a.completed && new Date(a.dueAt).getTime() < now;
                  return (
                    <li key={a.id}>
                      <Link to={`/missions/${a.missionId}?assignment=${encodeURIComponent(a.id)}`} className="block rounded-xl border border-line px-3 py-2.5 hover:border-primary">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{a.missionId}</span>
                          {a.completed ? <Badge tone="success">✓ {t('student.done')}</Badge> : overdue ? <Badge tone="danger">{t('student.overdue')}</Badge> : <Badge tone="primary">{t('student.todo')}</Badge>}
                        </div>
                        <div className="text-xs text-muted">{a.courseName}</div>
                        <div className="text-xs text-muted">
                          {t('student.due')}: {a.dueAt ? formatDate(a.dueAt, lang, true) : t('student.noDue')}
                        </div>
                        {a.note && <div className="mt-1 text-sm">{a.note}</div>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>{t('student.achievements')}</SectionTitle>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {Object.entries(ACHIEVEMENTS).map(([id, label]) => {
                const earned = d.achievements.includes(id);
                return (
                  <li key={id} className={cx('flex items-center gap-3 rounded-xl border px-3 py-2', earned ? 'border-warn/40 bg-warn-soft' : 'border-line opacity-60')}>
                    <span aria-hidden="true" className="text-xl">
                      {earned ? '🏅' : '🔒'}
                    </span>
                    <span className="text-sm font-medium">{label[lang]}</span>
                    <span className="sr-only">{earned ? t('student.earned') : t('student.locked')}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
