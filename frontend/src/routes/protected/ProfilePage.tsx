import { Link } from 'react-router';
import { AvatarUploader } from '../../components/AvatarUploader';
import { ProfileForm } from '../../components/forms/ProfileForm';
import { useSession } from '../../lib/auth';

export function ProfilePage() {
  const { data: member, isLoading } = useSession();

  if (isLoading || !member) {
    return <main className="p-8 text-gray-500">載入中…</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">個人資料</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/password" className="text-indigo-600 hover:text-indigo-500">
              變更密碼
            </Link>
            <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-500">
              ← 回 dashboard
            </Link>
          </nav>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <section className="md:col-span-2 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">基本資料</h2>
            <ProfileForm member={member} />
          </section>

          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">頭像</h2>
            <AvatarUploader currentUrl={member.avatar_url} />
          </section>
        </div>
      </div>
    </main>
  );
}
