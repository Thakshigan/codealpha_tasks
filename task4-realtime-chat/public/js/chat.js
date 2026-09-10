// In-Meeting Chat & File Sharing Engine
function initChatEngine() {
  // Listen for chat messages
  if (typeof socket !== 'undefined' && socket) {
    socket.on('chat_message', (msg) => {
      appendChatMessage(msg);
    });

    socket.on('file_received', (fileObj) => {
      appendFileMessage(fileObj);
    });
  }
}

function sendChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (socket) {
    socket.emit('chat_message', {
      message: text,
      senderName: currentUserName,
      isEncrypted: true
    });
  }

  input.value = '';
}

function appendChatMessage({ senderName, senderId, message, time, isEncrypted }) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isMine = senderName === currentUserName || senderId === socket?.id;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isMine ? 'mine' : ''}`;

  bubble.innerHTML = `
    <div class="chat-sender">
      <span>${isMine ? 'You' : senderName}</span>
      <span>${time || ''} ${isEncrypted ? '<i class="fas fa-lock" style="font-size:0.65rem; color:#10b981;" title="End-to-End Encrypted"></i>' : ''}</span>
    </div>
    <div style="word-break: break-word; color: #f1f5f9;">${escapeHtml(message)}</div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// File Sharing
function triggerFileUpload() {
  const fileInput = document.getElementById('file-share-input');
  if (fileInput) fileInput.click();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 25 * 1024 * 1024) {
    alert('File exceeds maximum size limit of 25MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const fileData = reader.result;

    if (socket) {
      socket.emit('file_share', {
        fileName: file.name,
        fileType: file.type,
        fileSize: formatBytes(file.size),
        fileData: fileData,
        senderName: currentUserName
      });

      // Render locally for sender as well
      appendFileMessage({
        fileName: file.name,
        fileType: file.type,
        fileSize: formatBytes(file.size),
        fileData: fileData,
        senderName: 'You',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  reader.readAsDataURL(file);
  e.target.value = '';
}

function appendFileMessage({ fileName, fileSize, fileData, senderName, time }) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isMine = senderName === 'You' || senderName === currentUserName;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isMine ? 'mine' : ''}`;

  bubble.innerHTML = `
    <div class="chat-sender">
      <span>${senderName}</span>
      <span>${time}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 0.8rem; background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 8px; margin-top: 0.3rem;">
      <i class="fas fa-file-download fa-2x" style="color: var(--primary);"></i>
      <div style="flex: 1; overflow: hidden;">
        <div style="font-weight: 700; font-size: 0.85rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(fileName)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${fileSize}</div>
      </div>
      <a href="${fileData}" download="${fileName}" style="background: var(--primary); color: white; padding: 0.35rem 0.7rem; border-radius: 6px; text-decoration: none; font-size: 0.75rem; font-weight: 700;">
        Download
      </a>
    </div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function toggleChatDrawer() {
  const sidebar = document.getElementById('room-sidebar');
  const btn = document.getElementById('btn-toggle-chat');

  if (sidebar.style.display === 'none' || !sidebar.style.display) {
    sidebar.style.display = 'flex';
    btn?.classList.add('active');
  } else {
    sidebar.style.display = 'none';
    btn?.classList.remove('active');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
