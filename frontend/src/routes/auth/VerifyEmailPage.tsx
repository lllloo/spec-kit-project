import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, ApiError } from '../../lib/api';
import { Alert } from '../../components/ui/Alert';
import { AuthLayout } from './RegisterPage';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const fired = useRef(false);

  const mutation = useMutation({
    mutationFn: () => api<{ message: string }>('POST', '/api/v1/auth/email/verify', { token }),
  });

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      mutation.mutate();
    }
  }, [token, mutation]);

  return (
    <AuthLayout title="驗證 Email">
      {!token && <Alert tone="error">驗證連結缺少 token 參數</Alert>}

      {mutation.isPending && <Alert tone="info">驗證中…</Alert>}

      {mutation.isSuccess && (
        <Alert tone="success">
          {mutation.data?.message ?? 'Email 驗證完成'}
          <p className="mt-2">
            <Link to="/login" className="font-medium text-indigo-700 hover:text-indigo-600">
              前往登入
            </Link>
          </p>
        </Alert>
      )}

      {mutation.isError && (
        <Alert tone="error">
          {mutation.error instanceof ApiError ? mutation.error.body.message : '驗證失敗'}
          <p className="mt-2 text-sm text-gray-700">如果連結已過期，請於登入頁要求重新寄送驗證信。</p>
        </Alert>
      )}
    </AuthLayout>
  );
}
