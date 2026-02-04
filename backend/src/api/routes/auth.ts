import express from 'express';

// Legacy model/logger imports (Phase 3.2 keeps behavior; Phase 4 moves these to services/domain)
import User from '../../../models/User.js';
import logger from '../../../utils/logger.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req: any, res: any) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Please provide email, password, and name' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
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
        user: { id: user._id, email: user.email, name: user.name, role: user.role },
      },
    });
  } catch (error: any) {
    logger.logApiError(error, { route: 'POST /api/auth/signup' });
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    let user: any;
    try {
      user = await User.findByCredentials(email, password);
    } catch (err: any) {
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
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error: any) {
    logger.logApiError(error, { route: 'POST /api/auth/login' });
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

router.get('/me', protect, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.logApiError(error, { userId: req.user?._id, route: 'GET /api/auth/me' });
    res.status(500).json({ success: false, error: 'Server error retrieving profile' });
  }
});

router.put('/update-profile', protect, async (req: any, res: any) => {
  try {
    const { name, email } = req.body;
    const fieldsToUpdate: any = {};

    if (name) fieldsToUpdate.name = name;

    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
      fieldsToUpdate.email = email;
    }

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, { new: true, runValidators: true });

    logger.logAuth('User profile updated', { userId: user._id, updatedFields: Object.keys(fieldsToUpdate) });

    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.logApiError(error, { userId: req.user?._id, route: 'PUT /api/auth/update-profile' });
    res.status(500).json({ success: false, error: 'Server error updating profile' });
  }
});

router.put('/change-password', protect, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Please provide current and new password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
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
  } catch (error: any) {
    logger.logApiError(error, { userId: req.user?._id, route: 'PUT /api/auth/change-password' });
    res.status(500).json({ success: false, error: 'Server error changing password' });
  }
});

router.delete('/deactivate', protect, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();

    logger.logAuth('User account deactivated', { userId: user._id });

    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error: any) {
    logger.logApiError(error, { userId: req.user?._id, route: 'DELETE /api/auth/deactivate' });
    res.status(500).json({ success: false, error: 'Server error deactivating account' });
  }
});

router.get('/users', protect, authorize('admin'), async (req: any, res: any) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    logger.logApiError(error, { route: 'GET /api/auth/users' });
    res.status(500).json({ success: false, error: 'Server error retrieving users' });
  }
});

router.get('/stats', protect, authorize('admin'), async (req: any, res: any) => {
  try {
    const stats = await User.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.logApiError(error, { route: 'GET /api/auth/stats' });
    res.status(500).json({ success: false, error: 'Server error retrieving stats' });
  }
});

export default router;
