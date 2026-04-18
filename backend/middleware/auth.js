import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// ============================================================================
// JWT SECRET VALIDATION — FAIL FAST AT STARTUP
// ============================================================================

if (!process.env.JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET not configured — server cannot start');
  throw new Error('JWT_SECRET environment variable is required');
}

if (!process.env.JWT_REFRESH_SECRET) {
  logger.error('CRITICAL: JWT_REFRESH_SECRET not configured — must be separate from JWT_SECRET');
  throw new Error('JWT_REFRESH_SECRET environment variable is required and must differ from JWT_SECRET');
}

const JWT_SECRET = process.env.JWT_SECRET;
// No fallback — JWT_REFRESH_SECRET MUST be a separate secret
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === id;
}

function sanitizeUserId(userId) {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.logSecurity('Authentication failed - No token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({
        success: false,
        error: 'Not authorized - No token provided',
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const sanitizedUserId = sanitizeUserId(decoded.id);
      const user = await User.findById(sanitizedUserId).select('-password');

      if (!user) {
        logger.logSecurity('Authentication failed - User not found', {
          userId: sanitizedUserId,
          ip: req.ip,
        });
        return res.status(401).json({
          success: false,
          error: 'Not authorized - User not found',
        });
      }

      if (!user.isActive) {
        logger.logSecurity('Authentication failed - Account deactivated', {
          userId: user._id,
          email: user.email,
        });
        return res.status(401).json({
          success: false,
          error: 'Account has been deactivated',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.logSecurity('Authentication failed - Invalid token', {
        error: error.message,
        ip: req.ip,
      });

      let errorMessage = 'Not authorized - Invalid token';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Not authorized - Token expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Not authorized - Malformed token';
      }

      return res.status(401).json({ success: false, error: errorMessage });
    }
  } catch (error) {
    logger.logApiError(error, { route: req.path, method: req.method });
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication',
    });
  }
};

// ============================================================================
// OPTIONAL AUTHENTICATION
// ============================================================================

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return next();

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const sanitizedUserId = sanitizeUserId(decoded.id);
      const user = await User.findById(sanitizedUserId).select('-password');
      if (user && user.isActive) req.user = user;
    } catch (error) {
      logger.logSecurity('Optional auth - Invalid token (ignored)', { ip: req.ip });
    }

    next();
  } catch (error) {
    next();
  }
};

// ============================================================================
// ROLE-BASED AUTHORIZATION
// ============================================================================

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      logger.logSecurity('Authorization failed - Insufficient permissions', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

// ============================================================================
// API KEY AUTHENTICATION — TIMING-SAFE
// ============================================================================

export const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }

  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  // TIMING-SAFE comparison — prevents timing side-channel attacks
  // Both buffers must be same length for timingSafeEqual
  const isValid =
    apiKey.length === validApiKey.length &&
    crypto.timingSafeEqual(
      Buffer.from(apiKey, 'utf8'),
      Buffer.from(validApiKey, 'utf8')
    );

  if (!isValid) {
    logger.logSecurity('Invalid API key attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  next();
};

// ============================================================================
// RATE LIMITING PER USER
// ============================================================================

export function getUserId(req) {
  if (req.user?._id) return `user:${req.user._id}`;
  return `ip:${req.ip || req.connection.remoteAddress}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  protect,
  optionalAuth,
  authorize,
  authenticateApiKey,
  getUserId,
  isValidObjectId,
  sanitizeUserId,
};
