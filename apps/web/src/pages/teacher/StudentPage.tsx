import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENTS } from '@ecs/shared';
import { api } from '../../api/client';
import type { TeacherStudentDetail } from '../../api/types';
import { useLocalized } from '../../i18n';
import { formatDate } from '../../lib/format';
import { Badge, ButtonLink, Card, EmptyState, ErrorBox, LevelBadge, PageHeader, PageSkeleton, SectionTitle, StatCard, Table } from '../../components/ui';

export default function StudentPage() {
  const { uid = '' } = useParams();
  const { t } = useTranslation();
  const { lang } = useLocalized();
  const q = useQuery({ queryKey: ['teacher-student', uid], queryFn: () => api.get<TeacherStudentDetail>(`/api/teacher/students/${uid}`) });
  if (q.isPending) return <PageSkeleton />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  const { student: s, sessions } = q.data;
  const scored = sessions.filter((x) => x.percent !== null);
  return (
    <div className="space-y-6">
      <ButtonLink to="/teacher" variant="ghost" size="sm" className="-ml-3">
        ← {t('teacher.title')}
      </ButtonLink>
      <PageHeader title={s.displayName} subtitle={`${s.studentCode ? `${s.studentCode} · ` : ''}${s.email}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('student.level')} value={<LevelBadge level={s.level} />} />
        <StatCard label="XP" value={s.xp} />
        <StatCard label={t('teacher.average')} value={scored.length ? `${Math.round(scored.reduce((n, x) => n + (x.percent ?? 0), 0) / scored.length)}%` : '—'} hint={t('student.sessionsPlayed', { count: sessions.length })} />
      </div>
      {s.achievements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {s.achievements.map((a) => (
            <Badge key={a} tone="warn">
              🏅 {ACHIEVEMENTS[a]?.[lang] ?? a}
            </Badge>
          ))}
        </div>
      )}
      <Card>
        <SectionTitle>{t('teacher.sessions')}</SectionTitle>
        {sessions.length === 0 ? (
          <EmptyState icon="🎧" title={t('teacher.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('teacher.date')}</th>
                <th>{t('teacher.mission')}</th>
                <th>{t('teacher.status')}</th>
                <th>{t('play.turns')}</th>
                <th>{t('teacher.final')}</th>
                <th>{t('teacher.review')}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((x) => (
                <tr key={x.id}>
                  <td className="text-xs whitespace-nowrap">{formatDate(x.startedAt, lang, true)}</td>
                  <td>{x.missionId}</td>
                  <td>{t(`sessionStatus.${x.status}`)}</td>
                  <td className="tabular-nums">
                    {x.studentTurns} <span className="text-xs text-muted">({t('teacher.voiceCount', { count: x.voiceTurns })})</span>
                  </td>
                  <td className="font-semibold tabular-nums">{x.percent === null ? '—' : `${x.percent}%`}</td>
                  <td>
                    {x.status === 'completed' ? (
                      <Link to={`/teacher/sessions/${x.id}`} className="font-semibold text-primary hover:underline">
                        {x.reviewed ? `✓ ${t('teacher.reviewed')}` : t('teacher.toReview')}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
