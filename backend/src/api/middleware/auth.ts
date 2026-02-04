import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Legacy model/logger imports (Phase 3.2 keeps behavior; Phase 4 moves these to infra/services)
import User from '../../../models/User.js';
import logger from '../../../utils/logger.js';

// JWT secret validation at module load
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

function isValidObjectId(id: unknown): id is string {
  if (!id || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === id;
}

function sanitizeUserId(userId: unknown): string {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

export const protect = async (req: any, res: any, next: any) => {
  try {
    let token: string | undefined;

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
      return res.status(401).json({ success: false, error: 'Not authorized - No token provided' });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const sanitizedUserId = sanitizeUserId(decoded.id);

      const user = await User.findById(sanitizedUserId).select('-password');
      if (!user) {
        logger.logSecurity('Authentication failed - User not found', { userId: sanitizedUserId, ip: req.ip });
        return res.status(401).json({ success: false, error: 'Not authorized - User not found' });
      }

      if (!user.isActive) {
        logger.logSecurity('Authentication failed - Account deactivated', { userId: user._id, email: user.email });
        return res.status(401).json({ success: false, error: 'Account has been deactivated' });
      }

      req.user = user;
      next();
    } catch (error: any) {
      logger.logSecurity('Authentication failed - Invalid token', { error: error.message, ip: req.ip });

      let errorMessage = 'Not authorized - Invalid token';
      if (error.name === 'TokenExpiredError') errorMessage = 'Not authorized - Token expired';
      else if (error.name === 'JsonWebTokenError') errorMessage = 'Not authorized - Malformed token';

      return res.status(401).json({ success: false, error: errorMessage });
    }
  } catch (error: any) {
    logger.logApiError(error, { route: req.path, method: req.method });
    return res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
};

export const optionalAuth = async (req: any, res: any, next: any) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return next();

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const sanitizedUserId = sanitizeUserId(decoded.id);
      const user = await User.findById(sanitizedUserId).select('-password');
      if (user && user.isActive) req.user = user;
    } catch {
      logger.logSecurity('Optional auth - Invalid token (ignored)', { ip: req.ip });
    }

    next();
  } catch {
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
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

export const authenticateApiKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ success: false, error: 'API key required' });

  const validApiKey = process.env.API_KEY;
  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (apiKey !== validApiKey) {
    logger.logSecurity('Invalid API key attempt', { ip: req.ip, userAgent: req.headers['user-agent'] });
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  next();
};

export function getUserId(req: any): string {
  if (req.user?._id) return `user:${req.user._id}`;
  return `ip:${req.ip || req.connection?.remoteAddress}`;
}

export default {
  protect,
  optionalAuth,
  authorize,
  authenticateApiKey,
  getUserId,
  isValidObjectId,
  sanitizeUserId,
};
