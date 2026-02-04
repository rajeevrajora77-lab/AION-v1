import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// ============================================================================
// JWT SECRET VALIDATION - CRITICAL SECURITY
// ============================================================================

// Validate JWT_SECRET exists at module load time
if (!process.env.JWT_SECRET) {
  console.error('\n' + '='.repeat(80));
  console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET not configured!');
  console.error('='.repeat(80));
  console.error('\nJWT_SECRET environment variable is REQUIRED for security.');
  console.error('\nWithout it, authentication cannot work securely.');
  console.error('\nGenerate a strong secret:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))")\n');
  console.error('Then set it as an environment variable:');
  console.error('  export JWT_SECRET="your-generated-secret-here"\n');
  console.error('='.repeat(80) + '\n');
  
  // CRITICAL: Prevent server from starting without JWT_SECRET
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate that a string is a valid MongoDB ObjectId
 * CRITICAL: Prevents NoSQL injection attacks
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  // Double-check that converting to ObjectId and back gives same string
  return String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Sanitize and validate user ID from token
 * CRITICAL: Prevents NoSQL injection
 */
function sanitizeUserId(userId) {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Protect routes - Require valid JWT token
 * CRITICAL: All sensitive routes must use this
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Also check cookies (for web apps)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // Check if token exists
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
      // Verify token - NO FALLBACK SECRET (removed 'dev-secret-key')
      const decoded = jwt.verify(token, JWT_SECRET);

      // CRITICAL: Validate user ID format before database query
      const sanitizedUserId = sanitizeUserId(decoded.id);

      // Get user from database (excluding password)
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

      // Check if user is active
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

      // Attach user to request object
      req.user = user;
      
      next();
    } catch (error) {
      logger.logSecurity('Authentication failed - Invalid token', {
        error: error.message,
        ip: req.ip,
      });

      // Specific error messages for debugging (but don't expose token details)
      let errorMessage = 'Not authorized - Invalid token';
      
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Not authorized - Token expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Not authorized - Malformed token';
      }

      return res.status(401).json({
        success: false,
        error: errorMessage,
      });
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

/**
 * Optional auth - Attach user if token is valid, but don't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    try {
      // NO FALLBACK SECRET
      const decoded = jwt.verify(token, JWT_SECRET);
      const sanitizedUserId = sanitizeUserId(decoded.id);
      const user = await User.findById(sanitizedUserId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.logSecurity('Optional auth - Invalid token (ignored)', {
        ip: req.ip,
      });
    }

    next();
  } catch (error) {
    next();
  }
};

// ============================================================================
// ROLE-BASED AUTHORIZATION
// ============================================================================

/**
 * Authorize specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized',
      });
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
// API KEY AUTHENTICATION (for service-to-service)
// ============================================================================

/**
 * Authenticate using API key
 */
export const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
    });
  }

  // Validate API key
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
  }

  if (apiKey !== validApiKey) {
    logger.logSecurity('Invalid API key attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
};

// ============================================================================
// RATE LIMITING PER USER
// ============================================================================

/**
 * Get user identifier for rate limiting
 */
export function getUserId(req) {
  // If authenticated, use user ID
  if (req.user?._id) {
    return `user:${req.user._id}`;
  }
  // Otherwise use IP address
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
