const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('sqlite3 native module not available, fallback to JSON DB');
}

const dbPath = path.join(__dirname, 'pm_data.db');

class PMDbService {
  constructor() {
    this.isSqlite = !!sqlite3;
    this.jsonDbPath = path.join(__dirname, 'pm_data.json');
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
    console.log('Project Management Database ready.');
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
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        role TEXT DEFAULT 'developer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#4f46e5',
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assigned_to INTEGER,
        due_date TEXT,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      this.jsonData = { users: [], projects: [], tasks: [], task_comments: [], activity_logs: [] };
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
      const user = { id, name: params[0], email: params[1], password: params[2], avatar: params[3], role: params[4] || 'developer', created_at: new Date().toISOString() };
      this.jsonData.users.push(user);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO PROJECTS')) {
      const id = (this.jsonData.projects.length ? Math.max(...this.jsonData.projects.map(p => p.id)) : 0) + 1;
      const proj = { id, title: params[0], description: params[1], color: params[2] || '#4f46e5', owner_id: Number(params[3]), created_at: new Date().toISOString() };
      this.jsonData.projects.push(proj);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO TASKS')) {
      const id = (this.jsonData.tasks.length ? Math.max(...this.jsonData.tasks.map(t => t.id)) : 0) + 1;
      const task = {
        id,
        project_id: Number(params[0]),
        title: params[1],
        description: params[2] || '',
        status: params[3] || 'todo',
        priority: params[4] || 'medium',
        assigned_to: params[5] ? Number(params[5]) : null,
        due_date: params[6] || null,
        position: params[7] ? Number(params[7]) : 0,
        created_at: new Date().toISOString()
      };
      this.jsonData.tasks.push(task);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('UPDATE TASKS SET STATUS')) {
      const task = this.jsonData.tasks.find(t => t.id === Number(params[1]));
      if (task) task.status = params[0];
      this.saveJsonDb();
      return { changes: 1 };
    }

    if (clean.startsWith('DELETE FROM TASKS WHERE ID = ?')) {
      this.jsonData.tasks = this.jsonData.tasks.filter(t => t.id !== Number(params[0]));
      this.jsonData.task_comments = this.jsonData.task_comments.filter(c => c.task_id !== Number(params[0]));
      this.saveJsonDb();
      return { changes: 1 };
    }

    if (clean.startsWith('INSERT INTO TASK_COMMENTS')) {
      const id = (this.jsonData.task_comments.length ? Math.max(...this.jsonData.task_comments.map(c => c.id)) : 0) + 1;
      const comment = { id, task_id: Number(params[0]), user_id: Number(params[1]), comment: params[2], created_at: new Date().toISOString() };
      this.jsonData.task_comments.push(comment);
      this.saveJsonDb();
      return { id };
    }

    if (clean.startsWith('INSERT INTO ACTIVITY_LOGS')) {
      const id = (this.jsonData.activity_logs.length ? Math.max(...this.jsonData.activity_logs.map(a => a.id)) : 0) + 1;
      const log = { id, project_id: Number(params[0]), user_name: params[1], action: params[2], created_at: new Date().toISOString() };
      this.jsonData.activity_logs.push(log);
      this.saveJsonDb();
      return { id };
    }

