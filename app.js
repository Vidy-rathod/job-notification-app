// ==========================================
// JOBHUNT - REAL-TIME FRONTEND APPLICATION
// Connects to Node.js Backend API
// ==========================================

const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

// Global State
let currentUser = null;
let authToken = localStorage.getItem('jobHuntToken');
let socket = null;
let preferences = null;
let currentRoute = 'landing';
let showOnlyMatches = false;

// ==========================================
// API SERVICE
// ==========================================
const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      ...options
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  },
  
  // Auth
  register: (userData) => api.request('/auth/register', { method: 'POST', body: userData }),
  login: (credentials) => api.request('/auth/login', { method: 'POST', body: credentials }),
  verify: () => api.request('/auth/verify'),
  
  // Jobs
  getJobs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/jobs?${query}`);
  },
  getMatchedJobs: (minScore = 0) => api.request(`/jobs/matched?minScore=${minScore}`),
  getJob: (id) => api.request(`/jobs/${id}`),
  
  // Applications
  getApplications: () => api.request('/applications'),
  createApplication: (data) => api.request('/applications', { method: 'POST', body: data }),
  updateApplicationStatus: (id, status, note) => 
    api.request(`/applications/${id}/status`, { method: 'PATCH', body: { status, note } }),
  withdrawApplication: (id) => api.request(`/applications/${id}/withdraw`, { method: 'PATCH' }),
  
  // User
  getProfile: () => api.request('/user/profile'),
  updatePreferences: (prefs) => api.request('/user/preferences', { method: 'PATCH', body: prefs }),
  getSavedJobs: () => api.request('/user/saved-jobs'),
  toggleSaveJob: (jobId) => api.request(`/user/saved-jobs/${jobId}`, { method: 'POST' }),
  getActivities: () => api.request('/user/activities'),
  
  // Digest
  generateDigest: () => api.request('/digest/generate')
};

// ==========================================
// WEBSOCKET SERVICE
// ==========================================
const initSocket = () => {
  if (!authToken) return;
  
  socket = io(SOCKET_URL);
  
  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('authenticate', authToken);
  });
  
  socket.on('application_created', (data) => {
    showToast(data.message, 'success');
    updateStats();
  });
  
  socket.on('application_updated', (data) => {
    showToast(data.message, 'success');
    updateStats();
    if (currentRoute === 'applications') {
      renderRoute();
    }
  });
  
  socket.on('daily_digest_ready', (data) => {
    showToast(data.message, 'info');
  });
  
  socket.on('new_jobs_available', (data) => {
    showToast(`${data.count} new jobs available!`, 'info');
    document.getElementById('newJobsCount').innerText = data.count;
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
};

// ==========================================
// AUTHENTICATION
// ==========================================
const checkAuth = async () => {
  if (!authToken) {
    showLoginModal();
    return false;
  }
  
  try {
    const data = await api.verify();
    currentUser = data.user;
    preferences = currentUser.preferences;
    initSocket();
    return true;
  } catch (err) {
    localStorage.removeItem('jobHuntToken');
    authToken = null;
    showLoginModal();
    return false;
  }
};

const login = async (email, password) => {
  try {
    const data = await api.login({ email, password });
    authToken = data.token;
    currentUser = data.user;
    preferences = currentUser.preferences;
    localStorage.setItem('jobHuntToken', authToken);
    initSocket();
    closeLoginModal();
    showToast('Login successful!', 'success');
    renderRoute();
    return true;
  } catch (err) {
    showToast(err.message, 'error');
    return false;
  }
};

const register = async (name, email, password) => {
  try {
    const data = await api.register({ name, email, password });
    authToken = data.token;
    currentUser = data.user;
    preferences = currentUser.preferences;
    localStorage.setItem('jobHuntToken', authToken);
    initSocket();
    closeLoginModal();
    showToast('Registration successful!', 'success');
    renderRoute();
    return true;
  } catch (err) {
    showToast(err.message, 'error');
    return false;
  }
};

const logout = () => {
  localStorage.removeItem('jobHuntToken');
  authToken = null;
  currentUser = null;
  preferences = null;
  if (socket) socket.disconnect();
  showToast('Logged out successfully', 'info');
  navigate('landing');
};

// ==========================================
// ROUTING
// ==========================================
const routes = {
  'landing': { title: 'Find Your Dream Job', render: renderLanding },
  'dashboard': { title: 'Find Jobs', render: renderDashboard },
  'applications': { title: 'My Applications', render: renderApplications },
  'saved': { title: 'Saved Jobs', render: renderSaved },
  'digest': { title: 'Daily Digest', render: renderDigest },
  'settings': { title: 'Settings', render: renderSettings }
};

function navigate(route) {
  window.location.hash = route === 'landing' ? '' : route;
}

async function renderRoute() {
  const hash = window.location.hash.replace('#', '') || 'landing';
  const route = routes[hash] || routes['landing'];
  currentRoute = hash;
  
  // Check auth for protected routes
  if (hash !== 'landing' && !await checkAuth()) {
    return;
  }
  
  document.getElementById('pageTitle').innerText = route.title;
  document.getElementById('primaryWorkspace').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  
  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-route') === hash);
  });
  
  // Show/hide sidebar
  const sidebar = document.getElementById('secondaryPanel');
  if (sidebar) {
    sidebar.style.display = hash === 'landing' ? 'none' : 'block';
  }
  
  // Update stats
  if (currentUser) {
    await updateStats();
  }
  
  // Render content
  try {
    const content = await route.render();
    document.getElementById('primaryWorkspace').innerHTML = content;
  } catch (err) {
    document.getElementById('primaryWorkspace').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error loading content</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
  
  window.scrollTo(0, 0);
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================
async function renderLanding() {
  const isLoggedIn = !!currentUser;
  
  return `
    <div class="landing-container">
      <div class="hero-section">
        <h1 class="hero-title">Find Your Dream Job</h1>
        <p class="hero-subtext">Track applications, discover opportunities, and land your perfect role.</p>
        ${isLoggedIn ? `
          <div class="hero-actions">
            <button onclick="navigate('dashboard')" class="btn btn--primary btn--large">
              <i class="fas fa-search"></i> Find Jobs
            </button>
            <button onclick="navigate('applications')" class="btn btn--outline btn--large">
              <i class="fas fa-paper-plane"></i> My Applications
            </button>
          </div>
        ` : `
          <button onclick="showLoginModal()" class="btn btn--primary btn--large">
            <i class="fas fa-rocket"></i> Get Started
          </button>
        `}
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-bullseye"></i></div>
          <h3>Smart Matching</h3>
          <p>AI-powered job matching based on your skills and preferences</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-chart-line"></i></div>
          <h3>Track Progress</h3>
          <p>Monitor your applications from submission to offer</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-bell"></i></div>
          <h3>Real-time Alerts</h3>
          <p>Get instant notifications for new jobs and updates</p>
        </div>
      </div>
    </div>
  `;
}

async function renderDashboard() {
  try {
    const data = await api.getMatchedJobs(preferences?.minMatchScore || 0);
    const jobs = data.jobs || [];
    
    return `
      <div class="dashboard-header">
        <div class="results-count">
          <span class="count-number">${jobs.length}</span>
          <span class="count-label">matching jobs</span>
        </div>
      </div>
      <div class="job-grid">
        ${jobs.length ? jobs.map(job => renderJobCard(job)).join('') : `
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <h3>No matching jobs found</h3>
            <p>Try adjusting your preferences in settings.</p>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    return `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

function renderJobCard(job) {
  const isSaved = currentUser?.savedJobs?.includes(job._id);
  const hasApplied = false; // Would need to check applications
  
  return `
    <div class="job-card">
      <div class="job-meta">
        <span class="job-source"><i class="fas fa-building"></i> ${job.source}</span>
        <span class="score-badge score-badge--${getScoreClass(job.matchScore)}">${job.matchScore}% Match</span>
      </div>
      <h2 class="job-title">${job.title}</h2>
      <p class="job-company"><i class="fas fa-briefcase"></i> ${job.company}</p>
      <div class="job-details">
        <span class="job-detail-item"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
        <span class="job-detail-item"><i class="fas fa-home"></i> ${job.mode}</span>
        <span class="job-detail-item"><i class="fas fa-user-clock"></i> ${job.experience}</span>
        <span class="job-detail-item"><i class="fas fa-money-bill-wave"></i> ${job.salaryRange}</span>
      </div>
      <div class="job-skills">
        ${job.skills.slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
      <p class="job-posted"><i class="fas fa-clock"></i> Posted ${job.postedDaysAgo} days ago</p>
      <div class="job-actions">
        <button class="btn btn--outline btn--icon" onclick="viewJob('${job._id}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn--outline btn--icon ${isSaved ? 'btn--active' : ''}" onclick="toggleSaveJob('${job._id}')">
          <i class="fas ${isSaved ? 'fa-bookmark' : 'fa-bookmark-o'}"></i>
        </button>
        <button class="btn btn--primary" onclick="openApplyModal('${job._id}')">
          <i class="fas fa-paper-plane"></i> Apply
        </button>
      </div>
    </div>
  `;
}

async function renderApplications() {
  try {
    const data = await api.getApplications();
    const applications = data.applications || [];
    
    if (applications.length === 0) {
      return `
        <div class="empty-state empty-state--large">
          <i class="fas fa-paper-plane"></i>
          <h3>No applications yet</h3>
          <p>Start applying to jobs and track your progress here.</p>
          <button onclick="navigate('dashboard')" class="btn btn--primary">Find Jobs</button>
        </div>
      `;
    }
    
    return `
      <div class="applications-container">
        ${applications.map(app => `
          <div class="application-card">
            <div class="app-header">
              <div class="app-info">
                <h3>${app.jobId.title}</h3>
                <p><i class="fas fa-building"></i> ${app.jobId.company}</p>
              </div>
              <span class="status-badge status-badge--${getStatusClass(app.status)}">${app.status}</span>
            </div>
            <div class="app-details">
              <span><i class="fas fa-calendar"></i> Applied ${Math.floor((new Date() - new Date(app.appliedDate)) / (1000 * 60 * 60 * 24))} days ago</span>
              <span><i class="fas fa-globe"></i> via ${app.method}</span>
            </div>
            ${app.notes ? `<p class="app-notes"><i class="fas fa-sticky-note"></i> ${app.notes}</p>` : ''}
            <div class="app-actions">
              <select class="form-select form-select--small" onchange="updateAppStatus('${app._id}', this.value)">
                <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                <option value="Screening" ${app.status === 'Screening' ? 'selected' : ''}>Screening</option>
                <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
                <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              </select>
              ${app.status !== 'Withdrawn' ? `
                <button class="btn btn--outline btn--small btn--danger" onclick="withdrawApp('${app._id}')">
                  <i class="fas fa-times"></i> Withdraw
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    return `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

// ==========================================
// ACTIONS
// ==========================================
async function toggleSaveJob(jobId) {
  try {
    const data = await api.toggleSaveJob(jobId);
    showToast(data.message, 'success');
    renderRoute();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitApplication(jobId) {
  try {
    const method = document.getElementById('applyMethod').value;
    const notes = document.getElementById('applyNotes').value;
    const appliedDate = document.getElementById('applyDate').value;
    
    await api.createApplication({ jobId, method, notes, appliedDate });
    closeApplyModal();
    showToast('Application submitted successfully!', 'success');
    renderRoute();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateAppStatus(appId, status) {
  try {
    await api.updateApplicationStatus(appId, status);
    showToast(`Status updated to ${status}`, 'success');
    
    // Also emit via socket for real-time
    if (socket) {
      socket.emit('application_update', { applicationId: appId, status });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function withdrawApp(appId) {
  if (!confirm('Are you sure you want to withdraw this application?')) return;
  
  try {
    await api.withdrawApplication(appId);
    showToast('Application withdrawn', 'info');
    renderRoute();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// UI HELPERS
// ==========================================
function getScoreClass(score) {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  if (score >= 40) return 'neutral';
  return 'grey';
}

function getStatusClass(status) {
  const classes = {
    'Applied': 'blue',
    'Screening': 'amber',
    'Interview': 'purple',
    'Offer': 'green',
    'Rejected': 'red',
    'Withdrawn': 'grey'
  };
  return classes[status] || 'neutral';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function updateStats() {
  if (!currentUser) return;
  
  try {
    const [appsData, activitiesData] = await Promise.all([
      api.getApplications(),
      api.getActivities()
    ]);
    
    const apps = appsData.applications || [];
    const activities = activitiesData.activities || [];
    
    // Update header stats
    document.getElementById('appliedCount').innerText = apps.filter(a => a.status !== 'Withdrawn').length;
    document.getElementById('savedCount').innerText = currentUser.savedJobs?.length || 0;
    
    // Update sidebar
    const applied = apps.filter(a => a.status !== 'Withdrawn').length;
    const interview = apps.filter(a => ['Interview', 'Offer'].includes(a.status)).length;
    const offer = apps.filter(a => a.status === 'Offer').length;
    const total = Math.max(applied, 1);
    
    document.getElementById('statApplied').innerText = applied;
    document.getElementById('statInterview').innerText = interview;
    document.getElementById('statOffer').innerText = offer;
    
    document.getElementById('barApplied').style.width = `${(applied / total) * 100}%`;
    document.getElementById('barInterview').style.width = `${(interview / total) * 100}%`;
    document.getElementById('barOffer').style.width = `${(offer / total) * 100}%`;
    
    // Update activities
    const activityContainer = document.getElementById('recentActivity');
    if (activityContainer && activities.length > 0) {
      activityContainer.innerHTML = activities.slice(0, 5).map(a => `
        <div class="activity-item">
          <div class="activity-icon"><i class="fas fa-check-circle"></i></div>
          <div class="activity-content">
            <p class="activity-action">${a.action}</p>
            <p class="activity-details">${a.details}</p>
            <p class="activity-time">${new Date(a.time).toLocaleTimeString()}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error updating stats:', err);
  }
}

// ==========================================
// MODALS
// ==========================================
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}

function openApplyModal(jobId) {
  document.getElementById('applyModalBody').innerHTML = `
    <div class="apply-modal-header">
      <h2><i class="fas fa-paper-plane"></i> Apply for Job</h2>
    </div>
    <form onsubmit="event.preventDefault(); submitApplication('${jobId}');">
      <div class="form-group">
        <label class="form-label">Applied Date</label>
        <input type="date" id="applyDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Application Method</label>
        <select id="applyMethod" class="form-select">
          <option>Company Website</option>
          <option>LinkedIn</option>
          <option>Indeed</option>
          <option>Naukri</option>
          <option>Email</option>
          <option>Referral</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="applyNotes" class="form-input" rows="3" placeholder="Any notes..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn--outline" onclick="closeApplyModal()">Cancel</button>
        <button type="submit" class="btn btn--primary"><i class="fas fa-check"></i> Submit</button>
      </div>
    </form>
  `;
  document.getElementById('applyModal').style.display = 'flex';
}

function closeApplyModal() {
  document.getElementById('applyModal').style.display = 'none';
}

function closeModal() {
  document.getElementById('jobModal').style.display = 'none';
}

function toggleMobileMenu() {
  document.getElementById('mobileNav').classList.toggle('active');
}

// ==========================================
// AUTH UI HELPERS
// ==========================================
function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  if (tab === 'login') {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  } else {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  await login(email, password);
}

async function handleRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  await register(name, email, password);
}

// Placeholder functions for missing routes
async function renderSaved() {
  return '<div class="empty-state"><h3>Saved Jobs</h3><p>Feature coming soon...</p></div>';
}

async function renderDigest() {
  return '<div class="empty-state"><h3>Daily Digest</h3><p>Feature coming soon...</p></div>';
}

async function renderSettings() {
  return '<div class="empty-state"><h3>Settings</h3><p>Feature coming soon...</p></div>';
}

function viewJob(jobId) {
  showToast('Job details - Feature coming soon...', 'info');
}

// ==========================================
// INITIALIZATION
// ==========================================
window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', async () => {
  // Check if already logged in
  if (authToken) {
    await checkAuth();
  }
  renderRoute();
});
