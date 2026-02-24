const express = require('express');
const router = express.Router();

// Get notification settings
router.get('/settings', async (req, res) => {
  try {
    res.json({
      success: true,
      notifications: req.user.notifications
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification settings',
      error: err.message 
    });
  }
});

// Test notification (for development)
router.post('/test', async (req, res) => {
  try {
    const io = req.app.get('io');
    
    io.to(`user_${req.userId}`).emit('test_notification', {
      message: 'This is a test notification!',
      time: new Date()
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test notification',
      error: err.message 
    });
  }
});

module.exports = router;
