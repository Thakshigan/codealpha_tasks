// User Profile Script
let currentProfileUser = null;

async function loadUserProfile() {
  const params = new URLSearchParams(window.location.search);
  let username = params.get('username');

  if (!username) {
    const user = SocialAuth.getUser();
    if (user) username = user.username;
    else {
      window.location.href = '/';
      return;
    }
  }

  const container = document.getElementById('profile-layout');
  const headers = {};
  if (SocialAuth.isLoggedIn()) headers['Authorization'] = `Bearer ${SocialAuth.getToken()}`;

  try {
    const res = await fetch(`/api/users/${username}`, { headers });
    if (!res.ok) throw new Error('User not found');
    const data = await res.json();
    currentProfileUser = data.profile;

    renderProfile(currentProfileUser);
  } catch (err) {
    container.innerHTML = `
      <div style="background:white; border-radius:var(--radius); padding:4rem 1rem; text-align:center; border:1px solid var(--border);">
        <h2>User Not Found</h2>
        <p style="color:var(--muted); margin:1rem 0;">The requested user profile @${username} does not exist.</p>
        <a href="/" style="color:var(--primary); font-weight:700; text-decoration:none;">Back to Feed</a>
      </div>
    `;
  }
}

function renderProfile(user) {
  document.title = `${user.name} (@${user.username}) — AlphaSocial`;
  const container = document.getElementById('profile-layout');

  container.innerHTML = `
    <!-- Profile Card Header -->
    <div class="profile-card">
      <div class="profile-cover"></div>
      <div class="profile-info">
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <img src="${user.avatar}" alt="${user.name}" class="profile-avatar-large" onerror="this.src='https://i.pravatar.cc/150'">
          <div>
            ${user.is_self ? `
              <button onclick="openEditProfileModal()" style="background:white; border:1px solid var(--border); padding:0.5rem 1.2rem; border-radius:9999px; font-weight:700; cursor:pointer;">
                Edit Profile
              </button>
            ` : `
              <button id="profile-follow-btn" class="btn-follow ${user.is_following ? 'following' : ''}" onclick="toggleProfileFollow('${user.username}')" style="padding:0.6rem 1.4rem; font-size:0.95rem;">
                ${user.is_following ? 'Following' : 'Follow'}
              </button>
            `}
          </div>
        </div>

        <h1 style="font-size:1.5rem; font-weight:800; margin-top:0.6rem; color:var(--dark);">${user.name}</h1>
        <div style="font-size:0.9rem; color:var(--muted); margin-bottom:0.8rem;">@${user.username}</div>

        <p style="color:var(--slate); line-height:1.5; margin-bottom:0.8rem;">${user.bio || 'No bio yet.'}</p>

        <div style="display:flex; gap:1.2rem; color:var(--muted); font-size:0.85rem; flex-wrap:wrap;">
          ${user.location ? `<div><i class="fas fa-map-marker-alt"></i> ${user.location}</div>` : ''}
          ${user.website ? `<div><i class="fas fa-link"></i> <a href="${user.website}" target="_blank" style="color:var(--primary); text-decoration:none;">${user.website.replace('https://', '')}</a></div>` : ''}
          <div><i class="far fa-calendar-alt"></i> Joined ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
        </div>

        <div class="profile-stats">
          <div><span class="profile-stat-number">${user.stats.posts_count}</span> <span style="color:var(--muted);">Posts</span></div>
          <div><span class="profile-stat-number" id="profile-followers-count">${user.stats.followers_count}</span> <span style="color:var(--muted);">Followers</span></div>
          <div><span class="profile-stat-number">${user.stats.following_count}</span> <span style="color:var(--muted);">Following</span></div>
        </div>
      </div>
    </div>

    <!-- User Posts Stream -->
    <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem; color:var(--dark);">Posts by ${user.name}</h3>
    <div id="user-posts-stream">
      ${user.posts.length > 0 ? user.posts.map(p => `
        <article class="post-card">
          <div class="post-header">
            <img src="${user.avatar}" alt="${user.name}" class="avatar-sm">
            <div>
              <span class="post-author-name">${user.name}</span>
              <span class="post-author-handle">@${user.username}</span>
            </div>
            <div class="post-time">${timeAgo(new Date(p.created_at))}</div>
          </div>
          <div class="post-content">${formatPostText(p.content)}</div>
          ${p.image_url ? `<div class="post-image-wrap"><img src="${p.image_url}" alt="Post image"></div>` : ''}
          <div class="post-actions">
            <button class="action-btn ${p.is_liked ? 'liked' : ''}" onclick="toggleLike(${p.id})">
              <i class="${p.is_liked ? 'fas fa-heart' : 'far fa-heart'}"></i> ${p.likes_count}
            </button>
            <button class="action-btn">
              <i class="far fa-comment"></i> ${p.comments_count}
            </button>
          </div>
        </article>
      `).join('') : '<div style="background:white; border-radius:var(--radius); padding:3rem; text-align:center; border:1px solid var(--border); color:var(--muted);">No posts shared yet.</div>'}
    </div>
  `;
}