    return { changes: 1 };
  }

  allJson(sql, params = []) {
    this.loadJsonDb();
    const clean = sql.trim().toUpperCase();
    if (clean.includes('FROM USERS')) return this.jsonData.users;
    if (clean.includes('FROM PROJECTS')) return this.jsonData.projects;
    if (clean.includes('FROM TASKS')) {
      if (params.length > 0) return this.jsonData.tasks.filter(t => t.project_id === Number(params[0]));
      return this.jsonData.tasks;
    }
    if (clean.includes('FROM TASK_COMMENTS')) {
      if (params.length > 0) return this.jsonData.task_comments.filter(c => c.task_id === Number(params[0]));
      return this.jsonData.task_comments;
    }
    if (clean.includes('FROM ACTIVITY_LOGS')) {
      if (params.length > 0) return this.jsonData.activity_logs.filter(a => a.project_id === Number(params[0])).reverse();
      return [...this.jsonData.activity_logs].reverse();
    }
    return [];
  }

  getJson(sql, params = []) {
    this.loadJsonDb();
    const clean = sql.trim().toUpperCase();
    if (clean.includes('FROM USERS WHERE EMAIL = ?')) {
      return this.jsonData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase()) || null;
    }
    if (clean.includes('FROM USERS WHERE ID = ?')) {
      return this.jsonData.users.find(u => u.id === Number(params[0])) || null;
    }
    if (clean.includes('FROM PROJECTS WHERE ID = ?')) {
      return this.jsonData.projects.find(p => p.id === Number(params[0])) || null;
    }
    if (clean.includes('FROM TASKS WHERE ID = ?')) {
      return this.jsonData.tasks.find(t => t.id === Number(params[0])) || null;
    }
    return null;
  }

  async seedData() {
    const existingUsers = await this.all('SELECT * FROM users');
    if (existingUsers.length === 0) {
      const pass = await bcrypt.hash('team123', 10);

      const u1 = await this.run(
        'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
        ['Emily Watson', 'emily@team.com', pass, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', 'Project Lead']
      );

      const u2 = await this.run(
        'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
        ['Liam Davis', 'liam@team.com', pass, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', 'Full Stack Engineer']
      );

      const u3 = await this.run(
        'INSERT INTO users (name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
        ['Sophia Martinez', 'sophia@team.com', pass, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', 'UI/UX Designer']
      );

      // Seed Projects
      const p1 = await this.run(
        'INSERT INTO projects (title, description, color, owner_id) VALUES (?, ?, ?, ?)',
        ['AlphaCloud Platform v2.0', 'Next-generation cloud infrastructure management dashboard with real-time analytics and telemetry.', '#4f46e5', u1.id]
      );

      const p2 = await this.run(
        'INSERT INTO projects (title, description, color, owner_id) VALUES (?, ?, ?, ?)',
        ['Mobile App Redesign', 'Complete UX overhaul of the iOS and Android mobile apps for improved customer retention.', '#06b6d4', u3.id]
      );

      // Seed Tasks for Project 1
      const t1 = await this.run(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p1.id, 'Design GraphQL schema for microservices', 'Define queries, mutations, and subscription types for high-throughput live metrics.', 'done', 'high', u2.id, '2026-09-05', 0]
      );

      const t2 = await this.run(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p1.id, 'Implement JWT Authentication & RBAC', 'Setup access tokens, refresh tokens, role middlewares, and rate limiters.', 'in_progress', 'urgent', u2.id, '2026-09-10', 0]
      );

      const t3 = await this.run(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p1.id, 'Refactor Kanban Drag & Drop Animations', 'Add tactile physics feedback and smooth CSS transitions when dragging cards between columns.', 'review', 'medium', u3.id, '2026-09-12', 0]
      );

      const t4 = await this.run(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p1.id, 'Configure CI/CD automated test pipeline', 'Write GitHub Actions workflow for unit tests, linting, and Docker container deployment.', 'todo', 'high', u1.id, '2026-09-15', 0]
      );

      const t5 = await this.run(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p1.id, 'Draft Product Release Notes & Documentation', 'Document all newly exposed REST endpoints, websocket events, and migration guidelines.', 'todo', 'low', u1.id, '2026-09-20', 1]
      );

      // Seed Comments
      await this.run(
        'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
        [t2.id, u1.id, 'Make sure we include brute-force rate limiting on the `/api/auth/login` endpoint!']
      );

      await this.run(
        'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
        [t2.id, u2.id, 'Will do Emily! Adding express-rate-limit and redis-backed token revocation.']
      );

      // Seed Activity Logs
      await this.run(
        'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
        [p1.id, 'Emily Watson', 'created project "AlphaCloud Platform v2.0"']
      );
      await this.run(
        'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
        [p1.id, 'Liam Davis', 'moved task "Design GraphQL schema" to Done']
      );
    }
  }
}

const pmDb = new PMDbService();
module.exports = pmDb;
