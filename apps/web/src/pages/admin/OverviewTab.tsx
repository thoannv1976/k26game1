import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BUILTIN_MISSIONS } from '@ecs/shared';
import { api } from '../../api/client';
import type { OverviewReport } from '../../api/types';
import { useLocalized } from '../../i18n';
import { Card, EmptyState, ErrorBox, PageSkeleton, SectionTitle, StatCard, Table } from '../../components/ui';

export function OverviewTab() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const q = useQuery({ queryKey: ['admin-overview'], queryFn: () => api.get<OverviewReport>('/api/admin/reports/overview') });
  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const rows = Object.entries(d.byMission).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('admin.overview.users')} value={d.users} />
        <StatCard label={t('admin.overview.sessions')} value={d.sessions} />
        <StatCard label={t('admin.overview.assessments')} value={d.recentAssessments} hint={t('admin.overview.recentHint')} />
        <StatCard label={t('admin.overview.reviewed')} value={d.reviewed} hint={d.recentAssessments ? `${Math.round((d.reviewed / d.recentAssessments) * 100)}%` : undefined} />
      </div>
      <Card>
        <SectionTitle>{t('admin.overview.byMission')}</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState icon="📊" title={t('teacher.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('teacher.mission')}</th>
                <th>{t('admin.overview.sessions')}</th>
                <th>{t('teacher.completed')}</th>
                <th>{t('teacher.average')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, v]) => (
                <tr key={id}>
                  <td>
                    <span className="font-semibold">{id}</span> {L(BUILTIN_MISSIONS.find((m) => m.id === id)?.title)}
                  </td>
                  <td className="tabular-nums">{v.sessions}</td>
                  <td className="tabular-nums">
                    {v.completed} ({v.sessions ? Math.round((v.completed / v.sessions) * 100) : 0}%)
                  </td>
                  <td className="tabular-nums">{Math.round(v.avgPercent)}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
