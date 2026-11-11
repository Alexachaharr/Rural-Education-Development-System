import { Navigate, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import SubjectPage from './pages/Subject';
import Quizzes from './pages/Quizzes';
import QuizTake from './pages/QuizTake';
import QuizCreate from './pages/QuizCreate';
import Attendance from './pages/Attendance';
import Opportunities from './pages/Opportunities';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:subjectId" element={<SubjectPage />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quizzes/new" element={<QuizCreate />} />
        <Route path="quizzes/:id" element={<QuizTake />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
