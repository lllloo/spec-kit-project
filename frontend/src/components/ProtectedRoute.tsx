import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../lib/auth';

/**
 * FR-011：未登入即攔截 → 導向 /login?redirectTo={pathname}
 * 登入後元件由各 route 端讀 ?redirectTo 自行返回原頁。
 */
export function ProtectedRoute() {
  const { data: member, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">載入中…</div>
    );
  }

  if (!member) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />;
  }

  return <Outlet />;
}
