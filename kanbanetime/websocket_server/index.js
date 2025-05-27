const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // React app URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Store active connections per board
const boardConnections = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a board room
  socket.on('join-board', (boardId, userId) => {
    socket.join(`board-${boardId}`);
    
    // Track connections per board
    if (!boardConnections.has(boardId)) {
      boardConnections.set(boardId, new Set());
    }
    boardConnections.get(boardId).add(socket.id);
    
    console.log(`User ${userId} joined board ${boardId}`);
    
    // Notify others in the board about the new connection
    socket.to(`board-${boardId}`).emit('user-joined', {
      userId,
      socketId: socket.id
    });
    
    // Send current online count
    const onlineCount = boardConnections.get(boardId).size;
    io.to(`board-${boardId}`).emit('online-count', onlineCount);
  });

  // Leave a board room
  socket.on('leave-board', (boardId, userId) => {
    socket.leave(`board-${boardId}`);
    
    if (boardConnections.has(boardId)) {
      boardConnections.get(boardId).delete(socket.id);
      
      // Clean up empty board connections
      if (boardConnections.get(boardId).size === 0) {
        boardConnections.delete(boardId);
      } else {
        const onlineCount = boardConnections.get(boardId).size;
        io.to(`board-${boardId}`).emit('online-count', onlineCount);
      }
    }
    
    console.log(`User ${userId} left board ${boardId}`);
    socket.to(`board-${boardId}`).emit('user-left', {
      userId,
      socketId: socket.id
    });
  });

  // Task created
  socket.on('task-created', (data) => {
    const { boardId, task, userId } = data;
    socket.to(`board-${boardId}`).emit('task-created', {
      task,
      createdBy: userId
    });
    console.log(`Task created in board ${boardId} by user ${userId}`);
  });

  // Task updated (content or status change)
  socket.on('task-updated', (data) => {
    const { boardId, task, userId, previousStatus } = data;
    socket.to(`board-${boardId}`).emit('task-updated', {
      task,
      updatedBy: userId,
      previousStatus
    });
    console.log(`Task ${task.id} updated in board ${boardId} by user ${userId}`);
  });

  // Task deleted
  socket.on('task-deleted', (data) => {
    const { boardId, taskId, userId } = data;
    socket.to(`board-${boardId}`).emit('task-deleted', {
      taskId,
      deletedBy: userId
    });
    console.log(`Task ${taskId} deleted in board ${boardId} by user ${userId}`);
  });

  // Board updated (name change)
  socket.on('board-updated', (data) => {
    const { boardId, board, userId } = data;
    socket.to(`board-${boardId}`).emit('board-updated', {
      board,
      updatedBy: userId
    });
    console.log(`Board ${boardId} updated by user ${userId}`);
  });

  // Member added
  socket.on('member-added', (data) => {
    const { boardId, member, userId } = data;
    socket.to(`board-${boardId}`).emit('member-added', {
      member,
      addedBy: userId
    });
    console.log(`Member added to board ${boardId} by user ${userId}`);
  });

  // Member removed
  socket.on('member-removed', (data) => {
    const { boardId, memberId, userId } = data;
    socket.to(`board-${boardId}`).emit('member-removed', {
      memberId,
      removedBy: userId
    });
    console.log(`Member ${memberId} removed from board ${boardId} by user ${userId}`);
  });

  // Member role updated
  socket.on('member-role-updated', (data) => {
    const { boardId, memberId, newRole, userId } = data;
    socket.to(`board-${boardId}`).emit('member-role-updated', {
      memberId,
      newRole,
      updatedBy: userId
    });
    console.log(`Member ${memberId} role updated to ${newRole} in board ${boardId} by user ${userId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up board connections
    for (const [boardId, connections] of boardConnections.entries()) {
      if (connections.has(socket.id)) {
        connections.delete(socket.id);
        
        if (connections.size === 0) {
          boardConnections.delete(boardId);
        } else {
          const onlineCount = connections.size;
          io.to(`board-${boardId}`).emit('online-count', onlineCount);
        }
        
        socket.to(`board-${boardId}`).emit('user-disconnected', {
          socketId: socket.id
        });
        break;
      }
    }
  });

  // Typing indicators for real-time collaboration
  socket.on('user-typing', (data) => {
    const { boardId, userId, username, columnId } = data;
    socket.to(`board-${boardId}`).emit('user-typing', {
      userId,
      username,
      columnId,
      socketId: socket.id
    });
  });

  socket.on('user-stopped-typing', (data) => {
    const { boardId, userId, columnId } = data;
    socket.to(`board-${boardId}`).emit('user-stopped-typing', {
      userId,
      columnId,
      socketId: socket.id
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});