import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/User.js';
import { sendEmail, sendNotificationEmail } from '../config/emailConfig.js';
import { generateOTP } from '../utils/helpers.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register user
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role,
      verificationOTP: generateOTP(),
      otpExpiry: Date.now() + 3600000 // 1 hour
    });

    // Send verification email
    await sendEmail(
      email,
      'Vérification de votre compte TransportLogistics',
      `Votre code OTP est: ${user.verificationOTP}`
    );

    res.status(201).json({ 
      message: 'User registered successfully. Check your email for verification code.',
      userId: user._id
    });
  } catch (err) {
    next(err);
  }
};

// Verify email
export const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    
    if (user.verificationOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// Login user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For OAuth users without password
    if (user.method !== 'local') {
      return res.status(401).json({ 
        message: `Please sign in with ${user.method} instead` 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Account not verified. Please verify your email.',
        userId: user._id
      });
    }

    // Generate JWT
    const token = generateToken(user);

    res.json({ 
      token, 
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    next(err);
  }
};

// Google OAuth
export const googleAuth = passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
});

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
    
    const token = generateToken(user);
    res.redirect(`${process.env.CLIENT_URL}/oauth?token=${token}&userId=${user._id}`);
  })(req, res, next);
};

// GitHub OAuth
export const githubAuth = passport.authenticate('github', { 
  scope: ['user:email'],
  session: false 
});

export const githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
    
    const token = generateToken(user);
    res.redirect(`${process.env.CLIENT_URL}/oauth?token=${token}&userId=${user._id}`);
  })(req, res, next);
};

// Forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.resetPasswordToken = generateOTP();
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    await sendEmail(
      email,
      'Réinitialisation de votre mot de passe',
      `Votre code de réinitialisation est: ${user.resetPasswordToken}`
    );
    
    res.json({ message: 'Password reset instructions sent to email' });
  } catch (err) {
    next(err);
  }
};

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};