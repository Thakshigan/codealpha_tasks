// Core Application Client Helper for CodeAlpha E-Commerce Store
const API_BASE = '/api';

// Cart Management with LocalStorage
const Cart = {
  getItems() {
    return JSON.parse(localStorage.getItem('alpha_cart') || '[]');
  },
  save(items) {
    localStorage.setItem('alpha_cart', JSON.stringify(items));
    this.updateBadge();
  },
  addItem(product, quantity = 1) {
    const items = this.getItems();
    const existingIndex = items.findIndex(i => i.id === product.id);
    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }
    this.save(items);
    Toast.show(`Added "${product.name}" to cart!`, 'success');
  },
  updateQuantity(id, quantity) {
    let items = this.getItems();
    if (quantity <= 0) {
      items = items.filter(i => i.id !== id);
    } else {
      const item = items.find(i => i.id === id);
      if (item) item.quantity = quantity;
    }
    this.save(items);
  },
  removeItem(id) {
    let items = this.getItems();
    items = items.filter(i => i.id !== id);
    this.save(items);
    Toast.show('Item removed from cart', 'info');
  },
  clear() {
    localStorage.removeItem('alpha_cart');
    this.updateBadge();
  },
  getCount() {
    const items = this.getItems();
    return items.reduce((sum, i) => sum + i.quantity, 0);
  },
  getTotal() {
    const items = this.getItems();
    return items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  },
  updateBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-block' : 'none';
    });
  }
};

// Auth Management
const Auth = {
  getToken() {
    return localStorage.getItem('alpha_token');
  },
  getUser() {
    const userStr = localStorage.getItem('alpha_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },
  setAuth(token, user) {
    localStorage.setItem('alpha_token', token);
    localStorage.setItem('alpha_user', JSON.stringify(user));
    this.updateUI();
  },
  logout() {
    localStorage.removeItem('alpha_token');
    localStorage.removeItem('alpha_user');
    Toast.show('You have logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
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
  async register(name, email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      this.setAuth(data.token, data.user);
      Toast.show(`Account created! Welcome, ${data.user.name}!`, 'success');
      return true;
    } catch (err) {
      Toast.show(err.message, 'error');
      return false;
    }
  },
  updateUI() {
    const authContainer = document.getElementById('nav-auth-container');
    if (!authContainer) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          <a href="/orders.html" class="nav-link"><i class="fas fa-box"></i> My Orders</a>
          ${user.role === 'admin' ? '<a href="/admin.html" class="nav-link" style="color:var(--accent);"><i class="fas fa-shield-alt"></i> Admin</a>' : ''}
          <div style="display: flex; align-items: center; gap: 0.5rem; background: #eef2ff; padding: 0.4rem 0.8rem; border-radius: 9999px;">
            <i class="fas fa-user-circle" style="color:var(--primary); font-size:1.2rem;"></i>
            <span style="font-size:0.85rem; font-weight:600; color:var(--dark);">${user.name.split(' ')[0]}</span>
          </div>
          <button onclick="Auth.logout()" class="nav-link" style="background:none; border:none; cursor:pointer; color:var(--danger);">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button onclick="Modal.openAuth('login')" class="auth-btn">
          <i class="fas fa-sign-in-alt"></i> Login
        </button>
      `;
    }
  }
};

// Toast Notifications
const Toast = {
  show(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Modal Helper
const Modal = {
  openAuth(tab = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-content">
          <button onclick="Modal.closeAuth()" style="position: absolute; right: 1.2rem; top: 1.2rem; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--muted);">&times;</button>
          
          <div style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border); margin-bottom: 1.5rem; padding-bottom: 0.5rem;">
            <button id="tab-login-btn" onclick="Modal.switchAuthTab('login')" style="background: none; border: none; font-size: 1.1rem; font-weight: 700; color: var(--primary); cursor: pointer; border-bottom: 2px solid var(--primary); padding-bottom: 0.3rem;">Sign In</button>
            <button id="tab-register-btn" onclick="Modal.switchAuthTab('register')" style="background: none; border: none; font-size: 1.1rem; font-weight: 600; color: var(--muted); cursor: pointer; padding-bottom: 0.3rem;">Create Account</button>
          </div>

          <!-- Login Form -->
          <form id="login-form" onsubmit="event.preventDefault(); handleLoginSubmit();">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="login-email" class="form-control" placeholder="name@example.com" required value="customer@store.com">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" required value="user123">
            </div>
            <div style="font-size: 0.8rem; color: var(--muted); margin-bottom: 1rem;">
              Tip: Admin is <code>admin@store.com</code> / <code>admin123</code>
            </div>
            <button type="submit" class="btn-block">Sign In</button>
          </form>

          <!-- Register Form -->
          <form id="register-form" style="display: none;" onsubmit="event.preventDefault(); handleRegisterSubmit();">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="reg-name" class="form-control" placeholder="John Doe" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="reg-email" class="form-control" placeholder="name@example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="reg-password" class="form-control" placeholder="At least 6 characters" minlength="6" required>
            </div>
            <button type="submit" class="btn-block">Create Account</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
    this.switchAuthTab(tab);
  },
  closeAuth() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },
  switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      loginBtn.style.color = 'var(--primary)';
      loginBtn.style.borderBottom = '2px solid var(--primary)';
      regBtn.style.color = 'var(--muted)';
      regBtn.style.borderBottom = 'none';
    } else {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      regBtn.style.color = 'var(--primary)';
      regBtn.style.borderBottom = '2px solid var(--primary)';
      loginBtn.style.color = 'var(--muted)';
      loginBtn.style.borderBottom = 'none';
    }
  }
};

async function handleLoginSubmit() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const success = await Auth.login(email, password);
  if (success) Modal.closeAuth();
}

async function handleRegisterSubmit() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const success = await Auth.register(name, email, password);
  if (success) Modal.closeAuth();
}

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  Auth.updateUI();
});
