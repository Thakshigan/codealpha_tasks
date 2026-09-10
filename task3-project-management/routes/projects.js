const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await db.all('SELECT * FROM projects ORDER BY id DESC');
    const tasks = await db.all('SELECT id, project_id, status FROM tasks');

    const hydrated = projects.map(p => {
      const projTasks = tasks.filter(t => t.project_id === p.id);
      const total = projTasks.length;
      const completed = projTasks.filter(t => t.status === 'done').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...p,
        stats: {
          total_tasks: total,
          completed_tasks: completed,
          progress_percent: percent
        }
      };
    });

    res.json({ projects: hydrated });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, color } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const result = await db.run(
      'INSERT INTO projects (title, description, color, owner_id) VALUES (?, ?, ?, ?)',
      [title.trim(), description || '', color || '#4f46e5', req.user.id]
    );

    await db.run(
      'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
      [result.id, req.user.name, `created project "${title.trim()}"`]
    );

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get single project with tasks, activity logs, and board columns
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, id DESC', [projectId]);
    const users = await db.all('SELECT id, name, email, avatar, role FROM users');
    const userMap = new Map(users.map(u => [u.id, u]));

    const comments = await db.all('SELECT * FROM task_comments');
    const logs = await db.all('SELECT * FROM activity_logs WHERE project_id = ? ORDER BY id DESC LIMIT 15', [projectId]);

    const hydratedTasks = tasks.map(t => ({
      ...t,
      assignee: t.assigned_to ? userMap.get(t.assigned_to) || null : null,
      comments_count: comments.filter(c => c.task_id === t.id).length
    }));

    res.json({
      project,
      tasks: hydratedTasks,
      activity_logs: logs,
      team: users
    });
  } catch (error) {
    console.error('Failed to get project board:', error);
    res.status(500).json({ error: 'Failed to get project board' });
  }
});

module.exports = router;
