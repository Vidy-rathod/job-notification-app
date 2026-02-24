const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['Remote', 'Hybrid', 'Onsite'],
    required: true
  },
  experience: {
    type: String,
    enum: ['Fresher', '0-1', '1-3', '3-5', '5+'],
    required: true
  },
  skills: [{
    type: String
  }],
  salaryRange: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [{
    type: String
  }],
  responsibilities: [{
    type: String
  }],
  source: {
    type: String,
    enum: ['LinkedIn', 'Indeed', 'Naukri', 'Company Website', 'Other'],
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  applyUrl: {
    type: String,
    required: true
  },
  postedDate: {
    type: Date,
    default: Date.now
  },
  postedDaysAgo: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  externalId: {
    type: String,
    unique: true,
    sparse: true
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ mode: 1 });
jobSchema.index({ experience: 1 });
jobSchema.index({ source: 1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ skills: 1 });

// Update postedDaysAgo before saving
jobSchema.pre('save', function(next) {
  const now = new Date();
  const posted = this.postedDate || now;
  const diffTime = Math.abs(now - posted);
  this.postedDaysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  this.updatedAt = now;
  next();
});

// Method to calculate match score
jobSchema.methods.calculateMatchScore = function(userPreferences) {
  if (!userPreferences) return 0;
  
  let score = 0;
  const keywords = userPreferences.roleKeywords?.toLowerCase().split(',').map(s => s.trim()).filter(s => s) || [];
  const userSkills = userPreferences.skills?.toLowerCase().split(',').map(s => s.trim()).filter(s => s) || [];

  // Role Keyword in Title (+25) or Description (+15)
  const titleMatch = keywords.some(k => this.title.toLowerCase().includes(k));
  const descMatch = keywords.some(k => this.description.toLowerCase().includes(k));
  if (titleMatch) score += 25;
  else if (descMatch) score += 15;

  // Location (+15)
  if (userPreferences.preferredLocations?.some(loc => 
    this.location.toLowerCase().includes(loc.toLowerCase())
  )) score += 15;

  // Mode (+10)
  if (userPreferences.preferredMode?.includes(this.mode)) score += 10;

  // Experience (+10)
  if (userPreferences.experienceLevel === this.experience) score += 10;

  // Skills overlap (+15)
  const jobSkills = this.skills.map(s => s.toLowerCase());
  if (userSkills.some(us => jobSkills.includes(us))) score += 15;

  // Recency (+5)
  if (this.postedDaysAgo <= 2) score += 5;

  // Source (+5)
  if (this.source === 'LinkedIn') score += 5;

  return Math.min(100, score);
};

module.exports = mongoose.model('Job', jobSchema);
