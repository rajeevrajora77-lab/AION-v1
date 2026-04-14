// Standardized API response helpers
// Usage: import { success, error } from '../utils/response.js';

export const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

export const error = (res, message, statusCode = 400, code = null) =>
  res.status(statusCode).json({ success: false, error: message, ...(code && { code }) });
