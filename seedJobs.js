const mongoose = require('mongoose');
const Job = require('./models/Job');
require('dotenv').config();

const jobsData = [
  {
    title: "SDE Intern",
    company: "Amazon",
    location: "Bangalore",
    mode: "Onsite",
    experience: "Fresher",
    skills: ["Java", "Data Structures", "Algorithms"],
    salaryRange: "₹40k–₹60k/month",
    description: "Join our team as an SDE Intern and work on large-scale distributed systems. You will collaborate with senior engineers to build features that impact millions of customers globally.",
    source: "LinkedIn",
    sourceUrl: "https://amazon.jobs",
    applyUrl: "https://amazon.jobs/en/jobs/2544211/software-development-engineer-intern",
    postedDaysAgo: 1
  },
  {
    title: "Graduate Engineer Trainee",
    company: "TCS",
    location: "Mumbai",
    mode: "Hybrid",
    experience: "Fresher",
    skills: ["C++", "PL/SQL", "Aptitude"],
    salaryRange: "3.5–4.5 LPA",
    description: "TCS is looking for GETs to join our various business units. This is a great opportunity for fresh graduates to start their career in a global IT services firm.",
    source: "Naukri",
    sourceUrl: "https://www.tcs.com",
    applyUrl: "https://www.tcs.com/careers/india/graduate-engineer-trainee",
    postedDaysAgo: 2
  },
  {
    title: "Junior Backend Developer",
    company: "Swiggy",
    location: "Bangalore",
    mode: "Remote",
    experience: "1-3",
    skills: ["Node.js", "Express", "PostgreSQL", "Redis"],
    salaryRange: "10–15 LPA",
    description: "Build robust APIs and microservices that power the Swiggy delivery ecosystem. You will work on scaling our backend to handle thousands of requests per second.",
    source: "Indeed",
    sourceUrl: "https://swiggy.wd3.myworkdayjobs.com",
    applyUrl: "https://swiggy.wd3.myworkdayjobs.com/en-US/Swiggy/job/Engineering-Backend-Developer",
    postedDaysAgo: 0
  },
  {
    title: "Frontend Intern",
    company: "Razorpay",
    location: "Bangalore",
    mode: "Onsite",
    experience: "Fresher",
    skills: ["React", "TypeScript", "Tailwind CSS"],
    salaryRange: "₹25k–₹35k/month",
    description: "Work with our design and engineering teams to build beautiful and intuitive payment interfaces. You will learn how to build production-ready React applications.",
    source: "LinkedIn",
    sourceUrl: "https://razorpay.com",
    applyUrl: "https://razorpay.com/jobs/frontend-intern",
    postedDaysAgo: 3
  },
  {
    title: "Data Analyst Intern",
    company: "Flipkart",
    location: "Bangalore",
    mode: "Hybrid",
    experience: "Fresher",
    skills: ["Python", "SQL", "Tableau", "Excel"],
    salaryRange: "₹20k–₹30k/month",
    description: "Analyze customer data to generate insights that drive business decisions. You will work with large datasets and learn advanced SQL and data visualization techniques.",
    source: "Indeed",
    sourceUrl: "https://flipkart.com",
    applyUrl: "https://flipkart.com/careers/jobs/data-analyst-intern",
    postedDaysAgo: 4
  },
  {
    title: "Java Developer",
    company: "Infosys",
    location: "Pune",
    mode: "Onsite",
    experience: "0-1",
    skills: ["Java", "Spring Boot", "Microservices"],
    salaryRange: "4–6 LPA",
    description: "Develop enterprise-grade Java applications for our global clients. You will be part of an agile team and contribute to all phases of the development lifecycle.",
    source: "Naukri",
    sourceUrl: "https://infosys.com",
    applyUrl: "https://infosys.com/careers/java-developer",
    postedDaysAgo: 5
  },
  {
    title: "Python Developer",
    company: "Wipro",
    location: "Hyderabad",
    mode: "Hybrid",
    experience: "Fresher",
    skills: ["Python", "Django", "REST APIs"],
    salaryRange: "3.5–5 LPA",
    description: "Join Wipro as a Python Developer and work on innovative projects in AI and Automation. You will write clean, scalable code and collaborate with cross-functional teams.",
    source: "LinkedIn",
    sourceUrl: "https://wipro.com",
    applyUrl: "https://wipro.com/careers/python-developer",
    postedDaysAgo: 1
  },
  {
    title: "React Developer",
    company: "Zomato",
    location: "Gurgaon",
    mode: "Remote",
    experience: "1-3",
    skills: ["React", "Redux", "JavaScript", "HTML/CSS"],
    salaryRange: "12–18 LPA",
    description: "Craft amazing user experiences for Zomato's millions of users. You will build high-performance web applications and ensure seamless integration with our backend services.",
    source: "Indeed",
    sourceUrl: "https://zomato.com",
    applyUrl: "https://zomato.com/careers/react-developer",
    postedDaysAgo: 2
  },
  {
    title: "QA Intern",
    company: "Cognizant",
    location: "Chennai",
    mode: "Onsite",
    experience: "Fresher",
    skills: ["Manual Testing", "Selenium", "Java"],
    salaryRange: "₹15k–₹20k/month",
    description: "Learn the fundamentals of software quality assurance. You will participate in test planning, execution, and bug tracking.",
    source: "Naukri",
    sourceUrl: "https://cognizant.com",
    applyUrl: "https://cognizant.com/careers/qa-intern",
    postedDaysAgo: 6
  },
  {
    title: "Full Stack Engineer",
    company: "Paytm",
    location: "Noida",
    mode: "Hybrid",
    experience: "1-3",
    skills: ["React", "Node.js", "MongoDB", "Docker"],
    salaryRange: "14–22 LPA",
    description: "Build the future of digital payments in India. You will work on both frontend and backend systems, ensuring high availability and security.",
    source: "LinkedIn",
    sourceUrl: "https://paytm.com",
    applyUrl: "https://paytm.com/careers/fullstack-engineer",
    postedDaysAgo: 0
  }
];

const seedJobs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobhunt');
    console.log('Connected to MongoDB');

    // Clear existing jobs
    await Job.deleteMany({});
    console.log('Cleared existing jobs');

    // Insert new jobs
    for (const jobData of jobsData) {
      const job = new Job({
        ...jobData,
        postedDate: new Date(Date.now() - jobData.postedDaysAgo * 24 * 60 * 60 * 1000)
      });
      await job.save();
    }

    console.log(`Seeded ${jobsData.length} jobs successfully`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding jobs:', err);
    process.exit(1);
  }
};

seedJobs();
