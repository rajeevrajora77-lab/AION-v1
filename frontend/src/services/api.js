import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let requestIdCounter = 0;
const generateRequestId = () => `req_${Date.now()}_${++requestIdCounter}`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// REQUEST INTERCEPTOR — attach auth token + request ID
// ============================================================
api.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = generateRequestId();
    const token = useAuthStore.getState().token;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// ERROR TYPE CLASSIFIER
// ============================================================
const getErrorType = (error) => {
  if (error.response) {
    const s = error.response.status;
    if (s >= 500) return 'SERVER_ERROR';
    if (s === 429) return 'RATE_LIMITED';
    if (s === 404) return 'NOT_FOUND';
    if (s === 403) return 'FORBIDDEN';
    if (s === 401) return 'UNAUTHORIZED';
    return `HTTP_${s}`;
  }
  if (error.code === 'ECONNABORTED') return 'TIMEOUT_ERROR';
  if (typeof window !== 'undefined' && !window.navigator.onLine) return 'OFFLINE_ERROR';
  return 'NETWORK_ERROR';
};

// ============================================================
// RESPONSE INTERCEPTOR — silent token refresh on 401
// Queues concurrent requests during refresh; redirects only if refresh fails
// ============================================================
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorType = getErrorType(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentPath = window.location.pathname;

      // Do not attempt refresh on auth pages
      if (currentPath === '/login' || currentPath === '/signup') {
        error.errorType = errorType;
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshed = await useAuthStore.getState().refreshAccessToken();

      if (refreshed) {
        const newToken = useAuthStore.getState().token;
        processQueue(null, newToken);
        isRefreshing = false;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        processQueue(error);
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    error.errorType = errorType;
    error.requestId = originalRequest?.headers?.['X-Request-ID'];
    return Promise.reject(error);
  }
);

export { generateRequestId, getErrorType };
export default api;
