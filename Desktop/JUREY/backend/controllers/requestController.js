import Request from '../models/Request.js';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { sendNotificationEmail } from '../config/emailConfig.js';

// Create request
export const createRequest = async (req, res, next) => {
  try {
    const { announcementId, packageDetails } = req.body;

    const announcement = await Announcement.findById(announcementId)
      .populate('driver', 'email firstName');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check capacity
    if (packageDetails.weight > announcement.availableCapacity) {
      return res.status(400).json({ 
        message: 'Package weight exceeds available capacity'
      });
    }

    const request = new Request({
      announcement: announcementId,
      shipper: req.user.id,
      packageDetails
    });

    await request.save();
    
    // Add request to announcement
    announcement.requests.push(request._id);
    await announcement.save();

    // Notify driver
    if (announcement.driver.email) {
      await sendNotificationEmail(
        announcement.driver,
        'Nouvelle demande de transport',
        `Vous avez reçu une nouvelle demande pour votre annonce: ${announcement.departure} vers ${announcement.destination}`
      );
    }

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
};

// Update request status
export const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await Request.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('shipper', 'firstName lastName email')
     .populate('announcement', 'departure destination driver');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Notify shipper
    if (request.shipper.email) {
      const statusMessage = status === 'accepted' 
        ? 'a été acceptée' 
        : status === 'rejected' 
          ? 'a été refusée' 
          : 'est terminée';
      
      await sendNotificationEmail(
        request.shipper,
        'Mise à jour de votre demande',
        `Votre demande pour l'annonce ${request.announcement.departure} - ${request.announcement.destination} ${statusMessage}`
      );
    }

    res.json(request);
  } catch (err) {
    next(err);
  }
};

// Get user requests
export const getUserRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({ shipper: req.user.id })
      .populate({
        path: 'announcement',
        populate: {
          path: 'driver',
          select: 'firstName lastName rating'
        }
      })
      .sort('-createdAt');

    res.json(requests);
  } catch (err) {
    next(err);
  }
};