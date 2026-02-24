const User = require('../models/User');
const Job = require('../models/Job');
const Activity = require('../models/Activity');
const { sendEmail } = require('./emailService');

const generateDailyDigests = async (io) => {
  try {
    // Get all users with daily digest enabled
    const users = await User.find({ 'notifications.dailyDigest': true });
    
    console.log(`Generating daily digests for ${users.length} users...`);
    
    for (const user of users) {
      try {
        // Get matched jobs
        const jobs = await Job.find({ isActive: true });
        
        const matchedJobs = jobs
          .map(job => ({
            ...job.toObject(),
            matchScore: job.calculateMatchScore(user.preferences)
          }))
          .filter(job => job.matchScore >= (user.preferences.minMatchScore || 40))
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10);
        
        if (matchedJobs.length === 0) continue;
        
        // Store digest in user's record (optional)
        const digest = {
          date: new Date(),
          jobs: matchedJobs
        };
        
        // Create activity
        await Activity.create({
          userId: user._id,
          action: 'Generated Digest',
          details: `${matchedJobs.length} job recommendations`,
          time: new Date()
        });
        
        // Send real-time notification
        io.to(`user_${user._id}`).emit('daily_digest_ready', {
          digest,
          message: `Your daily digest with ${matchedJobs.length} jobs is ready!`
        });
        
        // Send email if enabled
        if (user.notifications.email) {
          await sendDigestEmail(user, matchedJobs);
        }
        
      } catch (err) {
        console.error(`Error generating digest for user ${user._id}:`, err);
      }
    }
    
    console.log('Daily digest generation complete');
  } catch (err) {
    console.error('Error in daily digest generation:', err);
  }
};

const sendDigestEmail = async (user, jobs) => {
  const subject = `Your Daily Job Digest - ${new Date().toLocaleDateString()}`;
  
  const html = `
    <h2>Hello ${user.name},</h2>
    <p>Here are your top ${jobs.length} job matches for today:</p>
    <ul>
      ${jobs.map(job => `
        <li>
          <strong>${job.title}</strong> at ${job.company}<br>
          Location: ${job.location} | Match: ${job.matchScore}%<br>
          <a href="${job.applyUrl}">Apply Now</a>
        </li>
      `).join('')}
    </ul>
    <p>View all recommendations in your <a href="${process.env.FRONTEND_URL}">JobHunt dashboard</a>.</p>
  `;
  
  await sendEmail(user.email, subject, html);
};

module.exports = {
  generateDailyDigests,
  sendDigestEmail
};
