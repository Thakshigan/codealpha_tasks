const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Helper to broadcast socket events
function broadcastUpdate(req, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(`project_${data.project_id || data.projectId}`).emit(event, data);
  }
}

// Create Task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, title, description, status, priority, assigned_to, due_date } = req.body;
    if (!project_id || !title) {
      return res.status(400).json({ error: 'Project ID and task title are required.' });
    }

    const result = await db.run(
      `INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(project_id),
        title.trim(),
        description || '',
        status || 'todo',
        priority || 'medium',
        assigned_to ? Number(assigned_to) : null,
        due_date || null,
        0
      ]
    );

    await db.run(
      'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
      [Number(project_id), req.user.name, `added task "${title.trim()}"`]
    );

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [result.id]);
    const users = await db.all('SELECT id, name, email, avatar, role FROM users');
    const userMap = new Map(users.map(u => [u.id, u]));

    const payload = {
      ...newTask,
      assignee: newTask.assigned_to ? userMap.get(newTask.assigned_to) : null,
      comments_count: 0
    };

    broadcastUpdate(req, 'task_created', payload);

    res.status(201).json({ message: 'Task created', task: payload });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update Task Status (Drag & Drop or Column Move)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { status } = req.body; // 'todo', 'in_progress', 'review', 'done'

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);

    const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
    await db.run(
      'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
      [task.project_id, req.user.name, `moved "${task.title}" to ${statusLabels[status] || status}`]
    );

    broadcastUpdate(req, 'task_moved', { taskId, status, project_id: task.project_id });

    res.json({ message: 'Task status updated', taskId, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Get Task Details with Comments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comments = await db.all(
      'SELECT c.*, u.name, u.avatar FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.id ASC',
      [taskId]
    );

    const users = await db.all('SELECT id, name, email, avatar, role FROM users');
    const assignee = task.assigned_to ? users.find(u => u.id === task.assigned_to) : null;

    res.json({ task: { ...task, assignee, comments } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// Add Comment to Task
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const result = await db.run(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, req.user.id, comment.trim()]
    );

    const newComment = {
      id: result.id,
      task_id: taskId,
      user_id: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar,
      comment: comment.trim(),
      created_at: new Date().toISOString()
    };

    broadcastUpdate(req, 'comment_added', { taskId, comment: newComment, project_id: task.project_id });

    res.status(201).json({ message: 'Comment added', comment: newComment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete Task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    await db.run(
      'INSERT INTO activity_logs (project_id, user_name, action) VALUES (?, ?, ?)',
      [task.project_id, req.user.name, `deleted task "${task.title}"`]
    );

    broadcastUpdate(req, 'task_deleted', { taskId, project_id: task.project_id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
