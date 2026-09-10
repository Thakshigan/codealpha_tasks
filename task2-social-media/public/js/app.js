// Social Media App Core Client JS
const API_BASE = '/api';

const SocialAuth = {
  getToken() {
    return localStorage.getItem('alpha_social_token');
  },
  getUser() {
    const u = localStorage.getItem('alpha_social_user');
    return u ? JSON.parse(u) : null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  setAuth(token, user) {
    localStorage.setItem('alpha_social_token', token);
    localStorage.setItem('alpha_social_user', JSON.stringify(user));
    this.updateUI();
  },
  logout() {
    localStorage.removeItem('alpha_social_token');
    localStorage.removeItem('alpha_social_user');
    Toast.show('Logged out', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  },
  async login(identifier, password, silent = false) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      this.setAuth(data.token, data.user);
      if (!silent) {
        Toast.show(`Signed in as @${data.user.username}!`, 'success');
      }
      return true;
    } catch (err) {
      if (!silent) Toast.show(err.message, 'error');
      return false;
    }
  },
  async register(username, name, email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      this.setAuth(data.token, data.user);
      Toast.show(`Welcome to AlphaSocial, @${data.user.username}!`, 'success');
      return true;
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },
  async switchAccount(username) {
    const success = await this.login(username, 'password123');
    if (success) {
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  },
  async initAutoDemoAuth() {
    // If no user is logged in, auto-login as demo user alexrivera so everything works immediately
    if (!this.isLoggedIn()) {
      await this.login('alexrivera', 'password123', true);
    }
    this.updateUI();
  },
  updateUI() {
    const user = this.getUser();
    const currentAvatarEl = document.querySelectorAll('.current-user-avatar');
    const currentNameEl = document.querySelectorAll('.current-user-name');
    const profileLinks = document.querySelectorAll('.my-profile-link');
    const authActionBtn = document.getElementById('auth-action-btn');
    const activeUserBadge = document.getElementById('active-user-badge');

    if (user) {
      currentAvatarEl.forEach(img => img.src = user.avatar);
      currentNameEl.forEach(el => el.textContent = user.name);
      profileLinks.forEach(a => a.href = `/profile.html?username=${user.username}`);
      
      if (authActionBtn) {
        authActionBtn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.6rem; width: 100%;">
            <img src="${user.avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
            <div style="flex: 1; overflow: hidden; text-align: left;">
              <div style="font-size: 0.85rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name}</div>
              <div style="font-size: 0.72rem; color: var(--muted);">@${user.username}</div>
            </div>
            <i class="fas fa-ellipsis-h" style="font-size: 0.9rem; color: var(--muted);"></i>
          </div>
        `;
        authActionBtn.onclick = () => AuthModal.openAccountSwitcher();
      }
    } else {
      if (authActionBtn) {
        authActionBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
        authActionBtn.onclick = () => AuthModal.open('login');
      }
    }
  }
};

const AuthModal = {
  open(tab = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-box">
          <button onclick="AuthModal.close()" style="position:absolute; right:1.2rem; top:1.2rem; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--muted);">&times;</button>
          
          <div style="display:flex; gap:1rem; border-bottom:1px solid var(--border); margin-bottom:1.5rem; padding-bottom:0.5rem;">
            <button id="tab-login" onclick="AuthModal.switchTab('login')" style="background:none; border:none; font-size:1.1rem; font-weight:700; color:var(--primary); cursor:pointer; border-bottom:2px solid var(--primary); padding-bottom:0.3rem;">Sign In</button>
            <button id="tab-reg" onclick="AuthModal.switchTab('register')" style="background:none; border:none; font-size:1.1rem; font-weight:600; color:var(--muted); cursor:pointer; padding-bottom:0.3rem;">Create Account</button>
          </div>

          <!-- Quick Demo Switcher -->
          <div style="background: var(--light-bg); border: 1px solid var(--border); padding: 0.8rem; border-radius: 10px; margin-bottom: 1.2rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; margin-bottom: 0.5rem;">⚡ 1-Click Demo Accounts:</div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button onclick="SocialAuth.switchAccount('alexrivera')" style="background: white; border: 1px solid var(--border); padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">@alexrivera</button>
              <button onclick="SocialAuth.switchAccount('sarahchen')" style="background: white; border: 1px solid var(--border); padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">@sarahchen</button>
              <button onclick="SocialAuth.switchAccount('marcusv')" style="background: white; border: 1px solid var(--border); padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">@marcusv</button>
            </div>
          </div>

          <!-- Login Form -->
          <form id="social-login-form" onsubmit="event.preventDefault(); handleSocialLogin();">
            <div style="margin-bottom:1rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Username or Email</label>
              <input type="text" id="social-login-id" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="alexrivera or alex@dev.com" required value="alexrivera">
            </div>
            <div style="margin-bottom:1rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Password</label>
              <input type="password" id="social-login-pwd" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="••••••••" required value="password123">
            </div>
            <button type="submit" style="width:100%; padding:0.8rem; background:var(--primary); color:white; border:none; border-radius:9999px; font-weight:700; cursor:pointer;">Sign In</button>
          </form>

          <!-- Register Form -->
          <form id="social-reg-form" style="display:none;" onsubmit="event.preventDefault(); handleSocialReg();">
            <div style="margin-bottom:0.8rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Full Name</label>
              <input type="text" id="social-reg-name" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="Alex Doe" required>
            </div>
            <div style="margin-bottom:0.8rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Unique Username</label>
              <input type="text" id="social-reg-user" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="alexdoe" required>
            </div>
            <div style="margin-bottom:0.8rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Email Address</label>
              <input type="email" id="social-reg-email" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="alex@domain.com" required>
            </div>
            <div style="margin-bottom:1.2rem;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--slate); display:block; margin-bottom:0.3rem;">Password</label>
              <input type="password" id="social-reg-pwd" style="width:100%; padding:0.7rem 1rem; border:1px solid var(--border); border-radius:8px;" placeholder="At least 6 characters" minlength="6" required>
            </div>
            <button type="submit" style="width:100%; padding:0.8rem; background:var(--primary); color:white; border:none; border-radius:9999px; font-weight:700; cursor:pointer;">Create Account</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
    this.switchTab(tab);
  },
  openAccountSwitcher() {
    let modal = document.getElementById('account-switcher-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'account-switcher-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-box" style="max-width: 380px;">
          <button onclick="document.getElementById('account-switcher-modal').classList.remove('active')" style="position:absolute; right:1.2rem; top:1.2rem; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--muted);">&times;</button>
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1.2rem;">Account & Profiles</h3>
          
          <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem;">
            <button onclick="SocialAuth.switchAccount('alexrivera')" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem; border: 1px solid var(--border); border-radius: 10px; background: white; text-align: left; cursor: pointer; width: 100%;">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
              <div>
                <strong style="font-size: 0.9rem;">Alex Rivera</strong>
                <div style="font-size: 0.78rem; color: var(--muted);">@alexrivera</div>
              </div>
            </button>

            <button onclick="SocialAuth.switchAccount('sarahchen')" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem; border: 1px solid var(--border); border-radius: 10px; background: white; text-align: left; cursor: pointer; width: 100%;">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
              <div>
                <strong style="font-size: 0.9rem;">Sarah Chen</strong>
                <div style="font-size: 0.78rem; color: var(--muted);">@sarahchen</div>
              </div>
            </button>

            <button onclick="SocialAuth.switchAccount('marcusv')" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem; border: 1px solid var(--border); border-radius: 10px; background: white; text-align: left; cursor: pointer; width: 100%;">
              <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
              <div>
                <strong style="font-size: 0.9rem;">Marcus Vance</strong>
                <div style="font-size: 0.78rem; color: var(--muted);">@marcusv</div>
              </div>
            </button>
          </div>

          <button onclick="SocialAuth.logout()" style="width: 100%; padding: 0.65rem; border: 1px solid #fee2e2; background: #fef2f2; color: var(--danger); border-radius: 8px; font-weight: 700; cursor: pointer;">
            <i class="fas fa-sign-out-alt"></i> Log Out
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
  },
  close() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },
  switchTab(tab) {
    const loginForm = document.getElementById('social-login-form');
    const regForm = document.getElementById('social-reg-form');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-reg');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      tabLogin.style.color = 'var(--primary)';
      tabLogin.style.borderBottom = '2px solid var(--primary)';
      tabReg.style.color = 'var(--muted)';
      tabReg.style.borderBottom = 'none';
    } else {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      tabReg.style.color = 'var(--primary)';
      tabReg.style.borderBottom = '2px solid var(--primary)';
      tabLogin.style.color = 'var(--muted)';
      tabLogin.style.borderBottom = 'none';
    }
  }
};

function openCreatePostModal() {
  const postInput = document.getElementById('post-content-input');
  if (postInput) {
    postInput.focus();
    postInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    postInput.style.backgroundColor = '#eff6ff';
    setTimeout(() => { postInput.style.backgroundColor = ''; }, 800);
  } else {
    // On profile or explore page, open modal
    let modal = document.getElementById('create-post-popup');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'create-post-popup';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-box" style="max-width: 500px;">
          <button onclick="document.getElementById('create-post-popup').classList.remove('active')" style="position:absolute; right:1.2rem; top:1.2rem; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--muted);">&times;</button>
          <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 1rem;">Create New Post</h3>
          <form onsubmit="event.preventDefault(); submitPopupPost();">
            <textarea id="popup-post-content" rows="4" style="width:100%; padding:0.8rem; border:1px solid var(--border); border-radius:8px; font-family:inherit; outline:none; margin-bottom:0.8rem;" placeholder="What's sparking in your mind? #WebDev #Tech" required></textarea>
            <input type="url" id="popup-post-image" placeholder="Image URL (optional)" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px; margin-bottom:1rem;">
            <button type="submit" style="width:100%; padding:0.8rem; background:var(--primary); color:white; border:none; border-radius:9999px; font-weight:700; cursor:pointer;">Publish Post</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
  }
}

async function submitPopupPost() {
  const content = document.getElementById('popup-post-content').value.trim();
  const imageUrl = document.getElementById('popup-post-image').value.trim();
  if (!content) return;

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SocialAuth.getToken()}`
      },
      body: JSON.stringify({ content, image_url: imageUrl })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post');

    Toast.show('Post published successfully!', 'success');
    document.getElementById('create-post-popup').classList.remove('active');
    document.getElementById('popup-post-content').value = '';
    document.getElementById('popup-post-image').value = '';
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof loadUserProfile === 'function') loadUserProfile();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function handleSocialLogin() {
  const id = document.getElementById('social-login-id').value.trim();
  const pwd = document.getElementById('social-login-pwd').value.trim();
  const ok = await SocialAuth.login(id, pwd);
  if (ok) {
    AuthModal.close();
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof loadUserProfile === 'function') loadUserProfile();
    if (typeof loadSuggestedUsers === 'function') loadSuggestedUsers();
  }
}

async function handleSocialReg() {
  const name = document.getElementById('social-reg-name').value.trim();
  const user = document.getElementById('social-reg-user').value.trim();
  const email = document.getElementById('social-reg-email').value.trim();
  const pwd = document.getElementById('social-reg-pwd').value.trim();
  const ok = await SocialAuth.register(user, name, email, pwd);
  if (ok) {
    AuthModal.close();
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof loadUserProfile === 'function') loadUserProfile();
    if (typeof loadSuggestedUsers === 'function') loadSuggestedUsers();
  }
}

const Toast = {
  show(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `background:${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0f172a'}; color:white; padding:0.8rem 1.4rem; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); font-size:0.9rem; font-weight:600;`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await SocialAuth.initAutoDemoAuth();
});
