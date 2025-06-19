import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import Request from '../models/Request.js';
import Review from '../models/Review.js';

// Get dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const [usersCount, driversCount, shippersCount, announcementsCount, requestsCount] = 
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'driver' }),
        User.countDocuments({ role: 'shipper' }),
        Announcement.countDocuments(),
        Request.countDocuments()
      ]);
    
    const recentUsers = await User.find()
      .sort('-createdAt')
      .limit(5)
      .select('firstName lastName email role createdAt');
    
    const recentAnnouncements = await Announcement.find()
      .sort('-createdAt')
      .limit(5)
      .populate('driver', 'firstName lastName');

    res.json({
      stats: { 
        usersCount, 
        driversCount, 
        shippersCount, 
        announcementsCount, 
        requestsCount 
      },
      recentUsers,
      recentAnnouncements
    });
  } catch (err) {
    next(err);
  }
};

// Get platform metrics
export const getPlatformMetrics = async (req, res, next) => {
  try {
    // Calculate acceptance rate
    const [acceptedRequests, totalRequests] = await Promise.all([
      Request.countDocuments({ status: 'accepted' }),
      Request.countDocuments()
    ]);
    
    const acceptanceRate = totalRequests > 0 
      ? (acceptedRequests / totalRequests * 100).toFixed(2)
      : 0;
    
    // Get user growth
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    
    // Get top rated drivers
    const topDrivers = await User.find({ role: 'driver', rating: { $gt: 0 } })
      .sort('-rating')
      .limit(5)
      .select('firstName lastName rating');
    
    res.json({
      acceptanceRate,
      userGrowth,
      topDrivers
    });
  } catch (err) {
    next(err);
  }
};

// Toggle user verification
export const toggleUserVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isVerified = !user.isVerified;
    await user.save();
    
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, verified, search } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (verified) filter.isVerified = verified === 'true';
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await Announcement.findByIdAndDelete(id);
    await Request.deleteMany({ announcement: id });
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Get all announcements
export const getAllAnnouncements = async (req, res, next) => {
  try {
    const { status, driver, destination } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (driver) filter.driver = driver;
    if (destination) filter.destination = new RegExp(destination, 'i');
    
    const announcements = await Announcement.find(filter)
      .populate('driver', 'firstName lastName email')
      .sort('-createdAt');
    
    res.json(announcements);
  } catch (err) {
    next(err);
  }
};