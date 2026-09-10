const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already in use.' });
    }

    const existingUsername = await db.get('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const randomAvatarNum = Math.floor(Math.random() * 70) + 1;
    const defaultAvatar = `https://i.pravatar.cc/150?img=${randomAvatarNum}`;

    const result = await db.run(
      `INSERT INTO users (username, name, email, password, avatar, bio, location, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanUsername,
        name,
        email,
        hashedPassword,
        defaultAvatar,
        'Full Stack Developer & Community Member ✨',
        'Global Citizen',
        ''
      ]
    );

    const user = {
      id: result.id,
      username: cleanUsername,
      name,
      email,
      avatar: defaultAvatar,
      bio: 'Full Stack Developer & Community Member ✨'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Welcome to AlphaSocial!', token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // Can be email or username
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter email/username and password.' });
    }

    let user = await db.get('SELECT * FROM users WHERE email = ?', [identifier]);
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE username = ?', [identifier.toLowerCase()]);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current User Details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, name, email, avatar, bio, location, website, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;
