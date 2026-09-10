// PM Tool Shared App & Auth Script
const API_BASE = '/api';

const PMAuth = {
  getToken() {
    return localStorage.getItem('alpha_pm_token');
  },
  getUser() {
    const u = localStorage.getItem('alpha_pm_user');
    return u ? JSON.parse(u) : null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  setAuth(token, user) {
    localStorage.setItem('alpha_pm_token', token);
    localStorage.setItem('alpha_pm_user', JSON.stringify(user));
    this.updateUI();
  },
  logout() {
    localStorage.removeItem('alpha_pm_token');
    localStorage.removeItem('alpha_pm_user');
    Toast.show('Logged out', 'info');
    setTimeout(() => window.location.href = '/', 400);
  },
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      this.setAuth(data.token, data.user);
      Toast.show(`Welcome back, ${data.user.name}!`, 'success');
      return true;
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },
  updateUI() {
    const user = this.getUser();
    const navAuth = document.getElementById('nav-auth-section');
    if (!navAuth) return;

    if (user) {
      navAuth.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.8rem;">
          <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
          <div style="font-size:0.88rem; font-weight:700;">${user.name}</div>
          <button onclick="PMAuth.logout()" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.85rem; font-weight:600; margin-left:0.5rem;">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      `;
    } else {
      navAuth.innerHTML = `
        <button onclick="openAuthModal()" class="btn-primary" style="padding:0.45rem 1rem; font-size:0.9rem;">
          <i class="fas fa-sign-in-alt"></i> Sign In
        </button>
      `;
    }
  }
};

const Toast = {
  show(msg, type = 'info') {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; padding:0.75rem 1.4rem; border-radius:8px; color:white; font-weight:600; font-size:0.9rem; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);';
      document.body.appendChild(el);
    }
    el.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0f172a';
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }
};

function openAuthModal() {
  let m = document.getElementById('auth-modal');
  if (m) m.classList.add('active');
}

function closeAuthModal() {
  let m = document.getElementById('auth-modal');
  if (m) m.classList.remove('active');
}

// Load Projects on Dashboard
async function loadProjectsDashboard() {
  const container = document.getElementById('projects-list');
  if (!container) return;

  if (!PMAuth.isLoggedIn()) {
    container.innerHTML = `
      <div style="grid-column:1/-1; background:white; padding:3rem; border-radius:var(--radius); text-align:center; border:1px solid var(--border);">
        <i class="fas fa-lock" style="font-size:3rem; color:var(--muted); margin-bottom:1rem;"></i>
        <h2>Sign In to Access Projects</h2>
        <p style="color:var(--muted); margin:0.5rem 0 1.5rem;">Manage tasks, collaborate with team members, and view Kanban boards.</p>
        <button onclick="openAuthModal()" class="btn-primary">Sign In</button>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${PMAuth.getToken()}` }
    });
    const data = await res.json();
    const projects = data.projects || [];

    if (projects.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; background:white; padding:3rem; border-radius:var(--radius); text-align:center; border:1px solid var(--border);">
          <h3>No Projects Found</h3>
          <p style="color:var(--muted); margin:0.5rem 0 1.5rem;">Create your first team project to get started with task boards.</p>
          <button onclick="openCreateProjectModal()" class="btn-primary">Create New Project</button>
        </div>
      `;
      return;
    }

    container.innerHTML = projects.map(p => `
      <a href="/board.html?id=${p.id}" class="project-card" style="border-top-color: ${p.color || 'var(--primary)'};">
        <h3 class="project-title">${p.title}</h3>
        <p class="project-desc">${p.description || 'No description provided.'}</p>
        
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:700; color:var(--slate); margin-bottom:0.3rem;">
            <span>Task Completion</span>
            <span>${p.stats.progress_percent}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${p.stats.progress_percent}%; background: ${p.color || 'var(--primary)'};"></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; font-size:0.82rem; color:var(--muted); border-top:1px solid #f1f5f9; padding-top:0.8rem;">
          <span><i class="fas fa-tasks"></i> ${p.stats.completed_tasks}/${p.stats.total_tasks} Tasks</span>
          <span style="font-weight:700; color:var(--primary);">Open Board &rarr;</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger)">Failed to load projects: ${err.message}</div>`;
  }
}

async function handleCreateProject(event) {
  event.preventDefault();
  const title = document.getElementById('proj-title').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  const color = document.getElementById('proj-color').value;

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PMAuth.getToken()}`
      },
      body: JSON.stringify({ title, description: desc, color })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project');

    Toast.show('Project created!', 'success');
    closeCreateProjectModal();
    loadProjectsDashboard();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

function openCreateProjectModal() {
  document.getElementById('create-project-modal').classList.add('active');
}

function closeCreateProjectModal() {
  document.getElementById('create-project-modal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  PMAuth.updateUI();
  loadProjectsDashboard();
});
