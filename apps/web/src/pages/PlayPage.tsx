import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, isApiError, ApiError } from '../api/client';
import type { HintResponse, MeUser, PublicMission, PublicTurn, ReplayResponse, SessionResponse, SessionView, TurnResponse } from '../api/types';
import { isTenantUser } from '../api/types';
import { useAuth, useSetMeUser } from '../auth/AuthProvider';
import { MicError, recordingSupported, type RecordingResult } from '../audio/recorder';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { Alert, Badge, Button, ButtonLink, Card, ConfirmModal, EmptyState, ErrorBox, Modal, PageSkeleton, ProgressBar, Spinner, cx } from '../components/ui';
import { ConsentModal } from '../conversation/ConsentModal';
import { MicButton } from '../conversation/MicButton';
import { playNpcLine, stopNpcAudio } from '../conversation/npcAudio';
import { useLocalized } from '../i18n';
import { errorMessage } from '../i18n/errors';
import { formatSeconds } from '../lib/format';
import { uuid } from '../lib/uuid';
import { StudentCard } from './MissionPage';

type Pending = { clientTurnId: string; kind: 'text'; text: string } | { clientTurnId: string; kind: 'voice'; blob: Blob };
type Busy = null | 'turn' | 'hint' | 'replay' | 'pause' | 'complete';
interface Notice {
  tone: 'warn' | 'danger' | 'primary';
  message: string;
  retry?: boolean;
}

/** Errors after which the same clientTurnId may be safely re-sent (idempotent retry). */
const RETRYABLE = new Set(['NETWORK', 'INTERNAL', 'CONFLICT', 'TURN_IN_PROGRESS']);

export function PlayPage() {
  const { sessionId = '' } = useParams();
  const q = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get<SessionResponse>(`/api/sessions/${sessionId}`),
    staleTime: Infinity,
    gcTime: 0,
  });
  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  return <Conversation key={sessionId} initial={q.data} />;
}

