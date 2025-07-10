require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('Socket.IO Chat Server Running!');
});

// In-memory reactions
const messageReactions = new Map();
const onlineUsersPerRoom = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.onAny((event, ...args) => {
    console.log(`🚨 Received event: ${event}`, args);
  });

  socket.on('joinRoom', (roomId, user) => {
    console.log(`User ${socket.id} joined room: ${roomId}`, user);
    socket.join(roomId);
    socket.data.user = user;
    socket.data.roomId = roomId;

    if (!onlineUsersPerRoom.has(roomId)) {
      onlineUsersPerRoom.set(roomId, new Map());
    }

    const roomUsers = onlineUsersPerRoom.get(roomId);
    roomUsers.set(socket.id, user);
    io.to(roomId).emit('currentUsers', Array.from(roomUsers.values()));
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('typing', { user: data.user });
  });

  socket.on('stopTyping', (data) => {
    socket.to(data.roomId).emit('stopTyping', { user: data.user });
  });

  socket.on('chatMessage', async (data) => {
    console.log('Received message payload:', data);
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    try {
      const savedMessage = await prisma.message.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          content: data.message,
        },
      });
      console.log('✅ Message saved:', savedMessage);
    } catch (error) {
      console.error('❌ Failed to save message:', error);
    }

    io.to(data.roomId).emit('chatMessage', data);
  });

  socket.on('emojiReaction', (payload) => {
    console.log('🎉 Emoji reaction received:', payload);
    const key = `${payload.messageContent}_${payload.originalSender}`;
    if (!messageReactions.has(key)) {
      messageReactions.set(key, {});
    }
    const reactions = messageReactions.get(key);
    if (!reactions[payload.emoji]) {
      reactions[payload.emoji] = { count: 0, users: new Set() };
    }
    const reaction = reactions[payload.emoji];
    reaction.count++;
    reaction.users.add(payload.userId);

    const response = {
      ...payload,
      count: reaction.count,
      users: Array.from(reaction.users),
    };
    io.to(payload.roomId).emit('emojiReaction', response);
  });

  socket.on('leaveRoom', (roomId) => {
    console.log(`User ${socket.id} left room: ${roomId}`);
    socket.leave(roomId);
    const roomUsers = onlineUsersPerRoom.get(roomId);
    if (roomUsers) {
      roomUsers.delete(socket.id);
      io.to(roomId).emit('currentUsers', Array.from(roomUsers.values()));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const { roomId } = socket.data || {};
    if (roomId) {
      const roomUsers = onlineUsersPerRoom.get(roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        io.to(roomId).emit('currentUsers', Array.from(roomUsers.values()));
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});