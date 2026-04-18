import { Link } from 'react-router-dom';

export default function Help() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to chat
        </Link>
        <h1 className="text-2xl font-bold text-white mb-4">Help</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          For API documentation and deployment guides, see the project README. Use{' '}
          <Link to="/settings/api-keys" className="text-blue-400 hover:underline">
            Settings → API Keys
          </Link>{' '}
          to manage your provider keys securely.
        </p>
      </div>
    </div>
  );
}
