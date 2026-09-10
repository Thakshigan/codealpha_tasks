const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('sqlite3 not available, using JSON DB');
}

const dbPath = path.join(__dirname, 'social.db');

class SocialDbService {
  constructor() {
    this.isSqlite = !!sqlite3;
    this.jsonDbPath = path.join(__dirname, 'social_data.json');
    this.init();
  }

  async init() {
    if (this.isSqlite) {
      this.db = new sqlite3.Database(dbPath);
      await this.runSchema();
    } else {
      this.loadJsonDb();
    }
    await this.seedData();
    console.log('Social Media Database ready.');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, changes: this.changes });
        });
      } else {
        resolve(this.runJson(sql, params));
      }
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      } else {
        resolve(this.allJson(sql, params));
      }
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
      } else {
        resolve(this.getJson(sql, params));
      }
    });
  }

  async runSchema() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        website TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id),
        FOREIGN KEY (following_id) REFERENCES users(id)
      )`
    ];

    for (const q of queries) {
      await this.run(q);
    }
  }

  loadJsonDb() {
    if (fs.existsSync(this.jsonDbPath)) {
      this.jsonData = JSON.parse(fs.readFileSync(this.jsonDbPath, 'utf8'));
    } else {
      this.jsonData = { users: [], posts: [], likes: [], comments: [], follows: [] };
      this.saveJsonDb();
    }
  }

  saveJsonDb() {
    if (this.jsonDbPath && this.jsonData) {
      fs.writeFileSync(this.jsonDbPath, JSON.stringify(this.jsonData, null, 2));
    }
  }

  runJson(sql, params = []) {
    this.loadJsonDb();
    const clean = sql.trim().toUpperCase();

    if (clean.startsWith('INSERT INTO USERS')) {
      const id = (this.jsonData.users.length ? Math.max(...this.jsonData.users.map(u => u.id)) : 0) + 1;
      const user = {
        id, username: params[0], name: params[1], email: params[2], password: params[3],
        avatar: params[4] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        bio: params[5] || 'Passionate developer & tech enthusiast 🚀',
        website: params[6] || '',
        location: params[7] || 'San Francisco, CA',
        created_at: new Date().toISOString()
      };
      this.jsonData.users.push(user);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO POSTS')) {
      const id = (this.jsonData.posts.length ? Math.max(...this.jsonData.posts.map(p => p.id)) : 0) + 1;
      const post = { id, user_id: Number(params[0]), content: params[1], image_url: params[2] || null, created_at: new Date().toISOString() };
      this.jsonData.posts.push(post);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO LIKES')) {
      const exists = this.jsonData.likes.find(l => l.user_id === Number(params[0]) && l.post_id === Number(params[1]));
      if (!exists) {
        const id = (this.jsonData.likes.length ? Math.max(...this.jsonData.likes.map(l => l.id)) : 0) + 1;
        this.jsonData.likes.push({ id, user_id: Number(params[0]), post_id: Number(params[1]), created_at: new Date().toISOString() });
        this.saveJsonDb();
        return { id };
      }
      return { changes: 0 };
    }

    if (clean.startsWith('DELETE FROM LIKES')) {
      this.jsonData.likes = this.jsonData.likes.filter(l => !(l.user_id === Number(params[0]) && l.post_id === Number(params[1])));
      this.saveJsonDb();
      return { changes: 1 };
    }

    if (clean.startsWith('INSERT INTO COMMENTS')) {
      const id = (this.jsonData.comments.length ? Math.max(...this.jsonData.comments.map(c => c.id)) : 0) + 1;
      const comment = { id, post_id: Number(params[0]), user_id: Number(params[1]), comment: params[2], created_at: new Date().toISOString() };
      this.jsonData.comments.push(comment);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO FOLLOWS')) {
      const exists = this.jsonData.follows.find(f => f.follower_id === Number(params[0]) && f.following_id === Number(params[1]));
      if (!exists) {
        const id = (this.jsonData.follows.length ? Math.max(...this.jsonData.follows.map(f => f.id)) : 0) + 1;
        this.jsonData.follows.push({ id, follower_id: Number(params[0]), following_id: Number(params[1]), created_at: new Date().toISOString() });
        this.saveJsonDb();
        return { id };
      }
      return { changes: 0 };
    }

    if (clean.startsWith('DELETE FROM FOLLOWS')) {
      this.jsonData.follows = this.jsonData.follows.filter(f => !(f.follower_id === Number(params[0]) && f.following_id === Number(params[1])));
      this.saveJsonDb();
      return { changes: 1 };
    }

    if (clean.startsWith('DELETE FROM POSTS')) {
      this.jsonData.posts = this.jsonData.posts.filter(p => p.id !== Number(params[0]));
      this.jsonData.likes = this.jsonData.likes.filter(l => l.post_id !== Number(params[0]));
      this.jsonData.comments = this.jsonData.comments.filter(c => c.post_id !== Number(params[0]));
      this.saveJsonDb();
      return { changes: 1 };
    }

    if (clean.startsWith('UPDATE USERS SET')) {
      const user = this.jsonData.users.find(u => u.id === Number(params[params.length - 1]));
      if (user) {
        user.name = params[0];
        user.bio = params[1];
        user.avatar = params[2];
        user.location = params[3];
        user.website = params[4];
      }
      this.saveJsonDb();
      return { changes: 1 };
    }

    return { changes: 1 };
  }

  allJson(sql, params = []) {
    this.loadJsonDb();
    const clean = sql.trim().toUpperCase();
    if (clean.includes('FROM USERS')) return this.jsonData.users;
    if (clean.includes('FROM POSTS')) return [...this.jsonData.posts].reverse();
    if (clean.includes('FROM LIKES')) return this.jsonData.likes;
    if (clean.includes('FROM COMMENTS')) return this.jsonData.comments;
    if (clean.includes('FROM FOLLOWS')) return this.jsonData.follows;
    return [];
  }

  getJson(sql, params = []) {
    this.loadJsonDb();
    const clean = sql.trim().toUpperCase();
    if (clean.includes('FROM USERS WHERE EMAIL = ?')) {
      return this.jsonData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase()) || null;
    }
    if (clean.includes('FROM USERS WHERE USERNAME = ?')) {
      return this.jsonData.users.find(u => u.username.toLowerCase() === params[0].toLowerCase()) || null;
    }
    if (clean.includes('FROM USERS WHERE ID = ?')) {
      return this.jsonData.users.find(u => u.id === Number(params[0])) || null;
    }
    if (clean.includes('FROM POSTS WHERE ID = ?')) {
      return this.jsonData.posts.find(p => p.id === Number(params[0])) || null;
    }
    if (clean.includes('FROM LIKES WHERE USER_ID = ? AND POST_ID = ?')) {
      return this.jsonData.likes.find(l => l.user_id === Number(params[0]) && l.post_id === Number(params[1])) || null;
    }
    if (clean.includes('FROM FOLLOWS WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = ?')) {
      return this.jsonData.follows.find(f => f.follower_id === Number(params[0]) && f.following_id === Number(params[1])) || null;
    }
    return null;
  }

  async seedData() {
    const existingUsers = await this.all('SELECT * FROM users');
    if (existingUsers.length === 0) {
      const pass = await bcrypt.hash('password123', 10);

      const u1 = await this.run(
        `INSERT INTO users (username, name, email, password, avatar, bio, location, website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'alexrivera',
          'Alex Rivera',
          'alex@dev.com',
          pass,
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=60',
          'Full-stack architect & open source enthusiast 💻 Building resilient cloud apps.',
          'Seattle, WA',
          'https://alexrivera.dev'
        ]
      );

      const u2 = await this.run(
        `INSERT INTO users (username, name, email, password, avatar, bio, location, website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'sarahchen',
          'Sarah Chen',
          'sarah@design.io',
          pass,
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
          'UI/UX Designer & Product Thinker 🎨 Turning complex problems into sleek human interfaces.',
          'San Francisco, CA',
          'https://sarahchen.design'
        ]
      );

      const u3 = await this.run(
        `INSERT INTO users (username, name, email, password, avatar, bio, location, website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'marcusv',
          'Marcus Vance',
          'marcus@ai.org',
          pass,
          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=60',
          'AI Researcher & Python Engineer 🤖 Exploring neural architectures and LLM agents.',
          'Austin, TX',
          'https://marcusvance.ai'
        ]
      );

      // Seed Follow relationships
      await this.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u1.id, u2.id]);
      await this.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u1.id, u3.id]);
      await this.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u2.id, u1.id]);

      // Seed Posts
      const p1 = await this.run(
        `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
        [
          u2.id,
          'Excited to launch our new design system today! 🎨✨ We focused on accessible typography, consistent spacing, and dark mode tokens. Check out the preview below! #DesignSystem #UIUX #WebDesign',
          'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=900&auto=format&fit=crop&q=80'
        ]
      );

      const p2 = await this.run(
        `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
        [
          u1.id,
          'Just deployed the full stack microservices cluster with Node.js and SQLite! Zero latency and smooth real-time event streaming. 🚀 CodeAlpha rocks! #FullStack #NodeJS #CodeAlpha',
          'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80'
        ]
      );

      const p3 = await this.run(
        `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
        [
          u3.id,
          'Deep learning model training finished overnight with 98.4% accuracy on validation set! 🧠 Looking forward to sharing our findings in the upcoming research paper.',
          null
        ]
      );

      // Seed Likes & Comments
      await this.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [u1.id, p1.id]);
      await this.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [u3.id, p1.id]);
      await this.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [u2.id, p2.id]);

      await this.run('INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)', [
        p1.id,
        u1.id,
        'The color contrast and layout tokens look incredible! Great work Sarah!'
      ]);
      await this.run('INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)', [
        p2.id,
        u2.id,
        'Blazing fast performance! Love the architecture choice.'
      ]);
    }
  }
}

const socialDb = new SocialDbService();
module.exports = socialDb;
