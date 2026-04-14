import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ============================================================================
// USER SCHEMA
// ============================================================================

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          // Simple, linear-time regex — safe against ReDoS, accepts TLDs >3 chars
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
      language: {
        type: String,
        default: 'en',
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
    },
    profile: {
      avatar: String,
      bio: { type: String, maxlength: 500 },
      location: String,
      website: String,
    },
    apiUsage: {
      requests: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now },
      monthlyLimit: { type: Number, default: 1000 },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ============================================================================
// INDEXES
// ============================================================================

UserSchema.index({ email: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// ============================================================================
// PRE-SAVE MIDDLEWARE - Hash Password
// ============================================================================

UserSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10); // OWASP-recommended for web apps (~100ms vs ~300ms at 12)
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare entered password with hashed password
 */
UserSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate JWT token
 */
UserSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to sign tokens.');
  }
  const expiresIn = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'aion-api',
  });
};

/**
 * Generate refresh token (longer expiry)
 */
UserSchema.methods.generateRefreshToken = function () {
  const payload = {
    id: this._id,
    type: 'refresh',
  };

  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_REFRESH_SECRET/JWT_SECRET environment variable is not set. Refusing to sign refresh tokens.');
  }
  const expiresIn = '30d';

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'aion-api',
  });
};

/**
 * Check if account is locked
 */
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Increment login attempts
 */
UserSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  // Lock account after max attempts
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

/**
 * Reset login attempts
 */
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

/**
 * Sanitize user data for JSON response (remove sensitive fields)
 */
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  
  // Remove sensitive fields
  delete user.password;
  delete user.emailVerificationToken;
  delete user.resetPasswordToken;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.__v;
  
  return user;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find by credentials (email + password)
 */
UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new Error('Account has been deactivated');
  }

  // Compare password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    throw new Error('Invalid email or password');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  return user;
};

/**
 * Find active users
 */
UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

/**
 * Get user stats
 */
UserSchema.statics.getStats = async function () {
  const [total, active, admins, recentLogins] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isActive: true }),
    this.countDocuments({ role: 'admin' }),
    this.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    admins,
    recentLogins,
  };
};

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

// Full name (if you want to split first/last name in future)
UserSchema.virtual('fullName').get(function () {
  return this.name;
});

// Days since last login
UserSchema.virtual('daysSinceLogin').get(function () {
  if (!this.lastLogin) return null;
  return Math.floor((Date.now() - this.lastLogin) / (1000 * 60 * 60 * 24));
});

// Enable virtuals in JSON output
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// ============================================================================
// EXPORT MODEL
// ============================================================================

const User = mongoose.model('User', UserSchema);

export default User;
