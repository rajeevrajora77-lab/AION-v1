import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Must match backend validatePasswordStrength() in backend/routes/auth.js
function validatePasswordStrength(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password))
    return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password))
    return 'Password must contain at least one number';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character (!@#$%^&* …)';
  return null;
}

function PasswordRequirements({ password }) {
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)', ok: /[a-z]/.test(password) },
    { label: 'One number (0–9)', ok: /[0-9]/.test(password) },
    {
      label: 'One special character (!@#$%^&*…)',
      ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {rules.map(({ label, ok }) => (
        <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-gray-500'}`}>
          <span className={`inline-block w-3.5 h-3.5 rounded-full text-center leading-none font-bold ${
            ok ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
          }`}>
            {ok ? '✓' : '·'}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Client-side password strength check — mirrors backend rule exactly
    const pwError = validatePasswordStrength(formData.password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      await signup(formData.email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = !err.response
        ? 'Network Error: Unable to connect to the server. Please check your backend deployment.'
        : err.response?.data?.error || err.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-2">Join AION to get started</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              disabled={loading}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors disabled:opacity-60"
            />
            {/* Live password strength checklist — shown as soon as user starts typing */}
            <PasswordRequirements password={formData.password} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-base transition-colors touch-manipulation mt-2"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
