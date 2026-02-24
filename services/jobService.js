const axios = require('axios');
const Job = require('../models/Job');

// Mock external job APIs (replace with real API integrations)
const fetchExternalJobs = async () => {
  const newJobs = [];
  
  try {
    // Example: LinkedIn API integration
    // const linkedInJobs = await fetchLinkedInJobs();
    
    // Example: Indeed API integration
    // const indeedJobs = await fetchIndeedJobs();
    
    // For demo, generate some mock new jobs
    const mockJobs = generateMockJobs();
    
    for (const jobData of mockJobs) {
      // Check if job already exists
      const existing = await Job.findOne({ externalId: jobData.externalId });
      if (!existing) {
        const job = new Job(jobData);
        await job.save();
        newJobs.push(job);
      }
    }
    
    console.log(`Added ${newJobs.length} new jobs`);
    return newJobs;
  } catch (err) {
    console.error('Error fetching external jobs:', err);
    return [];
  }
};

const generateMockJobs = () => {
  const companies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Apple'];
  const titles = ['Senior Software Engineer', 'Full Stack Developer', 'DevOps Engineer', 'Product Manager', 'Data Scientist'];
  const locations = ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Remote'];
  
  return companies.flatMap(company => 
    titles.map((title, idx) => ({
      title: `${title} at ${company}`,
      company,
      location: locations[Math.floor(Math.random() * locations.length)],
      mode: ['Remote', 'Hybrid', 'Onsite'][Math.floor(Math.random() * 3)],
      experience: ['1-3', '3-5', '5+'][Math.floor(Math.random() * 3)],
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
      salaryRange: '20-40 LPA',
      description: `Exciting opportunity at ${company} for ${title}`,
      source: 'External API',
      sourceUrl: 'https://example.com',
      applyUrl: 'https://example.com/apply',
      externalId: `ext-${company}-${idx}-${Date.now()}`,
      postedDate: new Date()
    }))
  );
};

// Real LinkedIn API integration (requires API key)
const fetchLinkedInJobs = async () => {
  try {
    const response = await axios.get('https://api.linkedin.com/v2/jobs', {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_API_KEY}`
      },
      params: {
        location: 'India',
        count: 50
      }
    });
    return response.data.elements || [];
  } catch (err) {
    console.error('LinkedIn API error:', err.message);
    return [];
  }
};

// Real Indeed API integration (requires API key)
const fetchIndeedJobs = async () => {
  try {
    const response = await axios.get('https://api.indeed.com/ads/apisearch', {
      params: {
        publisher: process.env.INDEED_API_KEY,
        q: 'software engineer',
        l: 'India',
        limit: 50,
        format: 'json'
      }
    });
    return response.data.results || [];
  } catch (err) {
    console.error('Indeed API error:', err.message);
    return [];
  }
};

module.exports = {
  fetchExternalJobs,
  fetchLinkedInJobs,
  fetchIndeedJobs
};
