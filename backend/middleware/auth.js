import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ============================================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Protect routes - Require valid JWT token
 * Usage: router.get('/protected', protect, handler)
 */
export async function protect(req, res, next) {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Also check for token in cookies (for web apps)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // No token provided
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
        message: 'Please provide a valid authentication token'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');

      // Check if user still exists
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User no longer exists',
          message: 'The user associated with this token no longer exists'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account deactivated',
          message: 'Your account has been deactivated'
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please login again'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

// ============================================================================
// ROLE-BASED AUTHORIZATION
// ============================================================================

/**
 * Authorize specific roles
 * Usage: router.get('/admin', protect, authorize('admin'), handler)
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Please login to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
}

// ============================================================================
// API KEY AUTHENTICATION (For service-to-service)
// ============================================================================

/**
 * API Key authentication for service-to-service calls
 * Usage: router.post('/webhook', protectApiKey, handler)
 */
export function protectApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide a valid API key in X-API-Key header'
    });
  }

  // Check against environment variable
  const validApiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;
  
  if (apiKey !== validApiKey) {
    console.warn('Invalid API key attempt:', apiKey.substring(0, 10) + '...');
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  next();
}

// ============================================================================
// OPTIONAL AUTHENTICATION (For public/private hybrid routes)
// ============================================================================

/**
 * Optional authentication - Attaches user if token exists, but doesn't require it
 * Usage: router.get('/content', optionalAuth, handler)
 */
export async function optionalAuth(req, res, next) {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (err) {
        // Token invalid but that's ok for optional auth
        console.log('Optional auth - invalid token, continuing as guest');
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even on error
  }
}

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

export default { protect, authorize, protectApiKey, optionalAuth, getUserId };
