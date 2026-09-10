// Live Kanban Board Script with Real-Time WebSockets
let currentProject = null;
let currentTasks = [];
let teamMembers = [];
let draggedTaskId = null;
let socket = null;

async function initBoard() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  if (!projectId) {
    window.location.href = '/';
    return;
  }

  if (!PMAuth.isLoggedIn()) {
    Toast.show('Please sign in to view this board', 'error');
    window.location.href = '/';
    return;
  }

  // Connect Socket.IO
  if (typeof io !== 'undefined') {
    socket = io();
    socket.emit('join_project', projectId);

    socket.on('task_moved', (data) => {
      moveTaskInDOM(data.taskId, data.status);
      updateColumnCounts();
      Toast.show('A task was moved by a team member', 'info');
    });

    socket.on('task_created', (task) => {
      currentTasks.push(task);
      renderTaskCard(task);
      updateColumnCounts();
      Toast.show(`New task: "${task.title}"`, 'info');
    });

    socket.on('comment_added', (data) => {
      const task = currentTasks.find(t => t.id === data.taskId);
      if (task) task.comments_count = (task.comments_count || 0) + 1;
      const countEl = document.getElementById(`task-comments-count-${data.taskId}`);
      if (countEl) countEl.innerHTML = `<i class="far fa-comment"></i> ${task.comments_count}`;
    });

    socket.on('task_deleted', (data) => {
      document.getElementById(`task-card-${data.taskId}`)?.remove();
      currentTasks = currentTasks.filter(t => t.id !== data.taskId);
      updateColumnCounts();
    });
  }

  await loadBoardData(projectId);
  setupDragAndDrop();
}

async function loadBoardData(projectId) {
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${PMAuth.getToken()}` }
    });
    if (!res.ok) throw new Error('Project not found');
    const data = await res.json();

    currentProject = data.project;
    currentTasks = data.tasks || [];
    teamMembers = data.team || [];

    document.title = `${currentProject.title} — Board`;
    document.getElementById('board-project-title').textContent = currentProject.title;
    document.getElementById('board-project-desc').textContent = currentProject.description || '';

    // Render team members in assignee dropdown
    const assigneeSelect = document.getElementById('new-task-assignee');
    if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">Unassigned</option>' + teamMembers.map(u => `
        <option value="${u.id}">${u.name} (${u.role})</option>
      `).join('');
    }

    renderBoardTasks();
    renderActivityLogs(data.activity_logs || []);
  } catch (err) {
    document.getElementById('kanban-board-container').innerHTML = `
      <div style="text-align:center; padding:4rem; width:100%;">
        <h2>Error Loading Board</h2>
        <p style="color:var(--danger);">${err.message}</p>
        <a href="/" style="margin-top:1rem; display:inline-block; color:var(--primary); font-weight:700;">Back to Dashboard</a>
      </div>
    `;
  }
}

function renderBoardTasks() {
  const columns = ['todo', 'in_progress', 'review', 'done'];
  columns.forEach(col => {
    const container = document.getElementById(`cards-container-${col}`);
    if (container) container.innerHTML = '';
  });

  currentTasks.forEach(task => {
    renderTaskCard(task);
  });

  updateColumnCounts();
}

function renderTaskCard(task) {
  const container = document.getElementById(`cards-container-${task.status || 'todo'}`);
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'task-card';
  card.id = `task-card-${task.id}`;
  card.draggable = true;
  card.dataset.taskId = task.id;

  const priorityClass = `priority-${task.priority || 'medium'}`;

  card.innerHTML = `
    <span class="priority-badge ${priorityClass}">${task.priority}</span>
    <div class="task-title" onclick="openTaskDetails(${task.id})">${task.title}</div>
    ${task.due_date ? `<div style="font-size:0.75rem; color:var(--slate); margin-bottom:0.4rem;"><i class="far fa-clock"></i> Due ${task.due_date}</div>` : ''}
    
    <div class="task-meta">
      <div id="task-comments-count-${task.id}">
        <i class="far fa-comment"></i> ${task.comments_count || 0}
      </div>
      <div>
        ${task.assignee ? `
          <img src="${task.assignee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}" title="${task.assignee.name}" class="assignee-avatar">
        ` : '<span style="font-size:0.75rem; color:var(--muted);"><i class="far fa-user"></i> Unassigned</span>'}
      </div>
    </div>
  `;

  // Attach Drag Events
  card.addEventListener('dragstart', (e) => {
    draggedTaskId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', task.id);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedTaskId = null;
  });

  container.appendChild(card);
}

function setupDragAndDrop() {
  const columns = document.querySelectorAll('.cards-container');

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
      const targetStatus = col.dataset.status;

      if (taskId && targetStatus) {
        moveTaskInDOM(taskId, targetStatus);
        updateColumnCounts();

        try {
          await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${PMAuth.getToken()}`
            },
            body: JSON.stringify({ status: targetStatus })
          });
        } catch (err) {
          console.error('Failed to sync status:', err);
        }
      }
    });
  });
}

