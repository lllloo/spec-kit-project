import { Link } from 'react-router';
import { ForgotPasswordForm } from '../../components/forms/ForgotPasswordForm';
import { AuthLayout } from './RegisterPage';

export function ForgotPasswordPage() {
  return (
    <AuthLayout title="忘記密碼">
      <p className="mb-4 text-sm text-gray-600">
        輸入您的 Email，我們將寄送密碼重設連結（60 分鐘內有效）。
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-gray-600">
        想起密碼了？{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          回登入
        </Link>
      </p>
    </AuthLayout>
  );
}
