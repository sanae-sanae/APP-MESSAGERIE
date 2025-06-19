import Announcement from '../models/Announcement.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { sendNotificationEmail } from '../config/emailConfig.js';

// Create announcement
export const createAnnouncement = async (req, res, next) => {
  try {
    const { 
      departure, 
      destination, 
      steps, 
      maxDimensions, 
      cargoType, 
      availableCapacity,
      departureDate
    } = req.body;

    const announcement = new Announcement({
      driver: req.user.id,
      departure,
      destination,
      steps: steps || [],
      maxDimensions,
      cargoType,
      availableCapacity,
      departureDate: new Date(departureDate)
    });

    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
};

// Get announcements with filters
export const getAnnouncements = async (req, res, next) => {
  try {
    const { departure, destination, minDate, maxDate, cargoType } = req.query;
    const filter = { status: 'active' };
    
    if (departure) filter.departure = new RegExp(departure, 'i');
    if (destination) filter.destination = new RegExp(destination, 'i');
    if (cargoType) filter.cargoType = cargoType;
    
    if (minDate || maxDate) {
      filter.departureDate = {};
      if (minDate) filter.departureDate.$gte = new Date(minDate);
      if (maxDate) filter.departureDate.$lte = new Date(maxDate);
    }

    const announcements = await Announcement.find(filter)
      .populate('driver', 'firstName lastName rating isVerified')
      .sort('-createdAt');

    res.json(announcements);
  } catch (err) {
    next(err);
  }
};

// Get announcement by ID
export const getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('driver', 'firstName lastName rating phone email isVerified')
      .populate({
        path: 'requests',
        match: { status: 'pending' },
        populate: {
          path: 'shipper',
          select: 'firstName lastName rating'
        }
      });
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json(announcement);
  } catch (err) {
    next(err);
  }
};

// Get driver's announcements
export const getMyAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ driver: req.user.id })
      .populate({
        path: 'requests',
        populate: {
          path: 'shipper',
          select: 'firstName lastName email phone rating'
        }
      })
      .sort('-createdAt');

    res.json(announcements);
  } catch (err) {
    next(err);
  }
};

// Update announcement status
export const updateAnnouncementStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (err) {
    next(err);
  }
};