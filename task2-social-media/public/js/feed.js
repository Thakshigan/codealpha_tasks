// Social Media Feed Script
let activeFeedTab = 'all'; // 'all' or 'following'

async function loadFeed() {
  const container = document.getElementById('posts-stream');
  if (!container) return;

  const headers = {};
  if (SocialAuth.isLoggedIn()) {
    headers['Authorization'] = `Bearer ${SocialAuth.getToken()}`;
  }

  try {
    const res = await fetch(`/api/posts?feed=${activeFeedTab}`, { headers });
    const data = await res.json();
    const posts = data.posts || [];

    renderPosts(posts);
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:2rem;">Failed to load feed: ${err.message}</div>`;
  }
}

function renderPosts(posts) {
  const container = document.getElementById('posts-stream');
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div style="background:white; border-radius:var(--radius); padding:3rem; text-align:center; border:1px solid var(--border);">
        <i class="fas fa-comment-slash" style="font-size:3rem; color:var(--muted); margin-bottom:1rem;"></i>
        <h3>No Posts in ${activeFeedTab === 'following' ? 'Following Feed' : 'Feed'}</h3>
        <p style="color:var(--muted); margin-top:0.5rem;">${activeFeedTab === 'following' ? 'Follow more creators from the "Who to Follow" sidebar to see their posts here!' : 'Be the first to share something with the community!'}</p>
      </div>
    `;
    return;
  }

  const currentUser = SocialAuth.getUser();

  container.innerHTML = posts.map(post => `
    <article class="post-card" id="post-${post.id}">
      <div class="post-header">
        <a href="/profile.html?username=${post.author.username}">
          <img src="${post.author.avatar}" alt="${post.author.name}" class="avatar-sm" onerror="this.src='https://i.pravatar.cc/150'">
        </a>
        <div>
          <a href="/profile.html?username=${post.author.username}" class="post-author-name">${post.author.name}</a>
          <a href="/profile.html?username=${post.author.username}" class="post-author-handle">@${post.author.username}</a>
        </div>
        <div class="post-time">${timeAgo(new Date(post.created_at))}</div>
        ${currentUser && currentUser.id === post.author.id ? `
          <button onclick="deletePost(${post.id})" style="background:none; border:none; color:var(--muted); cursor:pointer; margin-left:0.5rem;" title="Delete Post">
            <i class="fas fa-trash-alt"></i>
          </button>
        ` : ''}
      </div>

      <div class="post-content">${formatPostText(post.content)}</div>

      ${post.image_url ? `
        <div class="post-image-wrap">
          <img src="${post.image_url}" alt="Post attachment" loading="lazy">
        </div>
      ` : ''}

      <div class="post-actions">
        <button class="action-btn ${post.is_liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
          <i class="${post.is_liked ? 'fas fa-heart' : 'far fa-heart'}"></i>
          <span id="like-count-${post.id}">${post.likes_count}</span>
        </button>
        <button class="action-btn" onclick="toggleComments(${post.id})">
          <i class="far fa-comment"></i>
          <span id="comment-count-${post.id}">${post.comments_count}</span>
        </button>
        <button class="action-btn" onclick="sharePost(${post.id})">
          <i class="far fa-share-square"></i>
        </button>
      </div>

      <!-- Comments Section -->
      <div class="comments-section" id="comments-section-${post.id}" style="display: none;">
        <div id="comments-list-${post.id}">
          <div style="text-align:center; padding:1rem;"><i class="fas fa-spinner fa-spin"></i></div>
        </div>

        <form class="comment-input-wrap" onsubmit="event.preventDefault(); submitComment(${post.id});">
          <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Write a thoughtful comment..." required>
          <button type="submit" style="background:var(--primary); color:white; border:none; border-radius:9999px; padding:0.4rem 0.9rem; font-weight:700; cursor:pointer;">
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </article>
  `).join('');
}

async function switchFeedTab(tab) {
  if (tab === 'following' && !SocialAuth.isLoggedIn()) {
    await SocialAuth.initAutoDemoAuth();
  }
  activeFeedTab = tab;
  const forYouTab = document.getElementById('tab-for-you');
  const followingTab = document.getElementById('tab-following');
  if (forYouTab) forYouTab.classList.toggle('active', tab === 'all');
  if (followingTab) followingTab.classList.toggle('active', tab === 'following');
  loadFeed();
}

async function handleCreatePost(event) {
  event.preventDefault();
  if (!SocialAuth.isLoggedIn()) {
    await SocialAuth.initAutoDemoAuth();
  }

  const content = document.getElementById('post-content-input').value.trim();
  const imageUrl = document.getElementById('post-image-input').value.trim();

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
    document.getElementById('post-content-input').value = '';
    document.getElementById('post-image-input').value = '';
    const imgContainer = document.getElementById('image-input-container');
    if (imgContainer) imgContainer.style.display = 'none';
    loadFeed();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function toggleLike(postId) {
  if (!SocialAuth.isLoggedIn()) {
    await SocialAuth.initAutoDemoAuth();
  }

  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SocialAuth.getToken()}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Like failed');

    const countEl = document.getElementById(`like-count-${postId}`);
    if (countEl) {
      const btn = countEl.parentElement;
      countEl.textContent = data.likes_count;

      if (data.is_liked) {
        btn.classList.add('liked');
        btn.querySelector('i').className = 'fas fa-heart';
      } else {
        btn.classList.remove('liked');
        btn.querySelector('i').className = 'far fa-heart';
      }
    }
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function toggleComments(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  if (!section) return;

  if (section.style.display === 'none') {
    section.style.display = 'block';
    loadComments(postId);
  } else {
    section.style.display = 'none';
  }
}

async function loadComments(postId) {
  const list = document.getElementById(`comments-list-${postId}`);
  if (!list) return;

  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    const comments = data.comments || [];

    if (comments.length === 0) {
      list.innerHTML = '<p style="color:var(--muted); font-size:0.85rem; padding:0.5rem 0;">No comments yet. Start the conversation!</p>';
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        <a href="/profile.html?username=${c.username}">
          <img src="${c.avatar}" alt="${c.name}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
        </a>
        <div class="comment-bubble">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <a href="/profile.html?username=${c.username}" style="font-weight:700; color:var(--dark); text-decoration:none; font-size:0.85rem;">${c.name}</a>
            <span style="font-size:0.75rem; color:var(--muted);">${timeAgo(new Date(c.created_at))}</span>
          </div>
          <p style="margin-top:0.2rem; color:var(--slate);">${c.comment}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">Failed to load comments</p>`;
  }
}

