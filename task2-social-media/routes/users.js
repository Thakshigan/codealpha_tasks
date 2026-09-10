const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

// Get User Profile with Stats & Posts
router.get('/:username', optionalToken, async (req, res) => {
  try {
    const targetUsername = req.params.username.toLowerCase();
    const user = await db.get('SELECT id, username, name, avatar, bio, location, website, created_at FROM users WHERE username = ?', [targetUsername]);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const posts = await db.all('SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC', [user.id]);
    const likes = await db.all('SELECT * FROM likes');
    const comments = await db.all('SELECT * FROM comments');
    const follows = await db.all('SELECT * FROM follows');

    const followers = follows.filter(f => f.following_id === user.id);
    const following = follows.filter(f => f.follower_id === user.id);

    const currentUserId = req.user ? req.user.id : null;
    const isFollowing = currentUserId ? followers.some(f => f.follower_id === currentUserId) : false;

    // Format posts
    const formattedPosts = posts.map(p => ({
      id: p.id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      likes_count: likes.filter(l => l.post_id === p.id).length,
      comments_count: comments.filter(c => c.post_id === p.id).length,
      is_liked: currentUserId ? likes.some(l => l.post_id === p.id && l.user_id === currentUserId) : false
    }));

    res.json({
      profile: {
        ...user,
        stats: {
          posts_count: posts.length,
          followers_count: followers.length,
          following_count: following.length
        },
        is_following: isFollowing,
        is_self: currentUserId === user.id,
        posts: formattedPosts
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Follow / Unfollow User
router.post('/:username/follow', authenticateToken, async (req, res) => {
  try {
    const targetUser = await db.get('SELECT id FROM users WHERE username = ?', [req.params.username.toLowerCase()]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const existing = await db.get('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetUser.id]);

    let isFollowing;
    if (existing) {
      await db.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetUser.id]);
      isFollowing = false;
    } else {
      await db.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, targetUser.id]);
      isFollowing = true;
    }

    const followers = await db.all('SELECT * FROM follows WHERE following_id = ?', [targetUser.id]);
    res.json({ is_following: isFollowing, followers_count: followers.length });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to toggle follow status' });
  }
});

// Update Profile
router.put('/me/update', authenticateToken, async (req, res) => {
  try {
    const { name, bio, avatar, location, website } = req.body;
    await db.run(
      'UPDATE users SET name = ?, bio = ?, avatar = ?, location = ?, website = ? WHERE id = ?',
      [name, bio, avatar, location, website, req.user.id]
    );

    const updatedUser = await db.get('SELECT id, username, name, email, avatar, bio, location, website FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search & Discover Users
router.get('/explore/suggested', optionalToken, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    let users = await db.all('SELECT id, username, name, avatar, bio FROM users');
    const follows = await db.all('SELECT * FROM follows');

    if (currentUserId) {
      users = users.filter(u => u.id !== currentUserId);
    }

    const results = users.map(u => {
      const followers = follows.filter(f => f.following_id === u.id);
      const isFollowing = currentUserId ? followers.some(f => f.follower_id === currentUserId) : false;
      return {
        ...u,
        followers_count: followers.length,
        is_following: isFollowing
      };
    });

    res.json({ users: results.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

module.exports = router;
