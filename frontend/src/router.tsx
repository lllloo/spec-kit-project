import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';

/**
 * 預留 (auth) 與 _protected route groups；
 * Phase 3+ (US1/US2/US3) 會把 register / login / dashboard / profile / password 等 route 補進來。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // (auth) — 公開頁
  {
    path: '/login',
    element: <PlaceholderPage title="登入" hint="US1 將實作 LoginForm" />,
  },
  {
    path: '/register',
    element: <PlaceholderPage title="註冊" hint="US1 將實作 RegisterForm" />,
  },
  {
    path: '/verify-email',
    element: <PlaceholderPage title="驗證 Email" hint="US1 將實作 verify-email 流程" />,
  },
  {
    path: '/forgot-password',
    element: <PlaceholderPage title="忘記密碼" hint="US3 將實作 ForgotPasswordForm" />,
  },
  {
    path: '/reset-password',
    element: <PlaceholderPage title="重設密碼" hint="US3 將實作 ResetPasswordForm" />,
  },
  // _protected — 需登入
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <PlaceholderPage title="會員首頁" hint="US1 將實作 dashboard" />,
      },
      {
        path: '/profile',
        element: <PlaceholderPage title="個人資料" hint="US2 將實作 ProfileForm + AvatarUploader" />,
      },
      {
        path: '/password',
        element: <PlaceholderPage title="變更密碼" hint="US3 將實作 ChangePasswordForm" />,
      },
    ],
  },
  // 404
  {
    path: '*',
    element: <PlaceholderPage title="404" hint="找不到頁面" />,
  },
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
