const express = require('express');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Activity = require('../models/Activity');
const router = express.Router();

// Get all applications for user
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate('jobId', 'title company location mode salaryRange')
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    // Get stats
    const stats = await Application.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      applications,
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch applications',
      error: err.message 
    });
  }
});

// Create new application
router.post('/', async (req, res) => {
  try {
    const { jobId, method, notes, appliedDate } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Check if already applied
    const existingApp = await Application.findOne({ 
      userId: req.userId, 
      jobId 
    });

    if (existingApp) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already applied for this job' 
      });
    }

    // Create application
    const application = new Application({
      userId: req.userId,
      jobId,
      method,
      notes,
      appliedDate: appliedDate || new Date(),
      history: [{
        status: 'Applied',
        date: appliedDate || new Date(),
        note: 'Initial application submitted'
      }]
    });

    await application.save();

    // Update job application count
    job.applicationCount += 1;
    await job.save();

    // Create activity
    await Activity.create({
      userId: req.userId,
      action: 'Applied',
      details: `${job.title} at ${job.company}`,
      metadata: { jobId, applicationId: application._id }
    });

    // Real-time notification
    const io = req.app.get('io');
    io.to(`user_${req.userId}`).emit('application_created', {
      application: await application.populate('jobId'),
      message: `Application submitted for ${job.title}`
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: await application.populate('jobId')
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit application',
      error: err.message 
    });
  }
});

// Update application status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    const oldStatus = application.status;
    application.status = status;
    application.history.push({
      status,
      date: new Date(),
      note: note || `Status changed from ${oldStatus} to ${status}`
    });

    await application.save();

    // Create activity
    await Activity.create({
      userId: req.userId,
      action: 'Status Update',
      details: `${application.jobId.title} - ${status}`,
      metadata: { 
        applicationId: application._id,
        oldStatus,
        newStatus: status
      }
    });

    // Real-time update
    const io = req.app.get('io');
    io.to(`user_${req.userId}`).emit('application_updated', {
      application: await application.populate('jobId'),
      message: `Status updated to ${status}`
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      application: await application.populate('jobId')
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status',
      error: err.message 
    });
  }
});

// Withdraw application
router.patch('/:id/withdraw', async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    application.status = 'Withdrawn';
    application.isActive = false;
    application.history.push({
      status: 'Withdrawn',
      date: new Date(),
      note: 'Application withdrawn by user'
    });

    await application.save();

    // Create activity
    await Activity.create({
      userId: req.userId,
      action: 'Withdrawn',
      details: `${application.jobId.title} application withdrawn`,
      metadata: { applicationId: application._id }
    });

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      application: await application.populate('jobId')
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to withdraw application',
      error: err.message 
    });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete application',
      error: err.message 
    });
  }
});

// Get application statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Application.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $subtract: ['$updatedAt', '$appliedDate']
            }
          }
        }
      }
    ]);

    const totalApplications = await Application.countDocuments({ userId: req.user._id });
    
    const recentApplications = await Application.find({ userId: req.user._id })
      .sort({ appliedDate: -1 })
      .limit(5)
      .populate('jobId', 'title company');

    res.json({
      success: true,
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = {
          count: curr.count,
          avgResponseTime: curr.avgResponseTime
        };
        return acc;
      }, {}),
      totalApplications,
      recentApplications
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stats',
      error: err.message 
    });
  }
});

module.exports = router;
