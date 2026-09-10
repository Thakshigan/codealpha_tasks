// Meeting Lobby & Room Coordinator
let socket = null;
let currentRoomCode = '';
let currentUserName = '';
let currentPasscode = '';

// Lobby Quick Join & Create Meeting
async function createNewMeeting(e) {
  e.preventDefault();
  const hostName = document.getElementById('host-name').value.trim();
  const passcode = document.getElementById('host-passcode').value.trim();

  if (!hostName) return;

  try {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, passcode })
    });
    const data = await res.json();

    sessionStorage.setItem('alpha_user_name', hostName);
    sessionStorage.setItem('alpha_passcode', passcode);
    window.location.href = `/room.html?room=${data.roomCode}`;
  } catch (err) {
    alert('Failed to initialize meeting room');
  }
}

async function joinExistingMeeting(e) {
  e.preventDefault();
  const userName = document.getElementById('join-name').value.trim();
  const roomCode = document.getElementById('join-room-code').value.trim().toLowerCase();
  const passcode = document.getElementById('join-passcode').value.trim();

  if (!userName || !roomCode) return;

  try {
    const res = await fetch('/api/rooms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, passcode })
    });
    const data = await res.json();
    if (!res.ok || !data.valid) {
      alert(data.error || 'Failed to enter room. Check room code or passcode.');
      return;
    }

    sessionStorage.setItem('alpha_user_name', userName);
    sessionStorage.setItem('alpha_passcode', passcode);
    window.location.href = `/room.html?room=${roomCode}`;
  } catch (err) {
    alert('Error connecting to room server');
  }
}

// Room Page Main Setup
async function initConferenceRoom() {
  const params = new URLSearchParams(window.location.search);
  currentRoomCode = params.get('room');
  currentUserName = sessionStorage.getItem('alpha_user_name') || 'Guest-' + Math.floor(Math.random() * 1000);
  currentPasscode = sessionStorage.getItem('alpha_passcode') || '';

  if (!currentRoomCode) {
    window.location.href = '/';
    return;
  }

  document.getElementById('display-room-code').textContent = currentRoomCode;
  document.getElementById('local-user-name').textContent = currentUserName + ' (You)';

  // Initialize Socket.io
  if (typeof io !== 'undefined') {
    socket = io();

    socket.emit('join_room', {
      roomCode: currentRoomCode,
      userName: currentUserName,
      passcode: currentPasscode
    });

    // Handle existing users in room
    socket.on('existing_users', ({ peers }) => {
      console.log('Existing peers in room:', peers);
      peers.forEach(peer => {
        callPeer(peer.socketId, peer.userName);
      });
    });

    // Handle new user joining room
    socket.on('user_joined', ({ socketId, userName }) => {
      console.log(`Peer joined: ${userName} (${socketId})`);
      appendChatMessage({
        senderName: 'System',
        message: `${userName} joined the meeting`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Handle WebRTC signals from peers
    socket.on('webrtc_signal', handleIncomingSignal);

    // Handle peer disconnection
    socket.on('user_left', ({ socketId, userName }) => {
      removeRemoteVideo(socketId);
      appendChatMessage({
        senderName: 'System',
        message: `${userName || 'Participant'} left the meeting`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Handle whiteboard sync
    socket.on('whiteboard_draw', (data) => {
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
    });

    socket.on('whiteboard_clear', () => {
      clearWhiteboard(false);
    });

    socket.on('error_message', (msg) => {
      alert(msg);
      window.location.href = '/';
    });
  }

  // Initialize Local Media & Features
  await initLocalMedia();
  initWhiteboard();
  initChatEngine();
}

function leaveMeeting() {
  if (confirm('Are you sure you want to leave this meeting?')) {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
    window.location.href = '/';
  }
}

function copyRoomInvite() {
  const url = `${window.location.origin}/room.html?room=${currentRoomCode}`;
  navigator.clipboard.writeText(url);
  alert(`Meeting invite link copied!\n${url}`);
}
