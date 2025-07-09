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

// Add this to track emoji reactions in memory
const messageReactions = new Map(); // messageId -> { emoji -> { count, users: Set } }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.onAny((event, ...args) => {
    console.log(`🚨 Received event: ${event}`, args);
  });

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

  socket.on('emojiReaction', (reactionPayload) => {
    console.log('🎉 Received emoji reaction:', reactionPayload);

    // Create a unique key for the message
    const messageKey = `${reactionPayload.messageContent}_${reactionPayload.originalSender}`;

    // Initialize reactions for this message if not exists
    if (!messageReactions.has(messageKey)) {
      messageReactions.set(messageKey, {});
    }

    const reactions = messageReactions.get(messageKey);

    // Initialize this emoji if not exists
    if (!reactions[reactionPayload.emoji]) {
      reactions[reactionPayload.emoji] = {
        count: 0,
        users: new Set()
      };
    }

    const emojiData = reactions[reactionPayload.emoji];
    const userId = reactionPayload.userId || reactionPayload.sender;

    // Always increment count when user clicks ~ not working need to check
    emojiData.count++;
    emojiData.users.add(userId);

    // Prepare response payload
    const responsePayload = {
      ...reactionPayload,
      count: emojiData.count,
      users: Array.from(emojiData.users)
    };

    // Broadcast the reaction with count
    io.to(reactionPayload.roomId).emit('emojiReaction', responsePayload);
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