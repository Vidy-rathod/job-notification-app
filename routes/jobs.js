const express = require('express');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all jobs with filters
router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      location,
      mode,
      experience,
      source,
      minSalary,
      maxSalary,
      skills,
      page = 1,
      limit = 20,
      sortBy = 'postedDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Text search
    if (keyword) {
      query.$text = { $search: keyword };
    }

    // Filters
    if (location && location !== 'All') {
      query.location = new RegExp(location, 'i');
    }
    if (mode && mode !== 'All') {
      query.mode = mode;
    }
    if (experience && experience !== 'All') {
      query.experience = experience;
    }
    if (source && source !== 'All') {
      query.source = source;
    }
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillArray };
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const jobs = await Job.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
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
      message: 'Failed to fetch jobs',
      error: err.message 
    });
  }
});

// Get jobs with match scores (requires auth)
router.get('/matched', auth, async (req, res) => {
  try {
    const { minScore = 0, page = 1, limit = 20 } = req.query;
    const user = req.user;

    const jobs = await Job.find({ isActive: true });
    
    // Calculate match scores
    const jobsWithScores = jobs.map(job => ({
      ...job.toObject(),
      matchScore: job.calculateMatchScore(user.preferences)
    }));

    // Filter by minimum score and sort
    const filteredJobs = jobsWithScores
      .filter(job => job.matchScore >= parseInt(minScore))
      .sort((a, b) => b.matchScore - a.matchScore);

    const paginatedJobs = filteredJobs.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      jobs: paginatedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredJobs.length,
        pages: Math.ceil(filteredJobs.length / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch matched jobs',
      error: err.message 
    });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Increment view count
    job.viewCount += 1;
    await job.save();

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch job',
      error: err.message 
    });
  }
});

// Get new jobs (posted in last 24 hours)
router.get('/new/recent', async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const jobs = await Job.find({
      isActive: true,
      postedDate: { $gte: yesterday }
    }).sort({ postedDate: -1 });

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch new jobs',
      error: err.message 
    });
  }
});

// Get job statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Job.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          byLocation: { $push: '$location' },
          byMode: { $push: '$mode' },
          byExperience: { $push: '$experience' }
        }
      }
    ]);

    const recentJobs = await Job.countDocuments({
      isActive: true,
      postedDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: stats[0] || { totalJobs: 0 },
      recentJobs
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stats',
      error: err.message 
    });
  }
});

// Create job (admin only - would need admin middleware)
router.post('/', async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();

    // Notify connected clients about new job
    const io = req.app.get('io');
    io.emit('new_job_posted', { job });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create job',
      error: err.message 
    });
  }
});

module.exports = router;
