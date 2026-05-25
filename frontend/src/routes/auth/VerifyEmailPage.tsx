import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { api, ApiError } from '../../lib/api';
import { Alert } from '../../components/ui/Alert';
import { AuthLayout } from './RegisterPage';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  // 以 useQuery 自動執行一次驗證，而非「useEffect + ref-guard + useMutation」：
  // 後者在 React StrictMode（dev 雙重 mount）下，觸發請求的 observer 會與顯示 UI 的
  // observer 不一致，導致結果無處反映、UI 永久停在 pending。useQuery 以 queryKey
  // 去重、狀態綁定 query cache，StrictMode 安全。token 僅消費一次，故關閉重試與重抓。
  const { isLoading, isSuccess, isError, data, error } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => api<{ message: string }>('POST', '/api/v1/auth/email/verify', { token }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <AuthLayout title="驗證 Email">
      {!token && <Alert tone="error">驗證連結缺少 token 參數</Alert>}

      {token && isLoading && <Alert tone="info">驗證中…</Alert>}

      {isSuccess && (
        <Alert tone="success">
          {data?.message ?? 'Email 驗證完成'}
          <p className="mt-2">
            <Link to="/login" className="font-medium text-indigo-700 hover:text-indigo-600">
              前往登入
            </Link>
          </p>
        </Alert>
      )}

      {isError && (
        <Alert tone="error">
          {error instanceof ApiError ? error.body.message : '驗證失敗'}
          <p className="mt-2 text-sm text-gray-700">如果連結已過期，請於登入頁要求重新寄送驗證信。</p>
        </Alert>
      )}
    </AuthLayout>
  );
}
