const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e8 // 100MB for file sharing chunks
});

const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Active rooms state
// roomCode -> { passcode, hostId, participants: [{ socketId, name, audio, video }] }
const rooms = new Map();

// API Endpoints
app.post('/api/rooms/create', (req, res) => {
  const { hostName, passcode } = req.body;
  const roomCode = 'alpha-' + Math.random().toString(36).substring(2, 8);

  rooms.set(roomCode, {
    roomCode,
    passcode: passcode || '',
    hostName: hostName || 'Host',
    createdAt: new Date(),
    participants: []
  });

  res.json({ success: true, roomCode, passcode });
});

app.post('/api/rooms/verify', (req, res) => {
  const { roomCode, passcode } = req.body;
  const room = rooms.get(roomCode);

  if (!room) {
    // If room doesn't exist yet, auto-create open room
    rooms.set(roomCode, {
      roomCode,
      passcode: passcode || '',
      hostName: 'Host',
      createdAt: new Date(),
      participants: []
    });
    return res.json({ valid: true, requiresPasscode: false });
  }

  if (room.passcode && room.passcode !== passcode) {
    return res.status(403).json({ valid: false, error: 'Incorrect meeting passcode.' });
  }

  res.json({ valid: true });
});

// WebRTC Signaling & Real-time Collaboration Socket
io.on('connection', (socket) => {
  console.log('User connected to WebRTC signaling:', socket.id);

  // Join Room
  socket.on('join_room', ({ roomCode, userName, passcode }) => {
    let room = rooms.get(roomCode);
    if (!room) {
      room = { roomCode, passcode: passcode || '', hostName: userName, participants: [] };
      rooms.set(roomCode, room);
    }

    if (room.passcode && room.passcode !== passcode) {
      socket.emit('error_message', 'Invalid room passcode.');
      return;
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.userName = userName;

    // Notify other peers in the room
    socket.to(roomCode).emit('user_joined', {
      socketId: socket.id,
      userName: userName
    });

    // Send existing peers in room to newly joined user
    const existingPeers = [];
    const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
    if (socketsInRoom) {
      for (const id of socketsInRoom) {
        if (id !== socket.id) {
          const s = io.sockets.sockets.get(id);
          existingPeers.push({
            socketId: id,
            userName: s ? s.userName : 'Participant'
          });
        }
      }
    }

    socket.emit('existing_users', { peers: existingPeers });
    console.log(`${userName} (${socket.id}) joined room: ${roomCode}`);
  });

  // WebRTC Signal forwarding (Offer, Answer, ICE Candidate)
  socket.on('webrtc_signal', ({ targetSocketId, signal, senderName }) => {
    io.to(targetSocketId).emit('webrtc_signal', {
      senderSocketId: socket.id,
      senderName: senderName || socket.userName,
      signal
    });
  });

  // In-Meeting Chat
  socket.on('chat_message', ({ message, senderName, time, isEncrypted }) => {
    if (socket.roomCode) {
      io.to(socket.roomCode).emit('chat_message', {
        senderId: socket.id,
        senderName: senderName || socket.userName,
        message,
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEncrypted: !!isEncrypted
      });
    }
  });

  // File Sharing Broadcast
  socket.on('file_share', ({ fileName, fileType, fileSize, fileData, senderName }) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('file_received', {
        fileName,
        fileType,
        fileSize,
        fileData,
        senderName: senderName || socket.userName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Whiteboard Real-time Drawing Events
  socket.on('whiteboard_draw', (drawData) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('whiteboard_draw', drawData);
    }
  });

  socket.on('whiteboard_clear', () => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('whiteboard_clear');
    }
  });

  // Media state changes (Mute/Unmute audio or video)
  socket.on('media_state_change', ({ audio, video }) => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('user_media_state', {
        socketId: socket.id,
        audio,
        video
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('user_left', {
        socketId: socket.id,
        userName: socket.userName
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'CodeAlpha_RealTime_Communication_App', activeRooms: rooms.size });
});

// SPA routing fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CodeAlpha Real-Time Communication App running:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=================================================`);
});
