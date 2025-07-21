import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import roomRoutes from './api/rooms/route';
import userRoutes from './api/users/route';
import messageRoutes from './api/messages/route';
import { prisma } from '@shared-skies/database';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

io.on('connection', (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);

  // Join Room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Send Message
  socket.on('send_message', async (data) => {
    const { roomId, userId, content } = data;

    try {
      // Save message to DB
      const message = await prisma.message.create({
        data: { roomId, userId, content },
        include: { user: { select: { username: true } } },
      });

      // Broadcast message to everyone in the room
      io.to(roomId).emit('receive_message', message);
      console.log('Message sent to room:', roomId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔥 Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});