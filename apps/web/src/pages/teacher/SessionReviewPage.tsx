import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CRITERIA, type Criterion } from '@ecs/shared';
import { api, isApiError } from '../../api/client';
import type { ResultTurn, ResultsResponse } from '../../api/types';
import { useLocalized } from '../../i18n';
import { errorMessage } from '../../i18n/errors';
import { formatDate, formatSeconds } from '../../lib/format';
import { Alert, Badge, Button, Card, ErrorBox, Field, Input, LevelBadge, PageHeader, PageSkeleton, SectionTitle, Textarea } from '../../components/ui';
import { BulletList, CriterionSource, Transcript } from '../../components/results';
import { useToast } from '../../components/Toast';

function TurnAudio({ sessionId, turn }: { sessionId: string; turn: ResultTurn }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'expired' | 'error'>('idle');
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  if (turn.speaker !== 'student' || !turn.hasAudio) return null;
  if (url) return <audio className="mt-2 w-full max-w-sm" src={url} controls autoPlay aria-label={t('review.studentAudio')} />;
  const load = async () => {
    setState('loading');
    try {
      const blob = await api.blob(`/api/teacher/sessions/${sessionId}/audio/${encodeURIComponent(turn.id)}`);
      setUrl(URL.createObjectURL(blob));
      setState('idle');
    } catch (e) {
      setState(isApiError(e, 'NOT_FOUND') ? 'expired' : 'error');
    }
  };
  return (
    <div className="mt-2 flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => void load()} loading={state === 'loading'}>
        ▶ {t('review.playAudio')}
      </Button>
      {state === 'expired' && <span className="text-xs text-muted">{t('review.audioExpired')}</span>}
      {state === 'error' && <span className="text-xs text-danger">{t('review.audioError')}</span>}
    </div>
  );
}

export default function SessionReviewPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { L, lang } = useLocalized();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['teacher-session', id], queryFn: () => api.get<ResultsResponse>(`/api/teacher/sessions/${id}`) });
  const [scores, setScores] = useState<Partial<Record<Criterion, string>>>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!q.data) return;
    const a = q.data.assessment;
    const init: Partial<Record<Criterion, string>> = {};
    for (const k of CRITERIA) {
      const v = a.teacherReview?.scores[k] ?? a.aiCriteria[k]?.score;
      init[k] = v === null || v === undefined ? '' : String(v);
    }
    setScores(init);
    setComment(a.teacherReview?.comment ?? '');
  }, [q.data]);

  const save = useMutation({
    mutationFn: (body: { scores: Partial<Record<Criterion, number>>; comment: string }) => api.put(`/api/teacher/assessments/${id}/review`, body),
    onSuccess: () => {
      toast.success(t('review.saved'));
      void qc.invalidateQueries({ queryKey: ['teacher-session', id] });
      void qc.invalidateQueries({ queryKey: ['teacher-class'] });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const { assessment: a, turns, mission, session } = q.data;

  const parsed: Partial<Record<Criterion, number>> = {};
  const invalid: Criterion[] = [];
  for (const k of CRITERIA) {
    const raw = scores[k];
    if (raw === undefined || raw === '') continue;
    const n = Number(raw);
    const max = a.aiCriteria[k]?.max ?? 0;
    if (!Number.isFinite(n) || n < 0 || n > max) invalid.push(k);
    else parsed[k] = n;
  }

  const confirmAi = () => {
    const s: Partial<Record<Criterion, number>> = {};
    for (const k of CRITERIA) {
      const v = a.aiCriteria[k]?.score;
      if (v !== null && v !== undefined) s[k] = v;
    }
    save.mutate({ scores: s, comment });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => navigate(-1)}>
        ← {t('common.back')}
      </Button>
      <PageHeader
        title={`${mission.id} · ${L(mission.title)}`}
        subtitle={`${formatDate(a.createdAt, lang, true)} · ${t('results.duration', { time: formatSeconds(session.activeSeconds) })} · ${t('results.turnsSummary', { voice: session.voiceTurns, text: session.textTurns })}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={mission.level} />
            {a.missionCompleted ? <Badge tone="success">✓ {t('results.completed')}</Badge> : <Badge tone="warn">{t('results.partial')}</Badge>}
            {a.teacherReview ? <Badge tone="success">✓ {t(`teacher.reviewStatus.${a.teacherReview.status}`)}</Badge> : <Badge tone="warn">{t('teacher.toReview')}</Badge>}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <SectionTitle>{t('results.transcript', { count: turns.length })}</SectionTitle>
          <Transcript turns={turns} npcName={t('results.npc')} renderAudio={(tn) => <TurnAudio sessionId={id} turn={tn} />} />
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle>{t('review.title')}</SectionTitle>
            <div className="mb-3 flex items-baseline justify-between text-sm">
              <span className="text-muted">{t('review.aiTotal')}</span>
              <span className="font-bold">{a.percent}%</span>
            </div>
            <div className="mb-4 flex items-baseline justify-between text-sm">
              <span className="text-muted">{t('review.finalTotal')}</span>
              <span className="text-xl font-bold">{a.finalPercent}%</span>
            </div>
            <ul className="space-y-3">
              {CRITERIA.map((k) => {
                const ai = a.aiCriteria[k];
                if (!ai) return null;
                return (
                  <li key={k} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{t(`criteria.${k}`)}</span>
                      <CriterionSource source={ai.source} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 items-end gap-3">
                      <div className="text-sm">
                        <div className="text-xs text-muted">{t('review.aiScore')}</div>
                        <div className="font-semibold">{ai.status === 'assessed' && ai.score !== null ? `${ai.score}/${ai.max}` : t('results.notAssessed')}</div>
                      </div>
                      <Field label={t('review.teacherScore', { max: ai.max })} error={invalid.includes(k) ? t('review.outOfRange', { max: ai.max }) : undefined}>
                        {(fid) => (
                          <Input
                            id={fid}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={ai.max}
                            step={1}
                            value={scores[k] ?? ''}
                            placeholder="—"
                            onChange={(e) => setScores((s) => ({ ...s, [k]: e.target.value }))}
                          />
                        )}
                      </Field>
                    </div>
                    {ai.comment && (
                      <p className="mt-2 text-xs text-muted" lang="en">
                        {ai.comment}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <Field label={t('review.comment')} className="mt-4">
              {(fid) => <Textarea id={fid} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />}
            </Field>
            {a.teacherReview && (
              <p className="mt-2 text-xs text-muted">
                {t('review.lastReview', { name: a.teacherReview.reviewerName, date: formatDate(a.teacherReview.reviewedAt, lang, true) })}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => save.mutate({ scores: parsed, comment })} loading={save.isPending} disabled={invalid.length > 0}>
                {t('review.save')}
              </Button>
              <Button variant="secondary" onClick={confirmAi} disabled={save.isPending}>
                ✓ {t('review.confirmAi')}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">{t('review.note')}</p>
          </Card>

          {a.feedback && (
            <Card>
              <SectionTitle>{t('results.feedback')}</SectionTitle>
              <div className="space-y-4">
                <BulletList title={t('results.strengths')} items={a.feedback.strengths} icon="💪" />
                <BulletList title={t('results.improvements')} items={a.feedback.improvements} icon="🎯" />
                <BulletList title={t('results.grammar')} items={a.feedback.grammarCorrections.map((g) => `${g.original} → ${g.corrected}`)} icon="✏️" />
              </div>
            </Card>
          )}
          {a.aiStatus !== 'ok' && <Alert>{t('results.aiFailedNote')}</Alert>}
        </div>
      </div>
    </div>
  );
}
