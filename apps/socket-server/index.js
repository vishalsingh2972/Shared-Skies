require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { prisma } = require('@shared-skies/database');
const { rateLimiters, checkRateLimit } = require('@shared-skies/cache');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB for audio files
});

app.use(cors());

// Helper function to get socket IP
const getSocketIP = (socket) => {
  return socket.handshake.address || socket.conn.remoteAddress || 'unknown';
};

// Rate limiting wrapper for socket events
const withRateLimit = async (socket, rateLimiter, callback) => {
  try {
    const clientIP = getSocketIP(socket);
    const result = await checkRateLimit(rateLimiter, clientIP);
    
    if (!result.success) {
      socket.emit('rateLimitError', {
        error: 'Rate limit exceeded',
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      });
      return;
    }
    
    await callback();
  } catch (error) {
    console.error('Rate limit error:', error);
    socket.emit('error', 'Rate limiting failed');
  }
};

app.get('/', (req, res) => {
  res.send('Socket.IO Chat Server Running!');
});

// In-memory reactions and users
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

  // Rate limited chat message
  socket.on('chatMessage', async (data) => {
    await withRateLimit(socket, rateLimiters.messages, async () => {
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
  });

  socket.on('emojiReaction', (payload) => {
    // Emoji reactions can use the same rate limit as messages
    withRateLimit(socket, rateLimiters.messages, async () => {
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
  });

  // Rate limited audio message (more restrictive)
  socket.on('audioMessage', async (payload) => {
    await withRateLimit(socket, rateLimiters.audio, async () => {
      console.log('🎙️ Audio message received:', payload);

      try {
        if (payload.userId && payload.roomId) {
          await prisma.message.create({
            data: {
              roomId: payload.roomId,
              userId: payload.userId,
              content: '[Audio Message]',
            },
          });
        }
      } catch (error) {
        console.error('❌ Failed to save audio message:', error);
      }

      io.to(payload.roomId).emit('audioMessage', payload);
    });
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

// Cleanup functions remain the same
async function deleteOldMessages() {
  console.log('🧹 Deleting messages older than 24 hours...');
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    console.log(`✅ Cleanup done: Deleted ${deleted.count} old messages. Cutoff: ${cutoffDate}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

deleteOldMessages();
cron.schedule('0 * * * *', deleteOldMessages);