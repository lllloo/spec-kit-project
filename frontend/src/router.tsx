import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage';
import { LoginPage } from './routes/auth/LoginPage';
import { RegisterPage } from './routes/auth/RegisterPage';
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage';
import { VerifyEmailPage } from './routes/auth/VerifyEmailPage';
import { DashboardPage } from './routes/protected/DashboardPage';
import { PasswordPage } from './routes/protected/PasswordPage';
import { ProfilePage } from './routes/protected/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // 公開頁
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  // _protected：需登入
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/password', element: <PasswordPage /> },
    ],
  },
  // 404
  { path: '*', element: <PlaceholderPage title="404" hint="找不到頁面" /> },
]);

function PlaceholderPage({ title, hint }: { title: string; hint: string }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{hint}</p>
      </div>
    </main>
  );
}
