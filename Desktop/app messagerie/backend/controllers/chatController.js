const Message = require('../models/Message');
const User = require('../models/User');
exports.getRoomMessages = async (req, res, next) => {
    try {
        const { roomCode } = req.params;
        const messages = await Message.find({ roomCode })
                                      .populate('sender', 'email')
                                      .sort({ timestamp: 1 })
                                      .lean(); 
        const formattedMessages = messages.map(msg => ({
            user: msg.sender.email,
            message: msg.content,
            timestamp: msg.timestamp.toISOString(),
        }));

        res.status(200).json(formattedMessages);
    } catch (error) {
        next(error);
    }
};
exports.createRoom = async (req, res, next) => {
    res.status(501).json({ message: "La création de salle via API REST n'est pas implémentée dans cet exemple." });
};