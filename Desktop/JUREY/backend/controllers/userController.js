import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { sendNotificationEmail } from '../config/emailConfig.js';
import { generateOTP } from '../utils/helpers.js';

// Get current user profile
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -verificationOTP -otpExpiry -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic info
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;

    // Update password if provided
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await user.save();

    // Exclude sensitive fields
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.verificationOTP;
    delete userResponse.otpExpiry;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.json(userResponse);
  } catch (err) {
    next(err);
  }
};

// Delete user account
export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete: mark as inactive instead of actually deleting
    user.active = false;
    await user.save();

    // Notify user
    await sendNotificationEmail(
      user,
      'Votre compte a été désactivé',
      `Votre compte a été désactivé avec succès. Si c'était une erreur, veuillez contacter le support.`
    );

    res.json({ message: 'Account deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationOTP -otpExpiry -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Verify user (admin only)
export const verifyUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Notify user
    await sendNotificationEmail(
      user,
      'Votre compte est vérifié',
      `Félicitations! Votre compte a été vérifié par notre équipe.`
    );

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Request verification badge
export const requestVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }
    
    // Already requested
    if (user.verificationRequested) {
      return res.status(400).json({ message: 'Verification already requested' });
    }
    
    user.verificationRequested = true;
    await user.save();
    
    // Notify admin (in a real app, this would trigger an admin notification)
    
    res.json({ message: 'Verification request submitted successfully' });
  } catch (err) {
    next(err);
  }
};

// Get driver statistics
export const getDriverStats = async (req, res, next) => {
  try {
    const driver = await User.findById(req.user.id);
    
    if (!driver || driver.role !== 'driver') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const [totalAnnouncements, activeAnnouncements, completedRequests, avgRating] = await Promise.all([
      Announcement.countDocuments({ driver: driver._id }),
      Announcement.countDocuments({ driver: driver._id, status: 'active' }),
      Request.countDocuments({ 
        'announcement.driver': driver._id,
        status: 'completed'
      }),
      Review.aggregate([
        { $match: { toUser: driver._id } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } }
      ])
    ]);
    
    res.json({
      totalAnnouncements,
      activeAnnouncements,
      completedRequests,
      avgRating: avgRating[0]?.avgRating?.toFixed(1) || 0
    });
  } catch (err) {
    next(err);
  }
};

// Get shipper statistics
export const getShipperStats = async (req, res, next) => {
  try {
    const shipper = await User.findById(req.user.id);
    
    if (!shipper || shipper.role !== 'shipper') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const [totalRequests, acceptedRequests, completedRequests] = await Promise.all([
      Request.countDocuments({ shipper: shipper._id }),
      Request.countDocuments({ shipper: shipper._id, status: 'accepted' }),
      Request.countDocuments({ shipper: shipper._id, status: 'completed' })
    ]);
    
    res.json({
      totalRequests,
      acceptedRequests,
      completedRequests,
      acceptanceRate: totalRequests > 0 
        ? Math.round((acceptedRequests / totalRequests) * 100)
        : 0
    });
  } catch (err) {
    next(err);
  }
};