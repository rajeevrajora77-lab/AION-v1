import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getDisplayName, getUserInitials } from '../utils/userDisplay';

export default function UserAccountMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const label = getDisplayName(user) || user?.email || 'Account';
  const initials = getUserInitials(user);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800/80 transition-colors text-left min-h-[52px] touch-manipulation border border-transparent hover:border-gray-700"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-semibold text-white uppercase"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-white truncate">{label}</span>
          {user?.email && (
            <span className="block text-xs text-gray-500 truncate">{user.email}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 py-1 rounded-xl border border-gray-700 bg-gray-900 shadow-xl z-[60]"
          role="menu"
        >
          <Link
            to="/profile"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/settings"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <Link
            to="/help"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            Help
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/40"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
