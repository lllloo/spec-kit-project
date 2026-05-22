import { Link, useNavigate } from 'react-router';
import { RegisterForm } from '../../components/forms/RegisterForm';

export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout title="建立帳號">
      <RegisterForm onSuccess={() => setTimeout(() => navigate('/login'), 1500)} />
      <p className="mt-6 text-sm text-gray-600">
        已有帳號？{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          直接登入
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}
