const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token || 
                socket.handshake.headers.cookie?.split(';')
                  .find(c => c.trim().startsWith('access_token='))
                  ?.split('=')[1];
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.user_id };
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Store active users and their board subscriptions
const activeUsers = new Map();
const boardRooms = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected`);
  
  // Track active user
  activeUsers.set(socket.user.id, socket.id);
  
  // Join board room
  socket.on('join-board', (boardId) => {
    console.log(`User ${socket.user.id} joined board ${boardId}`);
    
    // Leave any previous boards
    socket.rooms.forEach(room => {
      if (room !== socket.id && room.startsWith('board:')) {
        socket.leave(room);
      }
    });
    
    const roomName = `board:${boardId}`;
    socket.join(roomName);
    
    // Track users in this board
    if (!boardRooms.has(roomName)) {
      boardRooms.set(roomName, new Set());
    }
    boardRooms.get(roomName).add(socket.user.id);
    
    // Emit user list to all members in the room
    const members = Array.from(boardRooms.get(roomName));
    io.to(roomName).emit('board-members', { members });
  });
  
  // Handle board events
  socket.on('board-updated', (data) => {
    const roomName = `board:${data.boardId}`;
    socket.to(roomName).emit('board-updated', data);
  });
  
  // Handle task events
  socket.on('task-created', (task) => {
    const roomName = `board:${task.board_id}`;
    socket.to(roomName).emit('task-created', task);
  });
  
  socket.on('task-updated', (task) => {
    const roomName = `board:${task.board_id}`;
    socket.to(roomName).emit('task-updated', task);
  });
  
  socket.on('task-deleted', (data) => {
    const roomName = `board:${data.boardId}`;
    socket.to(roomName).emit('task-deleted', { taskId: data.taskId });
  });
  
  // Handle member events
  socket.on('member-added', (data) => {
    const roomName = `board:${data.boardId}`;
    socket.to(roomName).emit('member-added', data);
    
    // Notify the added user if they're online
    if (activeUsers.has(data.userId)) {
      io.to(activeUsers.get(data.userId)).emit('board-invitation', {
        boardId: data.boardId,
        role: data.role
      });
    }
  });
  
  socket.on('member-removed', (data) => {
    const roomName = `board:${data.boardId}`;
    socket.to(roomName).emit('member-removed', data);
    
    // Notify the removed user if they're online
    if (activeUsers.has(data.userId)) {
      io.to(activeUsers.get(data.userId)).emit('board-removal', {
        boardId: data.boardId
      });
    }
  });
  
  socket.on('member-role-updated', (data) => {
    const roomName = `board:${data.boardId}`;
    socket.to(roomName).emit('member-role-updated', data);
    
    // Notify the affected user if they're online
    if (activeUsers.has(data.userId)) {
      io.to(activeUsers.get(data.userId)).emit('role-changed', {
        boardId: data.boardId,
        role: data.role
      });
    }
  });
  
  // Leave board
  socket.on('leave-board', (boardId) => {
    const roomName = `board:${boardId}`;
    socket.leave(roomName);
    
    if (boardRooms.has(roomName)) {
      boardRooms.get(roomName).delete(socket.user.id);
      
      // Update member list for remaining users
      const members = Array.from(boardRooms.get(roomName));
      io.to(roomName).emit('board-members', { members });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.id} disconnected`);
    
    // Remove user from active users
    activeUsers.delete(socket.user.id);
    
    // Remove user from all board rooms
    boardRooms.forEach((users, roomName) => {
      if (users.has(socket.user.id)) {
        users.delete(socket.user.id);
        
        // Update member list for remaining users
        const members = Array.from(users);
        io.to(roomName).emit('board-members', { members });
      }
    });
  });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
const PORT = process.env.SOCKET_PORT;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});