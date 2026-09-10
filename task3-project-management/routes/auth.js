const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const randNum = Math.floor(Math.random() * 60) + 1;
    const avatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`;

    const result = await db.run(
      'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, avatar, role || 'Team Member']
    );

    const user = { id: result.id, name, email, avatar, role: role || 'Team Member' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'User registered successfully', token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userPayload = { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get team members (for task assignment)
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const users = await db.all('SELECT id, name, email, avatar, role FROM users');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

module.exports = router;
