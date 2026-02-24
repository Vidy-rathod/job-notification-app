const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobhunt', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Models
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Activity = require('./models/Activity');

// Middleware
const auth = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', auth, require('./routes/applications'));
app.use('/api/user', auth, require('./routes/user'));
app.use('/api/digest', auth, require('./routes/digest'));
app.use('/api/notifications', auth, require('./routes/notifications'));

// Real-time Socket.IO connections
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User authentication for socket
  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      connectedUsers.set(decoded.userId, socket);
      socket.join(`user_${decoded.userId}`);
      console.log(`User ${decoded.userId} authenticated on socket`);
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
    }
  });

  // Join job room for real-time updates
  socket.on('join_job', (jobId) => {
    socket.join(`job_${jobId}`);
  });

  // Leave job room
  socket.on('leave_job', (jobId) => {
    socket.leave(`job_${jobId}`);
  });

  // Real-time application updates
  socket.on('application_update', async (data) => {
    try {
      const { applicationId, status, note } = data;
      
      // Update application in database
      const application = await Application.findByIdAndUpdate(
        applicationId,
        { 
          status,
          $push: { 
            history: { status, date: new Date(), note } 
          }
        },
        { new: true }
      ).populate('jobId');

      if (application) {
        // Create activity record
        await Activity.create({
          userId: socket.userId,
          action: 'Status Update',
          details: `${application.jobId.title} - ${status}`,
          time: new Date()
        });

        // Emit to user's room
        io.to(`user_${socket.userId}`).emit('application_updated', {
          application,
          message: `Application status updated to ${status}`
        });

        // Emit to job room
        io.to(`job_${application.jobId._id}`).emit('job_application_updated', {
          jobId: application.jobId._id,
          applicationCount: await Application.countDocuments({ jobId: application.jobId._id })
        });
      }
    } catch (err) {
      console.error('Application update error:', err);
      socket.emit('error', { message: 'Failed to update application' });
    }
  });

  // Real-time job saving
  socket.on('save_job', async (data) => {
    try {
      const { jobId } = data;
      const user = await User.findById(socket.userId);
      
      if (!user.savedJobs.includes(jobId)) {
        user.savedJobs.push(jobId);
        await user.save();

        await Activity.create({
          userId: socket.userId,
          action: 'Saved Job',
          details: `Job ID: ${jobId}`,
          time: new Date()
        });

        io.to(`user_${socket.userId}`).emit('job_saved', { jobId });
      }
    } catch (err) {
      console.error('Save job error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });
});

// Make io accessible to routes
app.set('io', io);

// Scheduled tasks
// Daily job digest at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily digest job...');
  const { generateDailyDigests } = require('./services/digestService');
  await generateDailyDigests(io);
});

// Fetch new jobs every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Fetching new jobs from external sources...');
  const { fetchExternalJobs } = require('./services/jobService');
  const newJobs = await fetchExternalJobs();
  
  if (newJobs.length > 0) {
    io.emit('new_jobs_available', { count: newJobs.length });
  }
});

// Clean up old activities weekly
cron.schedule('0 0 * * 0', async () => {
  console.log('Cleaning up old activities...');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Activity.deleteMany({ time: { $lt: thirtyDaysAgo } });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size
  });
});

// For Vercel serverless deployment
if (process.env.VERCEL) {
  module.exports = server;
} else {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 JobHunt Real-Time Server Running on port ${PORT}    ║
║                                                        ║
║   API Endpoints:                                       ║
║   • POST /api/auth/register                           ║
║   • POST /api/auth/login                              ║
║   • GET  /api/jobs                                    ║
║   • GET  /api/jobs/:id                                ║
║   • POST /api/applications                            ║
║   • GET  /api/applications                            ║
║   • GET  /api/user/profile                            ║
║   • GET  /api/digest/generate                         ║
║                                                        ║
║   WebSocket: Enabled for real-time updates            ║
║   Database: MongoDB                                   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
  });
}

module.exports = { app, server, io };
