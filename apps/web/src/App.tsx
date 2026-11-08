import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageSkeleton } from './components/ui';
import { HomeRedirect, RequireAuth, RequireRole } from './auth/guards';
import { LoginPage } from './pages/LoginPage';
import { LtiLaunchPage } from './pages/LtiLaunchPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { CityPage } from './pages/CityPage';
import { MissionPage } from './pages/MissionPage';
import { PlayPage } from './pages/PlayPage';
import { ResultsPage } from './pages/ResultsPage';

const TeacherHome = lazy(() => import('./pages/teacher/TeacherHome'));
const ClassPage = lazy(() => import('./pages/teacher/ClassPage'));
const TeacherStudentPage = lazy(() => import('./pages/teacher/StudentPage'));
const SessionReviewPage = lazy(() => import('./pages/teacher/SessionReviewPage'));
const TeacherMissionsPage = lazy(() => import('./pages/teacher/TeacherMissionsPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const PlatformPage = lazy(() => import('./pages/platform/PlatformPage'));

const MEMBERS = ['student', 'teacher', 'school_admin'] as const;
const STAFF = ['teacher', 'school_admin'] as const;

export function App() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl p-6"><PageSkeleton /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/lti-launch" element={<LtiLaunchPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route element={<RequireRole roles={[...MEMBERS]} />}>
              <Route path="student" element={<StudentDashboard />} />
              <Route path="city" element={<CityPage />} />
              <Route path="missions/:id" element={<MissionPage />} />
              <Route path="play/:sessionId" element={<PlayPage />} />
              <Route path="results/:sessionId" element={<ResultsPage />} />
            </Route>
            <Route element={<RequireRole roles={[...STAFF]} />}>
              <Route path="teacher" element={<TeacherHome />} />
              <Route path="teacher/classes/:id" element={<ClassPage />} />
              <Route path="teacher/students/:uid" element={<TeacherStudentPage />} />
              <Route path="teacher/sessions/:id" element={<SessionReviewPage />} />
              <Route path="teacher/missions" element={<TeacherMissionsPage />} />
            </Route>
            <Route element={<RequireRole roles={['school_admin']} />}>
              <Route path="admin" element={<Navigate to="/admin/overview" replace />} />
              <Route path="admin/:tab" element={<AdminPage />} />
            </Route>
            <Route element={<RequireRole roles={['platform_admin']} />}>
              <Route path="platform" element={<PlatformPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
