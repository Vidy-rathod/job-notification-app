const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    // Skip if no email config
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email not sent - no configuration provided');
      return { success: false, message: 'Email configuration missing' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"JobHunt" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: err.message };
  }
};

const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to JobHunt!';
  const html = `
    <h2>Welcome to JobHunt, ${user.name}!</h2>
    <p>Thank you for joining JobHunt. We're excited to help you find your dream job.</p>
    <p>Get started by:</p>
    <ul>
      <li>Setting up your job preferences</li>
      <li>Browsing personalized job recommendations</li>
      <li>Tracking your applications</li>
    </ul>
    <p><a href="${process.env.FRONTEND_URL}/settings">Set Up Preferences</a></p>
  `;
  
  return await sendEmail(user.email, subject, html);
};

const sendApplicationConfirmation = async (user, job) => {
  const subject = `Application Submitted - ${job.title}`;
  const html = `
    <h2>Application Submitted!</h2>
    <p>Hi ${user.name},</p>
    <p>You have successfully applied for:</p>
    <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3 style="margin: 0;">${job.title}</h3>
      <p style="margin: 8px 0; color: #64748b;">${job.company} • ${job.location}</p>
    </div>
    <p>Track your application status in your <a href="${process.env.FRONTEND_URL}/applications">dashboard</a>.</p>
    <p>Good luck!</p>
  `;
  
  return await sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendApplicationConfirmation
};
