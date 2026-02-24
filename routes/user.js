const express = require('express');
const User = require('../models/User');
const Activity = require('../models/Activity');
const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('savedJobs', 'title company location salaryRange');
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile',
      error: err.message 
    });
  }
});

// Update preferences
router.patch('/preferences', async (req, res) => {
  try {
    const updates = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferences: updates },
      { new: true }
    );

    // Create activity
    await Activity.create({
      userId: req.userId,
      action: 'Updated Preferences',
      details: 'Job search preferences updated',
      time: new Date()
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences',
      error: err.message 
    });
  }
});

// Save/unsave job
router.post('/saved-jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.userId);
    
    const isSaved = user.savedJobs.includes(jobId);
    
    if (isSaved) {
      user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
      await user.save();
      
      await Activity.create({
        userId: req.userId,
        action: 'Unsaved Job',
        details: `Job ID: ${jobId}`,
        metadata: { jobId }
      });

      res.json({ success: true, message: 'Job removed from saved', saved: false });
    } else {
      user.savedJobs.push(jobId);
      await user.save();
      
      await Activity.create({
        userId: req.userId,
        action: 'Saved Job',
        details: `Job ID: ${jobId}`,
        metadata: { jobId }
      });

      res.json({ success: true, message: 'Job saved successfully', saved: true });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update saved jobs',
      error: err.message 
    });
  }
});

// Get saved jobs
router.get('/saved-jobs', async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('savedJobs');
    
    res.json({ 
      success: true, 
      savedJobs: user.savedJobs 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch saved jobs',
      error: err.message 
    });
  }
});

// Get user activities
router.get('/activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const activities = await Activity.find({ userId: req.userId })
      .sort({ time: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch activities',
      error: err.message 
    });
  }
});

// Update notification settings
router.patch('/notifications', async (req, res) => {
  try {
    const { email, dailyDigest, jobAlerts } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        notifications: { 
          email: email !== undefined ? email : req.user.notifications.email,
          dailyDigest: dailyDigest !== undefined ? dailyDigest : req.user.notifications.dailyDigest,
          jobAlerts: jobAlerts !== undefined ? jobAlerts : req.user.notifications.jobAlerts
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Notification settings updated',
      notifications: user.notifications
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update notifications',
      error: err.message 
    });
  }
});

module.exports = router;
