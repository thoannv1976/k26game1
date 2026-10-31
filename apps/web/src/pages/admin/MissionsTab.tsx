import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLocation } from '@ecs/shared';
import { api } from '../../api/client';
import type { AdminMissionDetail, AdminMissionRow, MissionVersion } from '../../api/types';
import { useLocalized } from '../../i18n';
import { errorMessage, validationIssues } from '../../i18n/errors';
import { formatDate } from '../../lib/format';
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, ErrorBox, Field, Input, LevelBadge, Modal, PageSkeleton, Skeleton, Table, Textarea, cx } from '../../components/ui';
import { useToast } from '../../components/Toast';

const STATUS_TONE = { approved: 'success', draft: 'warn', archived: 'neutral', superseded: 'neutral' } as const;

export function MissionsTab({ canAdmin }: { canAdmin: boolean }) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const q = useQuery({ queryKey: ['admin-missions'], queryFn: () => api.get<{ missions: AdminMissionRow[] }>('/api/admin/missions') });
  const seed = useMutation({
    mutationFn: () => api.post<{ created: number }>('/api/admin/missions/seed'),
    onSuccess: (r) => {
      setConfirmSeed(false);
      toast.success(t('admin.missions.seeded', { count: r.created }));
      void qc.invalidateQueries({ queryKey: ['admin-missions'] });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const rows = q.data.missions;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">{t('admin.missions.help')}</p>
        {canAdmin && (
          <Button variant="secondary" onClick={() => setConfirmSeed(true)}>
            🌱 {t('admin.missions.seed')}
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="🗂️" title={t('admin.missions.empty')}>
          {canAdmin ? t('admin.missions.emptyAdmin') : t('admin.missions.emptyTeacher')}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('admin.missions.titleCol')}</th>
              <th>{t('admin.missions.location')}</th>
              <th>{t('student.level')}</th>
              <th>{t('teacher.status')}</th>
              <th>{t('admin.missions.versions')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const loc = getLocation(m.locationId);
              return (
                <tr key={m.id}>
                  <td className="font-mono font-semibold">{m.id}</td>
                  <td>{m.title ? L(m.title) : <span className="text-muted">{t('admin.missions.noApproved')}</span>}</td>
                  <td>{loc ? L(loc.name) : m.locationId}</td>
                  <td>
                    <LevelBadge level={m.level} />
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[m.status]}>{t(`admin.missions.status.${m.status}`)}</Badge>
                    {m.pendingApproval && (
                      <Badge tone="warn" className="ml-1">
                        {t('admin.missions.pending')}
                      </Badge>
                    )}
                  </td>
                  <td className="text-xs tabular-nums">
                    {t('admin.missions.approvedV', { v: m.approvedVersion || '—' })} · {t('admin.missions.latestV', { v: m.latestVersion })}
                  </td>
                  <td className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setOpen(m.id)}>
                      {t('common.open')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {open && <MissionEditor id={open} canAdmin={canAdmin} onClose={() => setOpen(null)} />}
      <ConfirmModal open={confirmSeed} onClose={() => setConfirmSeed(false)} onConfirm={() => seed.mutate()} title={t('admin.missions.seed')} confirmLabel={t('admin.missions.seed')} loading={seed.isPending}>
        <p>{t('admin.missions.seedBody')}</p>
      </ConfirmModal>
    </Card>
  );
}

function MissionEditor({ id, canAdmin, onClose }: { id: string; canAdmin: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { lang } = useLocalized();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin-mission', id], queryFn: () => api.get<AdminMissionDetail>(`/api/admin/missions/${id}`) });
  const [json, setJson] = useState('');
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const loadVersion = (v: MissionVersion) => {
    setJson(JSON.stringify(v.content, null, 2));
    setLoadedVersion(v.version);
    setParseError(null);
  };

  useEffect(() => {
    if (q.data && loadedVersion === null && q.data.versions[0]) loadVersion(q.data.versions[0]);
  }, [q.data, loadedVersion]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-mission', id] });
    void qc.invalidateQueries({ queryKey: ['admin-missions'] });
    void qc.invalidateQueries({ queryKey: ['missions'] });
  };

  const save = useMutation({
    mutationFn: (content: unknown) => api.put<{ version: number }>(`/api/admin/missions/${id}`, { content, note }),
    onSuccess: (r) => {
      toast.success(t('admin.missions.savedDraft', { v: r.version }));
      setNote('');
      setLoadedVersion(r.version);
      invalidate();
    },
  });
  const approve = useMutation({
    mutationFn: (version: number) => api.post<{ approvedVersion: number }>(`/api/admin/missions/${id}/approve`, { version }),
    onSuccess: (r) => {
      toast.success(t('admin.missions.approved', { v: r.approvedVersion }));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const archive = useMutation({
    mutationFn: (archived: boolean) => api.post<{ status: string }>(`/api/admin/missions/${id}/archive`, { archived }),
    onSuccess: () => {
      toast.success(t('common.saved'));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const onSave = () => {
    setParseError(null);
    let content: unknown;
    try {
      content = JSON.parse(json);
    } catch (e) {
      setParseError((e as Error).message);
      return;
    }
    save.mutate(content);
  };

  const format = () => {
    try {
      setJson(JSON.stringify(JSON.parse(json), null, 2));
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const issues = validationIssues(save.error);
  const doc = q.data?.mission;

  return (
    <Modal open onClose={onClose} title={`${t('admin.missions.mission')} ${id}`} size="xl">
      {q.isPending ? (
        <Skeleton className="h-96" />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[doc!.status]}>{t(`admin.missions.status.${doc!.status}`)}</Badge>
              <span className="text-xs text-muted">{t('admin.missions.approvedV', { v: doc!.approvedVersion || '—' })}</span>
            </div>
            {canAdmin && (
              <Button size="sm" variant="secondary" onClick={() => archive.mutate(doc!.status !== 'archived')} loading={archive.isPending}>
                {doc!.status === 'archived' ? t('admin.missions.unarchive') : t('admin.missions.archive')}
              </Button>
            )}
            <h3 className="pt-2 text-sm font-semibold">{t('admin.missions.versions')}</h3>
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {q.data.versions.map((v) => (
                <li key={v.version} className={cx('rounded-xl border p-3 text-sm', loadedVersion === v.version ? 'border-primary bg-primary-soft/40' : 'border-line')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">v{v.version}</span>
                    <Badge tone={STATUS_TONE[v.status]}>{t(`admin.missions.status.${v.status}`)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDate(v.createdAt, lang, true)} · {v.createdBy}
                  </div>
                  {v.note && <div className="mt-1 text-xs">{v.note}</div>}
                  {v.approvedAt && <div className="mt-1 text-xs text-success">✓ {formatDate(v.approvedAt, lang, true)}</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => loadVersion(v)}>
                      {t('admin.missions.load')}
                    </Button>
                    {v.status !== 'approved' && (
                      <Button size="sm" variant="success" onClick={() => approve.mutate(v.version)} loading={approve.isPending && approve.variables === v.version}>
                        ✓ {t('admin.missions.approve')}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{loadedVersion ? t('admin.missions.editingFrom', { v: loadedVersion }) : t('admin.missions.editor')}</h3>
              <Button size="sm" variant="ghost" onClick={format}>
                {t('admin.missions.format')}
              </Button>
            </div>
            <Textarea aria-label={t('admin.missions.editor')} className="min-h-[50vh] font-mono text-xs leading-relaxed" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} />
            {parseError && <Alert tone="danger">{t('admin.missions.jsonError', { message: parseError })}</Alert>}
            {save.isError && (
              <Alert tone="danger">
                <div className="font-semibold">{errorMessage(t, save.error)}</div>
                {issues.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 font-mono text-xs">
                    {issues.map((i, n) => (
                      <li key={n}>
                        {i.path || '(root)'}: {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </Alert>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t('admin.missions.note')} className="min-w-48 flex-1">
                {(fid) => <Input id={fid} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />}
              </Field>
              <Button onClick={onSave} loading={save.isPending} disabled={!json.trim()}>
                {t('admin.missions.saveDraft')}
              </Button>
            </div>
            <p className="text-xs text-muted">{t('admin.missions.saveNote')}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
