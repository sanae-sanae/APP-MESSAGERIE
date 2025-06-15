const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        trim: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    senderEmail: { 
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); 

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;