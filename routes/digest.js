const express = require('express');
const Job = require('../models/Job');
const Activity = require('../models/Activity');
const router = express.Router();

// Generate digest for user
router.get('/generate', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const user = req.user;

    const jobs = await Job.find({ isActive: true });
    
    const matchedJobs = jobs
      .map(job => ({
        ...job.toObject(),
        matchScore: job.calculateMatchScore(user.preferences)
      }))
      .filter(job => job.matchScore >= (user.preferences.minMatchScore || 40))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit));

    // Create activity
    await Activity.create({
      userId: req.userId,
      action: 'Generated Digest',
      details: `${matchedJobs.length} job recommendations`,
      time: new Date()
    });

    res.json({
      success: true,
      digest: {
        date: new Date(),
        jobs: matchedJobs
      },
      count: matchedJobs.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate digest',
      error: err.message 
    });
  }
});

module.exports = router;
