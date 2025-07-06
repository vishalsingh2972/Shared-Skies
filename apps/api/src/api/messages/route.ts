import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

// Get messages for a room
router.get('/:roomId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: req.params.roomId },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/:roomId', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const message = await prisma.message.create({
      data: {
        roomId: req.params.roomId,
        userId,
        content
      }
    });
    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;