
const Message = require('../models/Message'); 
const User = require('../models/User');


io.on('connection', (socket) => {
    socket.on('joinRoom', async (roomCode, callback) => {
        try {
            const messages = await Message.find({ roomCode })
                                          .populate('sender', 'email')
                                          .sort({ timestamp: 1 })
                                          .lean();
            const formattedHistory = messages.map(msg => ({
                user: msg.sender.email,
                message: msg.content,
                timestamp: msg.timestamp.toISOString(),
            }));
            socket.emit('roomMessages', formattedHistory);
        } catch (error) {
            console.error('Error fetching room history:', error);
        }
        // ...
    });

    socket.on('sendMessage', async (data) => { 
        const { roomCode, message } = data;
        if (!roomCode || !message) {
            return socket.emit('messageError', 'Room code and message are required.');
        }
        const fullMessage = {
            user: socket.user.email,
            message,
            timestamp: new Date().toISOString()
        };
        console.log(`Message in room ${roomCode} from ${socket.user.email}: ${message}`);
        io.to(roomCode).emit('message', fullMessage);

        try {
            const newMessage = new Message({
                roomCode,
                sender: socket.user._id,
                senderEmail: socket.user.email, 
                content: message
            });
            await newMessage.save();
        } catch (error) {
            console.error('Error saving message:', error);
           
        }
    });
  
});