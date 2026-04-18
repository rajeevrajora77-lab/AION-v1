import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: { email: boolean; push: boolean };
  };
  profile: {
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  apiUsage: {
    requests: number;
    lastReset: Date;
    monthlyLimit: number;
  };
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(enteredPassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  isLocked(): boolean;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<any>;
}

export interface IUserModel extends Model<IUserDocument> {
  findByCredentials(email: string, password: string): Promise<IUserDocument>;
  findActive(): Promise<IUserDocument[]>;
  getStats(): Promise<any>;
}

const UserSchema = new mongoose.Schema<IUserDocument, IUserModel>(
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
        validator: function(email: string) {
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
    timestamps: true,
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', async function (this: any, next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

UserSchema.methods.comparePassword = async function (enteredPassword: string) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

UserSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'aion-api',
  });
};

UserSchema.methods.generateRefreshToken = function () {
  const payload = {
    id: this._id,
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '30d',
    issuer: 'aion-api',
  });
};

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }

  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.resetPasswordToken;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.__v;
  return user;
};

UserSchema.statics.findByCredentials = async function (email: string, password: string) {
  const user = await this.findOne({ email }).select('+password');
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

  return { total, active, inactive: total - active, admins, recentLogins };
};

const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
