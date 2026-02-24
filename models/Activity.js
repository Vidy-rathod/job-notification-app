const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['Applied', 'Status Update', 'Saved Job', 'Unsaved Job', 'Generated Digest', 'Updated Preferences', 'Viewed Job', 'Withdrawn']
  },
  details: {
    type: String,
    required: true
  },
  metadata: {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    oldStatus: String,
    newStatus: String
  },
  time: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
activitySchema.index({ userId: 1, time: -1 });
activitySchema.index({ time: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

module.exports = mongoose.model('Activity', activitySchema);
