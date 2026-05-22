import { Link, useNavigate, useSearchParams } from 'react-router';
import { ResetPasswordForm } from '../../components/forms/ResetPasswordForm';
import { Alert } from '../../components/ui/Alert';
import { AuthLayout } from './RegisterPage';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  if (!token || token.length < 32) {
    return (
      <AuthLayout title="重設密碼">
        <Alert tone="error">重設連結不完整，請從信件中重新點擊。</Alert>
        <p className="mt-6 text-sm text-gray-600">
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
            重新申請重設信
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="重設密碼">
      <ResetPasswordForm
        token={token}
        onSuccess={() => setTimeout(() => navigate('/login', { replace: true }), 800)}
      />
    </AuthLayout>
  );
}
