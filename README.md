# QUICK START GUIDE

## STEP 1: Connect MongoDB (Choose One)

### Option A: MongoDB Atlas (Cloud - Easiest)
1. Go to https://www.mongodb.com/atlas
2. Sign up free → Create cluster
3. Click "Connect" → "Drivers" → "Node.js"
4. Copy connection string
5. Replace in `.env.local` file:
```
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/jobhunt
```

### Option B: Local MongoDB
1. Install MongoDB Community from https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Use: `MONGODB_URI=mongodb://localhost:27017/jobhunt`

## STEP 2: Run Locally

```bash
# Install dependencies
npm install

# Start server
npm start

# Open browser
http://localhost:8080
```

## STEP 3: Deploy to Vercel

### Install Vercel CLI
```bash
npm i -g vercel
```

### Login and Deploy
```bash
vercel login
vercel
```

### Add Environment Variables on Vercel
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
```

Then: `vercel --prod`

---

# JobHunt - Real-Time Job Tracking Application

A full-stack real-time job tracking application with MongoDB database, WebSocket connections, user authentication, and external API integrations.

## Features

### Backend (Node.js/Express)
- **User Authentication**: JWT-based auth with registration/login
- **MongoDB Database**: Persistent storage for users, jobs, applications
- **Real-time Updates**: WebSocket (Socket.IO) for live notifications
- **REST API**: Full CRUD operations for jobs and applications
- **External Job APIs**: Integration ready for LinkedIn, Indeed
- **Email Notifications**: Daily digest and application confirmations
- **Scheduled Tasks**: Automated job fetching and digest generation

### Frontend
- Modern responsive UI with real-time updates
- Job search with advanced filters
- Application tracking with status updates
- Daily digest generation
- Activity tracking
- Progress statistics

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.IO
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Real-time**: WebSocket (Socket.IO)
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Setup
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
MONGODB_URI=mongodb://localhost:27017/jobhunt
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=3000
```

### Step 3: Seed Database
```bash
node seedJobs.js
```

### Step 4: Start Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Step 5: Access Application
- Frontend: http://localhost:8080
- API: http://localhost:3000/api
- Health Check: http://localhost:3000/api/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Jobs
- `GET /api/jobs` - Get all jobs with filters
- `GET /api/jobs/matched` - Get jobs with match scores (auth required)
- `GET /api/jobs/:id` - Get single job
- `GET /api/jobs/new/recent` - Get jobs posted in last 24h

### Applications
- `GET /api/applications` - Get user's applications
- `POST /api/applications` - Create new application
- `PATCH /api/applications/:id/status` - Update application status
- `PATCH /api/applications/:id/withdraw` - Withdraw application

### User
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/preferences` - Update preferences
- `GET /api/user/saved-jobs` - Get saved jobs
- `POST /api/user/saved-jobs/:id` - Toggle save job
- `GET /api/user/activities` - Get activity history

### Digest
- `GET /api/digest/generate` - Generate daily digest

## Real-time Events (WebSocket)

### Client → Server
- `authenticate` - Authenticate socket connection
- `join_job` - Join a job room for updates
- `application_update` - Update application status
- `save_job` - Save/unsave a job

### Server → Client
- `application_created` - New application created
- `application_updated` - Application status updated
- `job_saved` - Job saved/unsaved
- `daily_digest_ready` - Daily digest generated
- `new_jobs_available` - New jobs posted
- `new_job_posted` - Real-time job posting

## External API Integrations

The application is ready to integrate with:
- LinkedIn Jobs API
- Indeed API
- Custom job feeds

Configure API keys in `.env` file.

## Scheduled Tasks

- **Daily Digest**: Every day at 9:00 AM
- **Job Fetching**: Every 6 hours
- **Activity Cleanup**: Weekly (removes 30+ day old activities)

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- JWT authentication
- Password hashing with bcrypt
- Input validation

## Production Deployment

### Using Docker
```bash
docker build -t jobhunt .
docker run -p 3000:3000 -p 8080:8080 jobhunt
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobhunt
JWT_SECRET=your-production-secret
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
