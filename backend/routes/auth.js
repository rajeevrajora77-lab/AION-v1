import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Serialize user for API responses — consistent id, name fallback to email prefix.
 */
function serializeUser(userDoc) {
  if (!userDoc) return null;
  const email = String(userDoc.email || '').toLowerCase().trim();
  const rawName = userDoc.name != null ? String(userDoc.name).trim() : '';
  const name = rawName || (email.includes('@') ? email.split('@')[0] : email);
  return {
    id: userDoc._id,
    name,
    email,
    role: userDoc.role,
    lastLogin: userDoc.lastLogin,
    isActive: userDoc.isActive,
    createdAt: userDoc.createdAt,
    preferences: userDoc.preferences,
  };
}

// ============================================================================
// RATE LIMITER
// ============================================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// PASSWORD STRENGTH VALIDATOR
// Permanent solution — replaces bare length check
// ============================================================================

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
    return 'Password must contain at least one special character';
  return null; // null = valid
}

// ============================================================================
// ROUTES
// ============================================================================

// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, password, and name',
      });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email',
      });
    }

    const user = await User.create({ email, password, name });
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.logAuth('User registered', { userId: user._id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/signup' });
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    let user;
    try {
      user = await User.findByCredentials(email, password);
    } catch (err) {
      logger.logSecurity('Failed login attempt', { email });
      return res.status(401).json({ success: false, error: err.message || 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.logAuth('User logged in', { userId: user._id, email: user.email });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/login' });
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Exchange valid refresh token for a new access token
// @access  Public
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or deactivated' });
    }

    const newAccessToken = user.generateAuthToken();

    logger.logAuth('Access token refreshed', { userId: user._id });

    res.json({ success: true, data: { token: newAccessToken } });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/refresh' });
    res.status(500).json({ success: false, error: 'Server error refreshing token' });
  }
});

// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    logger.logAuth('User logged out', { userId: req.user._id });
    // TODO Phase 2: blacklist refresh token in Redis with TTL = remaining token expiry
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/logout' });
    res.status(500).json({ success: false, error: 'Server error during logout' });
  }
});

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    logger.logApiError(error, { userId: req.user?._id, route: 'GET /api/auth/me' });
    res.status(500).json({ success: false, error: 'Server error retrieving profile' });
  }
});

// @route   PUT /api/auth/update-profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const fieldsToUpdate = {};

    if (name) fieldsToUpdate.name = name;
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
      fieldsToUpdate.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    logger.logAuth('User profile updated', {
      userId: user._id,
      updatedFields: Object.keys(fieldsToUpdate),
    });

    res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    logger.logApiError(error, { userId: req.user?._id, route: 'PUT /api/auth/update-profile' });
    res.status(500).json({ success: false, error: 'Server error updating profile' });
  }
});

// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password',
      });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      logger.logSecurity('Failed password change attempt', { userId: user._id });
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    logger.logAuth('User password changed', { userId: user._id });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.logApiError(error, { userId: req.user?._id, route: 'PUT /api/auth/change-password' });
    res.status(500).json({ success: false, error: 'Server error changing password' });
  }
});

// @route   DELETE /api/auth/deactivate
// @access  Private
router.delete('/deactivate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();
    logger.logAuth('User account deactivated', { userId: user._id });
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    logger.logApiError(error, { userId: req.user?._id, route: 'DELETE /api/auth/deactivate' });
    res.status(500).json({ success: false, error: 'Server error deactivating account' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users with pagination (admin only)
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.logApiError(error, { route: 'GET /api/auth/users' });
    res.status(500).json({ success: false, error: 'Server error retrieving users' });
  }
});

// @route   GET /api/auth/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await User.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.logApiError(error, { route: 'GET /api/auth/stats' });
    res.status(500).json({ success: false, error: 'Server error retrieving stats' });
  }
});

export default router;