async function toggleProfileFollow(username) {
  if (!SocialAuth.isLoggedIn()) {
    Toast.show('Sign in to follow creators', 'info');
    AuthModal.open('login');
    return;
  }

  try {
    const res = await fetch(`/api/users/${username}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SocialAuth.getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update follow');

    const btn = document.getElementById('profile-follow-btn');
    const countEl = document.getElementById('profile-followers-count');
    if (countEl) countEl.textContent = data.followers_count;

    if (data.is_following) {
      btn.classList.add('following');
      btn.textContent = 'Following';
      Toast.show(`Following @${username}`, 'success');
    } else {
      btn.classList.remove('following');
      btn.textContent = 'Follow';
      Toast.show(`Unfollowed @${username}`, 'info');
    }
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

function openEditProfileModal() {
  const user = SocialAuth.getUser();
  if (!user) return;

  let modal = document.getElementById('edit-profile-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-profile-modal';
    modal.className = 'modal-backdrop active';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:500px;">
        <button onclick="document.getElementById('edit-profile-modal').remove()" style="position:absolute; right:1.2rem; top:1.2rem; background:none; border:none; font-size:1.4rem; cursor:pointer;">&times;</button>
        <h2 style="font-size:1.3rem; font-weight:800; margin-bottom:1.2rem;">Edit Profile</h2>
        <form onsubmit="event.preventDefault(); saveProfileChanges();">
          <div style="margin-bottom:0.8rem;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:0.3rem;">Full Name</label>
            <input type="text" id="edit-name" value="${user.name || ''}" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px;" required>
          </div>
          <div style="margin-bottom:0.8rem;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:0.3rem;">Bio</label>
            <textarea id="edit-bio" rows="3" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px;">${user.bio || ''}</textarea>
          </div>
          <div style="margin-bottom:0.8rem;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:0.3rem;">Avatar URL</label>
            <input type="url" id="edit-avatar" value="${user.avatar || ''}" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px;">
          </div>
          <div style="margin-bottom:0.8rem;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:0.3rem;">Location</label>
            <input type="text" id="edit-location" value="${user.location || ''}" placeholder="e.g. London, UK" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px;">
          </div>
          <div style="margin-bottom:1.2rem;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:0.3rem;">Website</label>
            <input type="url" id="edit-website" value="${user.website || ''}" placeholder="https://..." style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:8px;">
          </div>
          <button type="submit" style="width:100%; padding:0.8rem; background:var(--primary); color:white; border:none; border-radius:9999px; font-weight:700; cursor:pointer;">Save Changes</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

async function saveProfileChanges() {
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  const website = document.getElementById('edit-website').value.trim();

  try {
    const res = await fetch('/api/users/me/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SocialAuth.getToken()}`
      },
      body: JSON.stringify({ name, bio, avatar, location, website })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update');

    SocialAuth.setAuth(SocialAuth.getToken(), data.user);
    Toast.show('Profile updated!', 'success');
    document.getElementById('edit-profile-modal')?.remove();
    loadUserProfile();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
});
