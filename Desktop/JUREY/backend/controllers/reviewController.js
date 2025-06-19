import Review from '../models/Review.js';
import Request from '../models/Request.js';
import User from '../models/User.js';

// Create review
export const createReview = async (req, res, next) => {
  try {
    const { toUserId, requestId, rating, comment } = req.body;
    
    // Check if request exists and is completed
    const request = await Request.findOne({
      _id: requestId,
      status: 'completed',
      $or: [
        { shipper: req.user.id },
        { 'announcement.driver': req.user.id }
      ]
    });
    
    if (!request) {
      return res.status(400).json({ message: 'Invalid request for review' });
    }
    
    // Determine relationship
    const isShipper = request.shipper.toString() === req.user.id;
    const isDriver = request.announcement.driver.toString() === req.user.id;
    
    if (!isShipper && !isDriver) {
      return res.status(403).json({ message: 'Unauthorized to review this request' });
    }
    
    // Validate recipient
    const recipientIsDriver = toUserId === request.announcement.driver.toString();
    const recipientIsShipper = toUserId === request.shipper.toString();
    
    if ((isShipper && !recipientIsDriver) || (isDriver && !recipientIsShipper)) {
      return res.status(400).json({ message: 'Invalid recipient for review' });
    }
    
    // Check if review already exists
    const existingReview = await Review.findOne({ 
      fromUser: req.user.id, 
      request: requestId 
    });
    
    if (existingReview) {
      return res.status(400).json({ message: 'Review already submitted for this request' });
    }
    
    // Create review
    const review = new Review({
      fromUser: req.user.id,
      toUser: toUserId,
      request: requestId,
      rating,
      comment
    });
    
    await review.save();
    
    // Update user rating
    await updateUserRating(toUserId);
    
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

// Update user rating
const updateUserRating = async (userId) => {
  const reviews = await Review.find({ toUser: userId });
  
  if (reviews.length === 0) return;
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  await User.findByIdAndUpdate(userId, { 
    rating: parseFloat(averageRating.toFixed(2)) 
  });
};

// Get reviews for a user
export const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const reviews = await Review.find({ toUser: userId })
      .populate('fromUser', 'firstName lastName')
      .populate('request')
      .sort('-createdAt');
    
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};