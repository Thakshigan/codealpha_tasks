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
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const PORT = process.env.PORT || 3003;

// Attach io to app so routes can broadcast updates
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io Real-time rooms & events
io.on('connection', (socket) => {
  console.log('Client connected to Project Management Socket:', socket.id);

  socket.on('join_project', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`Socket ${socket.id} joined project_${projectId}`);
  });

  socket.on('leave_project', (projectId) => {
    socket.leave(`project_${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from Socket:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'CodeAlpha_Project_Management_Tool', timestamp: new Date() });
});

// SPA route fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CodeAlpha Project Management Tool is running:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=================================================`);
});
