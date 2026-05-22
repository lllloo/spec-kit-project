import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './routes/auth/LoginPage';
import { RegisterPage } from './routes/auth/RegisterPage';
import { VerifyEmailPage } from './routes/auth/VerifyEmailPage';
import { DashboardPage } from './routes/protected/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // 公開頁
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  // P3 placeholders（US3 將實作）
  { path: '/forgot-password', element: <PlaceholderPage title="忘記密碼" hint="US3 將實作" /> },
  { path: '/reset-password', element: <PlaceholderPage title="重設密碼" hint="US3 將實作" /> },
  // _protected：需登入
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/profile', element: <PlaceholderPage title="個人資料" hint="US2 將實作" /> },
      { path: '/password', element: <PlaceholderPage title="變更密碼" hint="US3 將實作" /> },
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
