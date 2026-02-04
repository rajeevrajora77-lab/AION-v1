import express from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, password, and name'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name
    });

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.logAuth('User registered', {
      userId: user._id,
      email: user.email
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/signup' });
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Find user by credentials (includes password comparison and locking logic)
    let user;
    try {
      user = await User.findByCredentials(email, password);
    } catch (err) {
      logger.logSecurity('Failed login attempt', { email });
      return res.status(401).json({
        success: false,
        error: err.message || 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.logAuth('User logged in', {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    logger.logApiError(error, { route: 'POST /api/auth/login' });
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.logApiError(error, { 
      userId: req.user?._id, 
      route: 'GET /api/auth/me'
    });
    res.status(500).json({
      success: false,
      error: 'Server error retrieving profile'
    });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const fieldsToUpdate = {};

    if (name) fieldsToUpdate.name = name;
    if (email) {
      // Check if new email already exists
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
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
      updatedFields: Object.keys(fieldsToUpdate)
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.logApiError(error, { 
      userId: req.user?._id,
      route: 'PUT /api/auth/update-profile'
    });
    res.status(500).json({
      success: false,
      error: 'Server error updating profile'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      logger.logSecurity('Failed password change attempt', { userId: user._id });
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.logAuth('User password changed', { userId: user._id });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.logApiError(error, { 
      userId: req.user?._id,
      route: 'PUT /api/auth/change-password'
    });
    res.status(500).json({
      success: false,
      error: 'Server error changing password'
    });
  }
});

// @route   DELETE /api/auth/deactivate
// @desc    Deactivate user account
// @access  Private
router.delete('/deactivate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();

    logger.logAuth('User account deactivated', { userId: user._id });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    logger.logApiError(error, { 
      userId: req.user?._id,
      route: 'DELETE /api/auth/deactivate'
    });
    res.status(500).json({
      success: false,
      error: 'Server error deactivating account'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.logApiError(error, { route: 'GET /api/auth/users' });
    res.status(500).json({
      success: false,
      error: 'Server error retrieving users'
    });
  }
});

// @route   GET /api/auth/stats
// @desc    Get user statistics (admin only)
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await User.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.logApiError(error, { route: 'GET /api/auth/stats' });
    res.status(500).json({
      success: false,
      error: 'Server error retrieving stats'
    });
  }
});

export default router;
