import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ChangePasswordForm } from '../../components/forms/ChangePasswordForm';
import { sessionQueryKey } from '../../lib/auth';

/**
 * US3：變更密碼頁。
 * 變更成功後，後端會廢除其他 session（本端 session 不受影響）。
 * 為符合 spec「以新密碼重新登入」的心智模型，前端主動把 session 失效並導回 /login。
 */
export function PasswordPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function handleSuccess() {
    // 主動把 session 標為失效，導回 login 以新密碼登入
    await qc.invalidateQueries({ queryKey: sessionQueryKey });
    navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">變更密碼</h1>
          <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← 回 dashboard
          </Link>
        </header>

        <section className="rounded-lg bg-white p-6 shadow">
          <ChangePasswordForm onSuccess={handleSuccess} />
        </section>
      </div>
    </main>
  );
}
