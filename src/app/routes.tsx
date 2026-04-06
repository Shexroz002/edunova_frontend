import { Navigate, Outlet, createBrowserRouter } from 'react-router';
import { ThemeProvider } from './components/ThemeContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { getDefaultRouteForRole, getStoredAuthSession, getStoredUserRole } from './lib/auth';
import { DashboardPage } from './pages/teacher/DashboardPage.tsx';
import { StudentsPage } from './pages/teacher/StudentsPage.tsx';
import { StudentProfilePage as TeacherStudentProfilePage } from './pages/teacher/StudentProfilePage.tsx';
import { ClassesPage } from './pages/teacher/ClassesPage.tsx';
import { ClassDetailPage } from './pages/teacher/ClassDetailPage.tsx';
import { ClassMembersPage } from './pages/teacher/ClassMembersPage.tsx';
import { QuizzesPage } from './pages/teacher/QuizzesPage.tsx';
import { QuizDetailPage } from './pages/teacher/QuizDetailPage.tsx';
import { QuizQuestionEditPage } from './pages/teacher/QuizQuestionEditPage.tsx';
import { LivePage } from './pages/teacher/LivePage.tsx';
import { ActiveSessionPage } from './pages/teacher/ActiveSessionPage.tsx';
import { SessionResultPage } from './pages/teacher/SessionResultPage.tsx';
import { WaitingRoomPage } from './pages/teacher/WaitingRoomPage.tsx';
import { AnalyticsPage } from './pages/teacher/AnalyticsPage.tsx';
import { StudentAnalyticsPage } from './pages/teacher/StudentAnalyticsPage.tsx';
import { LeaderboardPage } from './pages/teacher/LeaderboardPage.tsx';
import { SettingsPage } from './pages/teacher/SettingsPage.tsx';
import { LoginPage } from './pages/common/LoginPage.tsx';
import { RegisterPage } from './pages/common/RegisterPage.tsx';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { StudentTestsPage } from './pages/student/StudentTestsPage';
import { StudentFriendsPage } from './pages/student/StudentFriendsPage';
import { StudentStatisticsPage } from './pages/student/StudentStatisticsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { StudentResultsPage } from './pages/student/StudentResultsPage';
import { StudentQuizDetailPage } from './pages/student/StudentQuizDetailPage';
import { StudentCompetitionPage } from './pages/student/StudentCompetitionPage';
import { StudentWaitingRoomPage } from './pages/student/StudentWaitingRoomPage';
import { StudentTestTakingPage } from './pages/student/StudentTestTakingPage';
import { StudentTestResultsPage } from './pages/student/StudentTestResultsPage';
import { StudentErrorAnalysisPage } from './pages/student/StudentErrorAnalysisPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { StudentProfileEditPage } from './pages/student/StudentProfileEditPage';
import { StudentGroupsPage } from './pages/student/StudentGroupsPage';
import { StudentGroupDetailPage } from './pages/student/StudentGroupDetailPage';

function ThemedLayout() {
  return (
      <ThemeProvider>
        <DashboardLayout />
      </ThemeProvider>
  );
}

function ThemedLogin() {
  return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
  );
}

function ThemedRegister() {
  return (
      <ThemeProvider>
        <RegisterPage />
      </ThemeProvider>
  );
}

function ThemedStudentLayout() {
  return (
      <ThemeProvider>
        <StudentLayout />
      </ThemeProvider>
  );
}

function PublicOnlyRoute() {
  const session = getStoredAuthSession();
  const role = getStoredUserRole();

  if (session?.access_token && role) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <Outlet />;
}

function RequireRoleRoute({ allowedRole }: { allowedRole: 'teacher' | 'schoolboy' }) {
  const session = getStoredAuthSession();
  const currentRole = getStoredUserRole();

  if (!session?.access_token) {
    return <Navigate to="/login" replace />;
  }

  if (!currentRole) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== allowedRole) {
    return <Navigate to={getDefaultRouteForRole(currentRole)} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    Component: PublicOnlyRoute,
    children: [
      {
        path: '/login',
        Component: ThemedLogin,
      },
      {
        path: '/register',
        Component: ThemedRegister,
      },
    ],
  },
  {
    Component: () => <RequireRoleRoute allowedRole="schoolboy" />,
    children: [
      {
        path: '/student',
        Component: ThemedStudentLayout,
        children: [
          { index: true, Component: StudentHomePage },
          { path: 'tests', Component: StudentTestsPage },
          { path: 'tests/:id', Component: StudentQuizDetailPage },
          { path: 'group', Component: StudentGroupsPage },
          { path: 'group/:id', Component: StudentGroupDetailPage },
          { path: 'friends', Component: StudentFriendsPage },
          { path: 'competition', Component: StudentCompetitionPage },
          { path: 'statistics', Component: StudentStatisticsPage },
          { path: 'profile', Component: StudentProfilePage },
          { path: 'edit-profile', Component: StudentProfileEditPage },
          { path: 'results', Component: StudentResultsPage },
          { path: 'waiting-room', Component: StudentWaitingRoomPage },
          { path: 'test-taking/:id', Component: StudentTestTakingPage },
          { path: 'test-results/:id', Component: StudentTestResultsPage },
          { path: 'error-analysis/:id', Component: StudentErrorAnalysisPage },
          { path: 'notifications', Component: StudentNotificationsPage },
        ],
      },
    ],
  },
  {
    Component: () => <RequireRoleRoute allowedRole="teacher" />,
    children: [
      {
        path: '/',
        Component: ThemedLayout,
        children: [
          { index: true, Component: DashboardPage },
          { path: 'students',     Component: StudentsPage },
          { path: 'students/:id', Component: TeacherStudentProfilePage },
          { path: 'classes',      Component: ClassesPage },
          { path: 'classes/:id',  Component: ClassDetailPage },
          { path: 'classes/:id/members', Component: ClassMembersPage },
          { path: 'quizzes',      Component: QuizzesPage },
          { path: 'quizzes/:id',  Component: QuizDetailPage },
          { path: 'quizzes/:quizId/questions/:qnum/edit',     Component: QuizQuestionEditPage },
          { path: 'live',                Component: LivePage },
          { path: 'live/session',        Component: ActiveSessionPage },
          { path: 'live/waiting-room',   Component: WaitingRoomPage },
          { path: 'live/results/:id',    Component: SessionResultPage },
          { path: 'analytics',    Component: AnalyticsPage },
          { path: 'student-analytics', Component: StudentAnalyticsPage },
          { path: 'leaderboard',  Component: LeaderboardPage },
          { path: 'settings',     Component: SettingsPage },
        ],
      },
    ],
  },
]);
