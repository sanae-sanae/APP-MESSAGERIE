const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { getRoomMessages } = require('../controllers/chatController');

const router = express.Router();
router.get('/:roomCode/messages', protect, getRoomMessages);

module.exports = router;