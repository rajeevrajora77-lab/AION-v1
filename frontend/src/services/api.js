import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Request ID generation
let requestIdCounter = 0;
const generateRequestId = () => {
  return `req_${Date.now()}_${++requestIdCounter}`;
};

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for streaming
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add request ID and logging
api.interceptors.request.use(
  (config) => {
    // Add request ID to all requests
    config.headers['X-Request-ID'] = generateRequestId();

    // Log requests in development mode
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
        requestId: config.headers['X-Request-ID'],
        baseURL: config.baseURL,
        timeout: config.timeout,
        timestamp: new Date().toISOString(),
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Helper function to determine error type
const getErrorType = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    if (status >= 500) return 'SERVER_ERROR';
    if (status === 403) return 'CORS_ERROR';
    if (status === 404) return 'NOT_FOUND';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 429) return 'RATE_LIMITED';
    return `HTTP_${status}`;
  } else if (error.request) {
    // Request made but no response (network error, timeout)
    if (error.code === 'ECONNABORTED') return 'TIMEOUT_ERROR';
    if (!window.navigator.onLine) return 'OFFLINE_ERROR';
    return 'NETWORK_ERROR';
  } else if (error.message === 'Network Error') {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN_ERROR';
};

// Response interceptor: Enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.status} ${response.config.url}`, {
        requestId: response.config.headers['X-Request-ID'],
        duration: response.headers['x-response-time'],
        timestamp: new Date().toISOString(),
      });
    }
    return response;
  },
  (error) => {
    const requestId = error.config?.headers?.['X-Request-ID'];
    const errorType = getErrorType(error);

    const errorInfo = {
      requestId,
      type: errorType,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      timestamp: new Date().toISOString(),
      // Include response data if available
      data: error.response?.data,
    };

    // Log error with full context
    console.error('[API Error]', errorInfo);

    // Attach enriched error information
    error.metadata = errorInfo;
    error.errorType = errorType;
    error.requestId = requestId;

    return Promise.reject(error);
  }
);

export { generateRequestId, getErrorType };
export default api;