async function submitComment(postId) {
  if (!SocialAuth.isLoggedIn()) {
    await SocialAuth.initAutoDemoAuth();
  }

  const input = document.getElementById(`comment-input-${postId}`);
  const comment = input.value.trim();
  if (!comment) return;

  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SocialAuth.getToken()}`
      },
      body: JSON.stringify({ comment })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Comment failed');

    input.value = '';
    loadComments(postId);
    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;
    Toast.show('Comment posted', 'success');
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SocialAuth.getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to delete post');
    Toast.show('Post deleted', 'info');
    document.getElementById(`post-${postId}`)?.remove();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users-list');
  if (!container) return;

  const headers = {};
  if (SocialAuth.isLoggedIn()) headers['Authorization'] = `Bearer ${SocialAuth.getToken()}`;

  try {
    const res = await fetch('/api/users/explore/suggested', { headers });
    const data = await res.json();
    const users = data.users || [];

    if (users.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">No suggestions available right now.</p>';
      return;
    }

    container.innerHTML = users.map(u => `
      <div class="suggested-user-row">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <a href="/profile.html?username=${u.username}">
            <img src="${u.avatar}" alt="${u.name}" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
          </a>
          <div>
            <a href="/profile.html?username=${u.username}" style="font-weight:700; color:var(--dark); text-decoration:none; font-size:0.9rem; display:block;">${u.name}</a>
            <span style="font-size:0.78rem; color:var(--muted);">@${u.username}</span>
          </div>
        </div>
        <button class="btn-follow ${u.is_following ? 'following' : ''}" onclick="toggleFollow('${u.username}', this)">
          ${u.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '';
  }
}

async function toggleFollow(username, btnEl) {
  if (!SocialAuth.isLoggedIn()) {
    await SocialAuth.initAutoDemoAuth();
  }

  try {
    const res = await fetch(`/api/users/${username}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SocialAuth.getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update follow');

    if (data.is_following) {
      btnEl.classList.add('following');
      btnEl.textContent = 'Following';
      Toast.show(`You are now following @${username}`, 'success');
    } else {
      btnEl.classList.remove('following');
      btnEl.textContent = 'Follow';
      Toast.show(`Unfollowed @${username}`, 'info');
    }

    if (activeFeedTab === 'following') {
      loadFeed();
    }
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

function sharePost(id) {
  navigator.clipboard.writeText(`${window.location.origin}/#post-${id}`);
  Toast.show('Post link copied to clipboard!', 'success');
}

function formatPostText(text) {
  return text
    .replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color:var(--primary); font-weight:600;">$1</span>')
    .replace(/(@[a-zA-Z0-9_]+)/g, '<span style="color:var(--accent); font-weight:600;">$1</span>');
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  loadSuggestedUsers();
});