function Conversation({ initial }: { initial: SessionResponse }) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { me } = useAuth();
  const setMeUser = useSetMeUser();
  const mission: PublicMission = initial.mission;
  const id = initial.session.id;

  const [session, setSessionState] = useState<SessionView>(initial.session);
  const [turns, setTurns] = useState<PublicTurn[]>(initial.turns);
  const [busy, setBusy] = useState<Busy>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [text, setText] = useState('');
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [heardKey, setHeardKey] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [micProblem, setMicProblem] = useState<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  // ---- client-side clock (server is the source of truth; we tick between updates) ----
  const clockBase = useRef({ elapsed: initial.session.elapsedSeconds, at: Date.now() });
  const [now, setNow] = useState(Date.now());
  const setSession = useCallback((s: SessionView) => {
    clockBase.current = { elapsed: s.elapsedSeconds, at: Date.now() };
    setSessionState(s);
  }, []);
  useEffect(() => {
    if (session.status !== 'active') return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [session.status]);
  const elapsed = session.status === 'active' ? Math.min(session.maxSeconds, clockBase.current.elapsed + Math.max(0, (now - clockBase.current.at) / 1000)) : session.elapsedSeconds;
  const timeLeft = Math.max(0, session.maxSeconds - elapsed);

  const timeUp = timeLeft <= 0;
  const turnsUp = session.studentTurns >= session.maxTurns;
  const ready = session.status === 'ready_to_complete';
  const finishProminent = ready || timeUp || turnsUp;
  const paused = session.status === 'paused';
  const canTalk = session.status === 'active' && !timeUp && !turnsUp && busy === null;

  // Leave the play screen when the session is already finished.
  useEffect(() => {
    if (initial.session.status === 'completed' || initial.session.status === 'assessing') navigate(`/results/${id}`, { replace: true });
  }, [initial.session.status, id, navigate]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, busy]);

  useEffect(() => () => stopNpcAudio(), []);

  const latestNpc = useMemo(() => [...turns].reverse().find((x) => x.speaker === 'npc') ?? null, [turns]);
  const lineKey = (tn: { id: string } | null) => (tn ? `${tn.id}` : null);

  const play = useCallback(
    async (line: { text: string; ttsHash: string | null }, key: string | null) => {
      const r = await playNpcLine({
        text: line.text,
        ttsHash: line.ttsHash,
        accent: mission.npc.accent,
        rate: mission.level === 'B1' ? 0.92 : 1,
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
      if (r === 'played') setHeardKey(key);
      return r;
    },
    [mission.npc.accent, mission.level],
  );

  // Try to play the latest NPC line when the screen opens.
  useEffect(() => {
    if (latestNpc && ['active', 'ready_to_complete'].includes(initial.session.status)) void play(latestNpc, lineKey(latestNpc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const r = await api.get<SessionResponse>(`/api/sessions/${id}`);
      setSession(r.session);
      setTurns(r.turns);
    } catch {
      /* keep current view */
    }
  }, [id, setSession]);

  const labelOf = (objectiveId: string) => {
    const o = session.objectives.find((x) => x.id === objectiveId);
    return o ? L(o.label) : objectiveId;
  };

  // ---- turns ----
  const applyTurn = (r: TurnResponse) => {
    const nowIso = new Date().toISOString();
    const student: PublicTurn = { id: r.clientTurnId, seq: 0, speaker: 'student', text: r.studentText, mode: r.mode, stageId: '', ttsHash: null, fallback: false, createdAt: nowIso };
    const npc: PublicTurn = { id: `${r.clientTurnId}_npc`, seq: 0, speaker: 'npc', text: r.npcText, mode: r.fallback ? 'scripted' : 'voice', stageId: '', ttsHash: r.ttsHash, fallback: r.fallback, createdAt: nowIso };
    setTurns((xs) => [...xs.filter((x) => x.id !== student.id && x.id !== npc.id), student, npc]);
    setSession(r.session);
    for (const o of r.objectivesCredited) toast.success(`✓ ${labelOf(o)}`);
    if (r.stageChanged && r.session.status !== 'ready_to_complete') toast.show(`${t('play.newStage', { n: r.session.stageIndex + 1, total: r.session.stageCount })}: ${r.session.stageTitle}`);
    if (r.session.status === 'ready_to_complete') toast.success(t('play.allDone'));
    void play({ text: r.npcText, ttsHash: r.ttsHash }, npc.id);
  };

  const submit = async (p: Pending) => {
    setBusy('turn');
    setPending(p);
    setNotice(null);
    stopNpcAudio();
    try {
      let r: TurnResponse;
      if (p.kind === 'text') {
        r = await api.post<TurnResponse>(`/api/sessions/${id}/turns`, { clientTurnId: p.clientTurnId, text: p.text });
      } else {
        const form = new FormData();
        form.append('clientTurnId', p.clientTurnId);
        form.append('audio', p.blob, 'audio.wav');
        r = await api.post<TurnResponse>(`/api/sessions/${id}/voice`, form);
      }
      setPending(null);
      if (p.kind === 'text') setText('');
      applyTurn(r);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'INTERNAL';
      if (RETRYABLE.has(code)) {
        setNotice({ tone: 'danger', message: errorMessage(t, e), retry: true });
      } else {
        setPending(null);
        if (code === 'CONSENT_REQUIRED') setConsentOpen(true);
        setNotice({ tone: code === 'AUDIO_UNCLEAR' || code === 'AUDIO_TOO_LONG' ? 'warn' : 'danger', message: errorMessage(t, e) });
        if (['SESSION_NOT_ACTIVE', 'TURN_LIMIT', 'TIME_LIMIT'].includes(code)) void refreshSession();
      }
    } finally {
      setBusy(null);
    }
  };

  const sendText = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !canTalk) return;
    // Re-use the id only when re-sending exactly the same failed text (idempotent retry).
    const sameAsPending = pending?.kind === 'text' && pending.text === value;
    void submit({ kind: 'text', text: value, clientTurnId: sameAsPending ? pending.clientTurnId : uuid() });
  };

  const hasConsent = isTenantUser(me?.user) && Boolean(me.user.recordingConsentAt);

  const onRecorded = (r: RecordingResult) => {
    if (r.durationSeconds < 0.5) {
      setNotice({ tone: 'warn', message: t('play.tooShort') });
      return;
    }
    void submit({ kind: 'voice', blob: r.blob, clientTurnId: uuid() });
  };

  const onMicError = (e: MicError) => {
    const key = e.kind === 'denied' ? 'play.micDenied' : e.kind === 'no_device' ? 'play.micMissing' : e.kind === 'unsupported' ? 'play.micUnsupported' : 'play.micFailed';
    setMicProblem(t(key));
  };

  const agreeConsent = async () => {
    setConsentSaving(true);
    try {
      const r = await api.patch<{ user: MeUser }>('/api/me', { recordingConsent: true });
      setMeUser(r.user);
      setConsentOpen(false);
      toast.success(t('consent.saved'));
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setConsentSaving(false);
    }
  };

  // ---- hint / replay / pause ----
  const hint = async () => {
    setBusy('hint');
    try {
      const r = await api.post<HintResponse>(`/api/sessions/${id}/hint`);
      setSession(r.session);
      setLastHint(r.hint);
      setTurns((xs) => [...xs, { id: `hint_local_${Date.now()}`, seq: 0, speaker: 'system', text: `Hint: ${r.hint}`, mode: 'scripted', stageId: '', ttsHash: null, fallback: false, createdAt: new Date().toISOString() }]);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(null);
    }
  };

  const replay = async (kind: 'replay' | 'repeat_request') => {
    if (!latestNpc) return;
    // First listen (e.g. autoplay was blocked) is free; only real replays are counted.
    if (kind === 'replay' && heardKey !== lineKey(latestNpc)) {
      const r = await play(latestNpc, lineKey(latestNpc));
      if (r !== 'played') toast.error(t('play.audioFailed'));
      return;
    }
    setBusy('replay');
    try {
      const r = await api.post<ReplayResponse>(`/api/sessions/${id}/replay`, { kind });
      setSession(r.session);
      if (kind === 'repeat_request') {
        setTurns((xs) => [...xs, { id: `repeat_local_${Date.now()}`, seq: 0, speaker: 'system', text: t('play.repeatAsked'), mode: 'scripted', stageId: '', ttsHash: null, fallback: false, createdAt: new Date().toISOString() }]);
      }
      setBusy(null);
      await play({ text: r.text, ttsHash: r.ttsHash }, lineKey(latestNpc));
    } catch (e) {
      toast.error(errorMessage(t, e));
      setBusy(null);
    }
  };

  const setPausedState = async (pause: boolean) => {
    setBusy('pause');
    try {
      const r = await api.post<{ session: SessionView }>(`/api/sessions/${id}/${pause ? 'pause' : 'resume'}`);
      setSession(r.session);
      if (pause) stopNpcAudio();
    } catch (e) {
      toast.error(errorMessage(t, e));
      void refreshSession();
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    setConfirmFinish(false);
    setBusy('complete');
    stopNpcAudio();
    try {
      await api.post<{ assessmentId: string }>(`/api/sessions/${id}/complete`);
      void qc.invalidateQueries({ queryKey: ['student-progress'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      navigate(`/results/${id}`);
    } catch (e) {
      if (isApiError(e, 'TURN_IN_PROGRESS') && session.status !== 'active') {
        navigate(`/results/${id}`);
        return;
      }
      toast.error(errorMessage(t, e));
      setBusy(null);
      void refreshSession();
    }
  };

  const remainingReplays = Math.max(0, session.maxReplays - session.replaysUsed);
  const remainingHints = Math.max(0, session.maxHints - session.hintsUsed);
  const heardLatest = latestNpc && heardKey === lineKey(latestNpc);

  if (session.status === 'expired') {
    return (
      <EmptyState icon="⌛" title={t('play.expiredTitle')} action={<ButtonLink to={`/missions/${mission.id}`}>{t('play.backToMission')}</ButtonLink>}>
        {t('play.expiredBody')}
      </EmptyState>
    );
  }

  const stageTitle = session.stageTitle;
  const timerTone = timeLeft < 60 ? 'text-danger' : timeLeft < 180 ? 'text-warn' : 'text-fg';

  return (
    <div className="space-y-4">
      {/* status strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
        <Link to={`/missions/${mission.id}`} className="min-w-0 flex-1 basis-48">
          <div className="text-xs font-semibold text-muted">
            {mission.id} · {mission.level}
          </div>
          <div className="truncate font-semibold">{L(mission.title)}</div>
        </Link>
        <div className="flex w-full items-center justify-between gap-3 text-sm whitespace-nowrap sm:w-auto sm:justify-start sm:gap-4">
          <div title={t('play.stage')}>
            <span className="text-muted">{t('play.stage')} </span>
            <span className="font-bold">
              {Math.min(session.stageIndex + 1, session.stageCount)}/{session.stageCount}
            </span>
          </div>
          <div title={t('play.time')} className={cx('font-mono font-bold tabular-nums', timerTone)} role="timer" aria-label={t('play.timeLeft', { time: formatSeconds(timeLeft) })}>
            ⏱ {formatSeconds(elapsed)}/{formatSeconds(session.maxSeconds)}
          </div>
          <div title={t('play.turns')}>
            <span className="text-muted">{t('play.turns')} </span>
            <span className="font-bold tabular-nums">
              {session.studentTurns}/{session.maxTurns}
            </span>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {session.status === 'active' && (
            <Button variant="secondary" size="sm" onClick={() => void setPausedState(true)} disabled={busy !== null} aria-label={t('play.pause')}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
                <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">{t('play.pause')}</span>
            </Button>
          )}
          <Button
            data-testid="play-finish"
            variant={finishProminent ? 'success' : 'secondary'}
            size="sm"
            className={cx('flex-1 sm:flex-none', finishProminent && 'animate-pulse motion-reduce:animate-none')}
            disabled={busy !== null && busy !== 'replay'}
            onClick={() => (finishProminent ? void finish() : setConfirmFinish(true))}
          >
            {finishProminent ? `🏁 ${t('play.finishAndSee')}` : t('play.finishNow')}
          </Button>
        </div>
      </div>

      {session.quotaWarning && <Alert tone="warn">⚠️ {t('play.quotaWarning')}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* conversation column */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-wrap items-center gap-4">
            <Avatar avatar={mission.npc.avatar} size={72} speaking={speaking} label={mission.npc.name} />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold">{mission.npc.name}</div>
              <div className="text-sm text-muted" lang="en">
                {mission.npc.role}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {t('play.stage')} {Math.min(session.stageIndex + 1, session.stageCount)}: <span lang="en">{stageTitle}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void replay('replay')} disabled={!latestNpc || busy !== null || (Boolean(heardLatest) && remainingReplays === 0) || paused}>
                🔊 {heardLatest ? t('play.replay', { count: remainingReplays }) : t('play.listen')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void replay('repeat_request')} disabled={!latestNpc || busy !== null || remainingReplays === 0 || session.status !== 'active'}>
                🙋 {t('play.repeat')}
              </Button>
            </div>
          </Card>

          <Card className="flex min-h-[320px] flex-col p-0 sm:p-0">
            <ol className="flex max-h-[55vh] min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label={t('play.transcript')}>
              {turns.map((tn) => {
                const isLatestNpc = latestNpc?.id === tn.id;
                if (tn.speaker === 'system') {
                  return (
                    <li key={tn.id} className="mx-auto max-w-[90%] rounded-xl bg-warn-soft px-3 py-2 text-center text-sm text-warn" lang="en">
                      💡 {tn.text}
                    </li>
                  );
                }
                const npc = tn.speaker === 'npc';
                return (
                  <li key={tn.id} className={cx('flex items-end gap-2', npc ? 'justify-start' : 'justify-end')}>
                    {npc && <Avatar avatar={mission.npc.avatar} size={32} label={mission.npc.name} />}
                    <div
                      data-testid={isLatestNpc ? 'play-npc-line' : undefined}
                      lang="en"
                      className={cx(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap sm:max-w-[75%]',
                        npc ? 'rounded-bl-md bg-surface-2' : 'rounded-br-md bg-primary text-primary-fg',
                        isLatestNpc && 'ring-2 ring-primary/60',
                      )}
                    >
                      {tn.text}
                      {!npc && (
                        <span className="mt-1 block text-[11px] opacity-75">{tn.mode === 'voice' ? `🎙️ ${t('play.voiceTurn')}` : `⌨️ ${t('play.textTurn')}`}</span>
                      )}
                    </div>
                  </li>
                );
              })}
              {busy === 'turn' && (
                <li className="flex items-center gap-2 text-sm text-muted">
                  <Spinner className="h-4 w-4" /> {pending?.kind === 'voice' ? t('play.processingVoice') : t('play.npcThinking', { name: mission.npc.name })}
                </li>
              )}
              <div ref={transcriptEnd} />
            </ol>

            <div className="space-y-3 border-t border-line p-4">
              {notice && (
                <Alert tone={notice.tone} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{notice.message}</span>
                  {notice.retry && pending && (
                    <Button size="sm" variant="secondary" onClick={() => void submit(pending)} disabled={busy !== null}>
                      {t('common.retry')}
                    </Button>
                  )}
                </Alert>
              )}
              {finishProminent && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-success">
                  <span className="font-semibold">{ready ? t('play.readyBanner') : timeUp ? t('play.timeUpBanner') : t('play.turnsUpBanner')}</span>
                  <Button variant="success" onClick={() => void finish()} disabled={busy !== null}>
                    🏁 {t('play.seeResults')}
                  </Button>
                </div>
              )}

              {!finishProminent && (
                <div className="flex flex-col items-center gap-3">
                  {recordingSupported() ? (
                    <MicButton
                      maxSeconds={session.maxRecordSeconds}
                      disabled={!canTalk}
                      processing={busy === 'turn' && pending?.kind === 'voice'}
                      beforeStart={() => {
                        setNotice(null);
                        setMicProblem(null);
                        stopNpcAudio();
                        if (!hasConsent) {
                          setConsentOpen(true);
                          return false;
                        }
                        return true;
                      }}
                      onRecorded={onRecorded}
                      onMicError={onMicError}
                    />
                  ) : (
                    <Alert tone="warn">{t('play.micUnsupported')}</Alert>
                  )}
                  {micProblem && <Alert tone="warn">{micProblem}</Alert>}
                </div>
              )}

              <form onSubmit={sendText} className="flex gap-2">
                <label htmlFor="play-text" className="sr-only">
                  {t('play.typeLabel')}
                </label>
                <input
                  id="play-text"
                  data-testid="play-text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={600}
                  autoComplete="off"
                  lang="en"
                  disabled={!canTalk && busy !== 'turn'}
                  readOnly={busy === 'turn'}
                  placeholder={t('play.typePlaceholder')}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-50"
                />
                <Button data-testid="play-text-send" type="submit" variant="secondary" disabled={!canTalk || !text.trim()}>
                  {t('play.send')}
                </Button>
              </form>
              <p className="text-xs text-muted">ⓘ {t('play.textNote')}</p>
            </div>
          </Card>
        </div>

        {/* progress column */}
        <aside className="space-y-4">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-4 font-semibold lg:hidden"
            aria-expanded={panelOpen}
            aria-controls="play-panel"
            onClick={() => setPanelOpen((v) => !v)}
          >
            <span>
              {t('play.progressAndCard')}{' '}
              <span className="text-sm font-normal text-muted">
                ({session.objectives.filter((o) => o.met).length}/{session.objectives.length})
              </span>
            </span>
            <span aria-hidden="true">{panelOpen ? '▴' : '▾'}</span>
          </button>
          <div id="play-panel" className={cx('space-y-4', panelOpen ? 'block' : 'hidden lg:block')}>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{t('play.objectives')}</h2>
                <Badge tone="primary">
                  {session.objectives.filter((o) => o.met).length}/{session.objectives.length}
                </Badge>
              </div>
              <ProgressBar value={session.objectives.filter((o) => o.met).length} max={session.objectives.length} label={t('play.objectives')} tone="success" />
              <ol className="mt-3 space-y-3">
                {Array.from({ length: session.stageCount }, (_, si) => {
                  const objs = session.objectives.filter((o) => o.stageIndex === si);
                  const current = si === session.stageIndex && !ready;
                  const stage = mission.stages[si];
                  return (
                    <li key={si} className={cx('rounded-xl p-2', current && 'bg-primary-soft/60')}>
                      <div className={cx('text-xs font-semibold tracking-wide uppercase', current ? 'text-primary' : 'text-muted')}>
                        {t('mission.stageN', { n: si + 1 })}
                        {stage ? <span lang="en"> · {stage.title}</span> : null}
                      </div>
                      <ul className="mt-1 space-y-1">
                        {objs.map((o) => (
                          <li key={o.id} data-testid={`play-objective-${o.id}`} data-met={o.met ? 'true' : 'false'} className={cx('flex items-start gap-2 text-sm', o.met ? 'text-success' : si > session.stageIndex ? 'text-muted' : 'text-fg')}>
                            <span aria-hidden="true" className={cx('mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border text-[10px]', o.met ? 'border-success bg-success text-white' : 'border-line')}>
                              {o.met ? '✓' : ''}
                            </span>
                            <span>
                              {L(o.label)}
                              {!o.required && <span className="ml-1 text-xs text-muted">({t('mission.optional')})</span>}
                              <span className="sr-only"> – {o.met ? t('play.met') : t('play.notMet')}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{t('play.hints')}</h2>
                <Button size="sm" variant="secondary" onClick={() => void hint()} disabled={busy !== null || remainingHints === 0 || session.status !== 'active'}>
                  💡 {t('play.getHint', { count: remainingHints })}
                </Button>
              </div>
              {lastHint ? (
                <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" lang="en">
                  {lastHint}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted">{t('play.hintNote')}</p>
              )}
            </Card>

            <StudentCard mission={mission} compact />
          </div>
        </aside>
      </div>

      {/* paused overlay */}
      <Modal open={paused} onClose={() => undefined} dismissable={false} title={t('play.pausedTitle')} size="sm" footer={<Button onClick={() => void setPausedState(false)} loading={busy === 'pause'}>▶ {t('play.resume')}</Button>}>
        <p className="text-sm">{t('play.pausedBody')}</p>
      </Modal>

      {/* assessing overlay */}
      <Modal open={busy === 'complete'} onClose={() => undefined} dismissable={false} title={t('play.assessingTitle')} size="sm">
        <div className="flex items-center gap-3 text-sm" role="status">
          <Spinner /> {t('play.assessingBody')}
        </div>
      </Modal>

      <ConfirmModal open={confirmFinish} onClose={() => setConfirmFinish(false)} onConfirm={() => void finish()} title={t('play.finishConfirmTitle')} confirmLabel={t('play.finishNow')}>
        <p>{t('play.finishConfirmBody')}</p>
      </ConfirmModal>

      <ConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} onAgree={() => void agreeConsent()} loading={consentSaving} />
    </div>
  );
}
