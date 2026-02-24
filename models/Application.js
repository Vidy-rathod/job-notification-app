const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
    default: 'Applied'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['Company Website', 'LinkedIn', 'Indeed', 'Naukri', 'Email', 'Referral', 'Other'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  history: [{
    status: String,
    date: { type: Date, default: Date.now },
    note: String
  }],
  followUpDate: {
    type: Date
  },
  interviewDates: [{
    type: Date
  }],
  offerDetails: {
    salary: String,
    joiningDate: Date,
    benefits: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate applications
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ appliedDate: -1 });

// Update timestamps
applicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for days since applied
applicationSchema.virtual('daysSinceApplied').get(function() {
  return Math.floor((new Date() - this.appliedDate) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Application', applicationSchema);
