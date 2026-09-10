const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

// Get Feed Posts
router.get('/', optionalToken, async (req, res) => {
  try {
    const { feed, search } = req.query; // feed = 'following' or 'all'
    const currentUserId = req.user ? req.user.id : null;

    let posts = await db.all('SELECT * FROM posts ORDER BY id DESC');
    const users = await db.all('SELECT id, username, name, avatar FROM users');
    const userMap = new Map(users.map(u => [u.id, u]));

    const likes = await db.all('SELECT * FROM likes');
    const comments = await db.all('SELECT c.*, u.username, u.name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id');
    const follows = await db.all('SELECT * FROM follows');

    // Filter by following if requested
    if (feed === 'following' && currentUserId) {
      const followingIds = new Set(
        follows.filter(f => f.follower_id === currentUserId).map(f => f.following_id)
      );
      followingIds.add(currentUserId); // include own posts
      posts = posts.filter(p => followingIds.has(p.user_id));
    }

    // Filter by search/hashtag
    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(p => p.content.toLowerCase().includes(q));
    }

    // Hydrate posts
    const hydrated = posts.map(p => {
      const author = userMap.get(p.user_id) || { name: 'Unknown User', username: 'unknown', avatar: 'https://i.pravatar.cc/150' };
      const postLikes = likes.filter(l => l.post_id === p.id);
      const postComments = comments.filter(c => c.post_id === p.id);
      const isLiked = currentUserId ? postLikes.some(l => l.user_id === currentUserId) : false;

      return {
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        created_at: p.created_at,
        author: {
          id: author.id,
          name: author.name,
          username: author.username,
          avatar: author.avatar
        },
        likes_count: postLikes.length,
        comments_count: postComments.length,
        is_liked: isLiked,
        comments: postComments.slice(-3) // latest 3 comments preview
      };
    });

    res.json({ count: hydrated.length, posts: hydrated });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create Post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, image_url } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const result = await db.run(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.user.id, content.trim(), image_url ? image_url.trim() : null]
    );

    const newPost = await db.get('SELECT * FROM posts WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete Post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Toggle Like
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user.id;

    const existing = await db.get('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    let isLiked;
    if (existing) {
      await db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      isLiked = false;
    } else {
      await db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      isLiked = true;
    }

    const allLikes = await db.all('SELECT * FROM likes WHERE post_id = ?', [postId]);
    res.json({ is_liked: isLiked, likes_count: allLikes.length });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Get Comments for Post
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const comments = await db.all(
      'SELECT c.*, u.username, u.name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.id ASC',
      [postId]
    );
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add Comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const result = await db.run(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, req.user.id, comment.trim()]
    );

    const newComment = {
      id: result.id,
      post_id: postId,
      user_id: req.user.id,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
      name: req.user.name,
      username: req.user.username,
      avatar: req.user.avatar || 'https://i.pravatar.cc/150'
    };

    res.status(201).json({ message: 'Comment added', comment: newComment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
