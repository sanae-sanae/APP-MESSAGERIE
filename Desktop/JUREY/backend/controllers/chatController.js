import Message from '../models/Message.js';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';

// Save message
export const saveMessage = async (io, socket, data) => {
  try {
    const { announcementId, receiverId, content } = data;
    
    // Validate participants
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return socket.emit('error', 'Announcement not found');
    }
    
    const validParticipants = [
      announcement.driver.toString(),
      ...announcement.requests
        .map(req => req.shipper.toString())
    ];
    
    if (!validParticipants.includes(socket.user.id) || 
        !validParticipants.includes(receiverId)) {
      return socket.emit('error', 'Unauthorized chat participant');
    }
    
    // Save message
    const message = new Message({
      announcement: announcementId,
      sender: socket.user.id,
      receiver: receiverId,
      content,
    });

    const savedMessage = await message.save();
    
    // Populate sender info
    const populatedMessage = await Message.populate(savedMessage, {
      path: 'sender',
      select: 'firstName lastName'
    });
    
    // Emit to participants
    io.to(announcementId).emit('newMessage', populatedMessage);
  } catch (err) {
    console.error('Error saving message:', err);
    socket.emit('error', 'Failed to send message');
  }
};

// Get chat history
export const getChatHistory = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    
    // Validate access
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    const validParticipants = [
      announcement.driver.toString(),
      ...announcement.requests
        .map(req => req.shipper.toString())
    ];
    
    if (!validParticipants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }
    
    // Get messages
    const messages = await Message.find({ announcement: announcementId })
      .populate('sender', 'firstName lastName')
      .sort('createdAt');

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// Get chat participants
export const getChatParticipants = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    
    const announcement = await Announcement.findById(announcementId)
      .populate('driver', 'firstName lastName id')
      .populate({
        path: 'requests',
        populate: {
          path: 'shipper',
          select: 'firstName lastName id'
        }
      });
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    const participants = [
      {
        id: announcement.driver._id,
        name: `${announcement.driver.firstName} ${announcement.driver.lastName}`,
        role: 'driver'
      },
      ...announcement.requests.map(request => ({
        id: request.shipper._id,
        name: `${request.shipper.firstName} ${request.shipper.lastName}`,
        role: 'shipper'
      }))
    ];
    
    res.json(participants);
  } catch (err) {
    next(err);
  }
};