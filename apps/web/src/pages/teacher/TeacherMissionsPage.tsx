import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { PageHeader } from '../../components/ui';
import { MissionsTab } from '../admin/MissionsTab';

export default function TeacherMissionsPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  return (
    <div>
      <PageHeader title={t('admin.missions.title')} subtitle={t('admin.missions.subtitle')} />
      <MissionsTab canAdmin={role === 'school_admin'} />
    </div>
  );
}
