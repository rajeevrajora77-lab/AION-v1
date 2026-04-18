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
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
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
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: { type: Date, select: false },
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
    timestamps: true,
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
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

UserSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

UserSchema.methods.generateAuthToken = function () {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'aion-api',
  });
};

// FIX: ALWAYS use JWT_REFRESH_SECRET — NO fallback to JWT_SECRET
UserSchema.methods.generateRefreshToken = function () {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set. It must be separate from JWT_SECRET.');
  }
  const payload = {
    id: this._id,
    type: 'refresh',
  };
  return jwt.sign(payload, secret, {
    expiresIn: '30d',
    issuer: 'aion-api',
  });
};

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

UserSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000;
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// ============================================================================
// toJSON - FIX: Use transform pattern to avoid conflict with virtual toJSON
// ============================================================================
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // NEVER leak sensitive fields
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

UserSchema.set('toObject', { virtuals: true });

// ============================================================================
// STATIC METHODS
// ============================================================================

UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    throw new Error('Invalid email or password');
  }
  if (user.isLocked()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }
  if (!user.isActive) {
    throw new Error('Account has been deactivated');
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    throw new Error('Invalid email or password');
  }
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  return user;
};

UserSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

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
UserSchema.virtual('fullName').get(function () {
  return this.name;
});

UserSchema.virtual('daysSinceLogin').get(function () {
  if (!this.lastLogin) return null;
  return Math.floor((Date.now() - this.lastLogin) / (1000 * 60 * 60 * 24));
});

// ============================================================================
// EXPORT MODEL
// ============================================================================
const User = mongoose.model('User', UserSchema);
export default User;
