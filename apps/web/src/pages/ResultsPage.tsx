import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENTS } from '@ecs/shared';
import { api, isApiError } from '../api/client';
import type { ResultsResponse } from '../api/types';
import { useLocalized } from '../i18n';
import { errorMessage } from '../i18n/errors';
import { formatDate, formatSeconds } from '../lib/format';
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, ErrorBox, LevelBadge, PageSkeleton, SectionTitle, Spinner, cx } from '../components/ui';
import { BulletList, RubricTable, Transcript } from '../components/results';
import { useToast } from '../components/Toast';

export function ResultsPage() {
  const { sessionId = '' } = useParams();
  const { t } = useTranslation();
  const [polls, setPolls] = useState(0);
  const q = useQuery({
    queryKey: ['results', sessionId],
    queryFn: async () => {
      setPolls((n) => n + 1);
      return api.get<ResultsResponse>(`/api/sessions/${sessionId}/results`);
    },
    retry: false,
    refetchInterval: (query) => (isApiError(query.state.error, 'NOT_FOUND') && polls < 20 ? 3000 : false),
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.isError) {
    if (isApiError(q.error, 'NOT_FOUND')) return <NotReady sessionId={sessionId} />;
    return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <ResultsView data={q.data} t={t} />;
}

function NotReady({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const complete = useMutation({
    mutationFn: () => api.post(`/api/sessions/${sessionId}/complete`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['results', sessionId] }),
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  return (
    <EmptyState
      icon="⏳"
      title={t('results.notReadyTitle')}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink to={`/play/${sessionId}`} variant="secondary">
            {t('results.backToPlay')}
          </ButtonLink>
          <Button onClick={() => complete.mutate()} loading={complete.isPending}>
            {t('play.finishNow')}
          </Button>
        </div>
      }
    >
      <span className="inline-flex items-center gap-2">
        <Spinner className="h-4 w-4" /> {t('results.notReadyBody')}
      </span>
    </EmptyState>
  );
}

function ResultsView({ data, t }: { data: ResultsResponse; t: ReturnType<typeof useTranslation>['t'] }) {
  const { L, lang } = useLocalized();
  const navigate = useNavigate();
  const a = data.assessment;
  const fb = a.feedback;
  const review = a.teacherReview;
  const nextId = a.recommendation.nextMissionId;
  const percent = a.finalPercent;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-6">
          <div
            className={cx(
              'grid h-32 w-32 shrink-0 place-items-center rounded-full border-8 text-center',
              percent >= 80 ? 'border-success/60' : percent >= 50 ? 'border-primary/60' : 'border-warn/60',
            )}
          >
            <div>
              <div data-testid="results-percent" className="text-4xl font-extrabold tabular-nums">
                {percent}%
              </div>
              <div className="text-xs text-muted">{t('results.total')}</div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{data.mission.id}</Badge>
              <LevelBadge level={data.mission.level} />
              {a.missionCompleted ? <Badge tone="success">✓ {t('results.completed')}</Badge> : <Badge tone="warn">{t('results.partial')}</Badge>}
              {review && (
                <Badge tone="success">
                  👩‍🏫 {review.status === 'adjusted' ? t('results.teacherAdjusted') : t('results.teacherConfirmed')}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{L(data.mission.title)}</h1>
            <p className="text-sm text-muted">
              {t('results.objectivesMet', { met: a.objectivesMet, total: a.objectivesRequired })} · {t('results.duration', { time: formatSeconds(data.session.activeSeconds) })} ·{' '}
              {t('results.turnsSummary', { voice: data.session.voiceTurns, text: data.session.textTurns })} · {formatDate(a.createdAt, lang, true)}
            </p>
            {review && percent !== a.percent && <p className="text-xs text-muted">{t('results.aiPercent', { percent: a.percent })}</p>}
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-warn-soft px-5 py-3 text-warn">
            <span className="text-3xl font-extrabold">+{a.xpAwarded}</span>
            <span className="text-xs font-semibold">XP</span>
          </div>
        </div>
        {a.newAchievements.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {a.newAchievements.map((x) => (
              <span key={x} className="inline-flex items-center gap-2 rounded-full border border-warn/40 bg-warn-soft px-3 py-1 text-sm font-semibold text-warn">
                🏅 {ACHIEVEMENTS[x]?.[lang] ?? x}
              </span>
            ))}
          </div>
        )}
      </Card>

      {review && (
        <Card className="border-success/40">
          <SectionTitle>👩‍🏫 {t('results.teacherReview')}</SectionTitle>
          <p className="text-sm text-muted">
            {review.reviewerName} · {formatDate(review.reviewedAt, lang, true)}
          </p>
          {review.comment && <p className="mt-2 whitespace-pre-wrap">{review.comment}</p>}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('results.rubric')}</SectionTitle>
          <RubricTable criteria={a.criteria} testIds />
          {a.evidenceMode === 'text' && <Alert className="mt-3">{t('results.textModeNote')}</Alert>}
          {a.aiStatus === 'failed' && <Alert className="mt-3">{t('results.aiFailedNote')}</Alert>}
        </Card>

        <Card>
          <SectionTitle>{t('results.objectives')}</SectionTitle>
          <ul className="space-y-1.5">
            {data.mission.objectives.map((o) => (
              <li key={o.id} className={cx('flex items-start gap-2 text-sm', o.met ? 'text-success' : 'text-muted')}>
                <span aria-hidden="true">{o.met ? '✅' : '⬜'}</span>
                <span>
                  {L(o.label)}
                  {!o.required && ` (${t('mission.optional')})`}
                  <span className="sr-only"> – {o.met ? t('play.met') : t('play.notMet')}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-primary-soft/60 p-4">
            <h3 className="font-semibold">🧭 {t('results.recommendation')}</h3>
            <p className="mt-1 text-sm" lang="en">
              {a.recommendation.reason}
            </p>
            {nextId && (
              <ButtonLink to={`/missions/${nextId}`} variant="secondary" size="sm" className="mt-3">
                {nextId === data.mission.id ? t('results.playAgain') : t('results.goToMission', { id: nextId })} →
              </ButtonLink>
            )}
          </div>
        </Card>
      </div>

      {fb ? (
        <Card>
          <SectionTitle>{t('results.feedback')}</SectionTitle>
          <div className="grid gap-6 md:grid-cols-2">
            <BulletList title={t('results.strengths')} items={fb.strengths} icon="💪" />
            <BulletList title={t('results.improvements')} items={fb.improvements} icon="🎯" />
          </div>
          {fb.grammarCorrections.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold">✏️ {t('results.grammar')}</h3>
              <ul className="space-y-2" lang="en">
                {fb.grammarCorrections.map((g, i) => (
                  <li key={i} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-danger line-through decoration-2">{g.original}</span>
                      <span aria-hidden="true">→</span>
                      <span className="sr-only">{t('results.correctedTo')}</span>
                      <span className="font-semibold text-success">{g.corrected}</span>
                    </div>
                    {g.explanation && <p className="mt-1 text-muted">{g.explanation}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fb.vocabularyToReview.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold">📚 {t('results.vocabulary')}</h3>
              <ul className="grid gap-2 sm:grid-cols-2" lang="en">
                {fb.vocabularyToReview.map((v, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                    <div className="font-semibold">{v.term}</div>
                    {v.example && <div className="text-muted italic">“{v.example}”</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <BulletList title={t('results.listeningTips')} items={fb.listeningTips} icon="🎧" />
            <BulletList title={t('results.nextPractice')} items={fb.nextPractice} icon="🚀" />
          </div>
          {fb.pronunciationNote && (
            <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm" lang="en">
              🗣️ {fb.pronunciationNote}
            </p>
          )}
        </Card>
      ) : (
        <Alert>{t('results.noFeedback')}</Alert>
      )}

      <Card>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{t('results.transcript', { count: data.turns.length })}</summary>
          <div className="mt-3">
            <Transcript turns={data.turns} npcName={t('results.npc')} />
          </div>
        </details>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/missions/${data.mission.id}`)}>↺ {t('results.playAgain')}</Button>
        {nextId && nextId !== data.mission.id && (
          <ButtonLink to={`/missions/${nextId}`} variant="secondary">
            {t('results.nextMission')} →
          </ButtonLink>
        )}
        <ButtonLink to="/city" variant="secondary">
          🏙️ {t('results.backToCity')}
        </ButtonLink>
      </div>

      <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs text-muted" role="note">
        ⚠️ {a.disclaimer || t('results.disclaimer')}
      </p>
    </div>
  );
}
