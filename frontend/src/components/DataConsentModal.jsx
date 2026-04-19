import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * Data Usage Consent Modal — shown on first login when user.dataConsentGiven !== true.
 * Stores consent via PUT /api/auth/update-profile.
 */
export default function DataConsentModal() {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleAccept = async () => {
    if (!checked) return;
    setSaving(true);
    try {
      await api.put('/auth/update-profile', {
        dataConsentGiven: true,
      });
      updateUser({ dataConsentGiven: true });
    } catch (err) {
      console.error('Failed to save consent:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-fade-in">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Data Usage Disclosure
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Your privacy matters to us
        </p>

        {/* Content */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <p className="text-gray-300 text-[15px] leading-relaxed mb-3">
            We do not train our AI models on your personal data.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your data is used only for system functionality, security monitoring,
            and service improvement. Your conversations are stored securely and
            are never shared with third parties for model training purposes.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200 transition-colors">
            I understand and acknowledge this data usage disclosure
          </span>
        </label>

        {/* Accept button */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!checked || saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>

        <p className="text-gray-600 text-xs text-center mt-4">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">
            Terms & Conditions
          </a>
        </p>
      </div>
    </div>
  );
}
