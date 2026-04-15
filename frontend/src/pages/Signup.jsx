import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
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
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await signup(formData.email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = !err.response
        ? 'Network Error: Unable to connect to the server. Please check your backend deployment.'
        : err.response?.data?.error || err.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
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
            {/* text-base prevents iOS Safari auto-zoom (must be ≥16px) */}
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors"
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
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors"
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
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors"
            />
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
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base transition-colors touch-manipulation mt-2"
          >
            Create Account
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
