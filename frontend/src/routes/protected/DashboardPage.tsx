import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { sessionQueryKey, useSession } from '../../lib/auth';
import { Button } from '../../components/ui/Button';

export function DashboardPage() {
  const { data: member } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: () => api<void>('POST', '/api/v1/auth/logout'),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: sessionQueryKey });
      navigate('/login', { replace: true });
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">會員首頁</h1>
          <Button
            variant="secondary"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? '登出中…' : '登出'}
          </Button>
        </header>

        <section className="rounded-lg bg-white p-6 shadow">
          <p className="text-gray-700">
            歡迎，<span className="font-semibold">{member?.display_name ?? member?.email}</span>
          </p>
          {member && (
            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600">
              <div>
                <dt className="inline font-medium">Email：</dt>
                <dd className="inline">{member.email}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Email 驗證狀態：</dt>
                <dd className="inline">{member.email_verified_at ? '已驗證' : '未驗證'}</dd>
              </div>
            </dl>
          )}
          <nav className="mt-6 flex gap-4 text-sm">
            <Link to="/profile" className="text-indigo-600 hover:text-indigo-500">
              個人資料
            </Link>
            <Link to="/password" className="text-indigo-600 hover:text-indigo-500">
              變更密碼
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
