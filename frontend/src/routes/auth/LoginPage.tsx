import { Link, useNavigate, useSearchParams } from 'react-router';
import { LoginForm } from '../../components/forms/LoginForm';
import { AuthLayout } from './RegisterPage';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/dashboard';

  return (
    <AuthLayout title="登入">
      <LoginForm onSuccess={() => navigate(redirectTo, { replace: true })} />
      <p className="mt-6 flex justify-between text-sm text-gray-600">
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          建立帳號
        </Link>
        <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
          忘記密碼？
        </Link>
      </p>
    </AuthLayout>
  );
}
