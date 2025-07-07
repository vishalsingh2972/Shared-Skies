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
    methods: ['GET', 'POST']
  }
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('Socket.IO Chat Server Running!');
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    console.log(`User ${socket.id} joined room: ${roomId}`);
    socket.join(roomId);
  });

  socket.on('chatMessage', async (data) => {
    console.log('Received message payload from client:', data);

    // Add server timestamp if not present (fallback)
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    // Save message to DB
    try {
      const savedMessage = await prisma.message.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          content: data.message,
        },
      });
      console.log('✅ Message saved to DB:', savedMessage);
    } catch (error) {
      console.error('❌ Failed to save message:', error);
    }

    // Broadcast after saving
    io.to(data.roomId).emit('chatMessage', data);
  });

  socket.on('leaveRoom', (roomId) => {
    console.log(`User ${socket.id} left room: ${roomId}`);
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});