function moveTaskInDOM(taskId, newStatus) {
  const card = document.getElementById(`task-card-${taskId}`);
  const targetCol = document.getElementById(`cards-container-${newStatus}`);
  if (card && targetCol) {
    targetCol.appendChild(card);
    const task = currentTasks.find(t => t.id === Number(taskId));
    if (task) task.status = newStatus;
  }
}

function updateColumnCounts() {
  ['todo', 'in_progress', 'review', 'done'].forEach(status => {
    const col = document.getElementById(`cards-container-${status}`);
    const badge = document.getElementById(`count-${status}`);
    if (col && badge) {
      badge.textContent = col.children.length;
    }
  });
}

function renderActivityLogs(logs) {
  const container = document.getElementById('activity-logs-list');
  if (!container) return;

  container.innerHTML = logs.map(l => `
    <div style="padding:0.6rem 0; border-bottom:1px solid #f1f5f9; font-size:0.82rem;">
      <strong>${l.user_name}</strong> ${l.action}
      <div style="color:var(--muted); font-size:0.75rem; margin-top:0.2rem;">${new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
    </div>
  `).join('');
}

// Open Task Details Modal
async function openTaskDetails(taskId) {
  const modal = document.getElementById('task-detail-modal');
  const body = document.getElementById('task-detail-body');
  modal.classList.add('active');
  body.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${PMAuth.getToken()}` }
    });
    const data = await res.json();
    const t = data.task;

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
        <div>
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          <h2 style="font-size:1.3rem; font-weight:800; margin-top:0.4rem;">${t.title}</h2>
        </div>
        <button onclick="deleteTask(${t.id})" style="background:#fee2e2; color:var(--danger); border:none; padding:0.4rem 0.8rem; border-radius:6px; font-weight:700; cursor:pointer;">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>

      <p style="color:var(--slate); margin-bottom:1.5rem; line-height:1.6;">${t.description || 'No detailed description.'}</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; background:var(--column-bg); padding:1rem; border-radius:8px; margin-bottom:1.5rem; font-size:0.85rem;">
        <div><strong>Assignee:</strong> ${t.assignee ? t.assignee.name : 'Unassigned'}</div>
        <div><strong>Due Date:</strong> ${t.due_date || 'No deadline set'}</div>
      </div>

      <!-- Comments Thread -->
      <h4 style="font-size:1rem; font-weight:800; margin-bottom:0.8rem;"><i class="far fa-comments"></i> Discussion</h4>
      <div id="modal-task-comments" style="max-height:200px; overflow-y:auto; margin-bottom:1rem;">
        ${t.comments && t.comments.length > 0 ? t.comments.map(c => `
          <div style="display:flex; gap:0.6rem; margin-bottom:0.8rem; font-size:0.85rem;">
            <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
            <div style="background:#f1f5f9; padding:0.5rem 0.8rem; border-radius:8px; flex:1;">
              <strong>${c.name}</strong>: ${c.comment}
            </div>
          </div>
        `).join('') : '<p style="color:var(--muted); font-size:0.85rem;">No comments yet.</p>'}
      </div>

      <form onsubmit="event.preventDefault(); submitTaskComment(${t.id});" style="display:flex; gap:0.5rem;">
        <input type="text" id="modal-comment-input" class="form-input" placeholder="Type a message or update..." required>
        <button type="submit" class="btn-primary" style="padding:0.5rem 1rem;"><i class="fas fa-paper-plane"></i></button>
      </form>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:var(--danger)">Failed to load details</div>`;
  }
}

async function submitTaskComment(taskId) {
  const input = document.getElementById('modal-comment-input');
  const comment = input.value.trim();
  if (!comment) return;

  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PMAuth.getToken()}`
      },
      body: JSON.stringify({ comment })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to comment');

    input.value = '';
    openTaskDetails(taskId);
    Toast.show('Comment posted', 'success');
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${PMAuth.getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to delete task');

    document.getElementById('task-detail-modal').classList.remove('active');
    document.getElementById(`task-card-${taskId}`)?.remove();
    updateColumnCounts();
    Toast.show('Task deleted', 'info');
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

function openCreateTaskModal(status = 'todo') {
  document.getElementById('new-task-status').value = status;
  document.getElementById('create-task-modal').classList.add('active');
}

function closeCreateTaskModal() {
  document.getElementById('create-task-modal').classList.remove('active');
}

async function handleCreateTask(event) {
  event.preventDefault();
  const title = document.getElementById('new-task-title').value.trim();
  const description = document.getElementById('new-task-desc').value.trim();
  const priority = document.getElementById('new-task-priority').value;
  const status = document.getElementById('new-task-status').value;
  const assigned_to = document.getElementById('new-task-assignee').value;
  const due_date = document.getElementById('new-task-due').value;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PMAuth.getToken()}`
      },
      body: JSON.stringify({
        project_id: currentProject.id,
        title,
        description,
        priority,
        status,
        assigned_to: assigned_to || null,
        due_date: due_date || null
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create task');

    Toast.show('Task added to board!', 'success');
    closeCreateTaskModal();
    document.getElementById('create-task-form').reset();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  PMAuth.updateUI();
  initBoard();
});
