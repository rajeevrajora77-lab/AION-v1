import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDisplayName, getUserInitials } from '../utils/userDisplay';

export default function Profile() {
  const { user } = useAuthStore();
  const label = getDisplayName(user);
  const initials = getUserInitials(user);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to chat
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xl font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{label}</h1>
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">User ID</dt>
              <dd className="text-gray-200 font-mono text-xs break-all">{user?.id}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Role</dt>
              <dd className="text-gray-200 capitalize">{user?.role || 'user'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
