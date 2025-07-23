import express from 'express';
import { prisma } from '@shared-skies/database';
import { messageRateLimit } from '../../middleware/rateLimiter';

const router = express.Router();

// Apply rate limiting to message routes
router.use(messageRateLimit);

// Get messages for a room
router.get('/:roomId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: req.params.roomId },
      include: { user: { select: { username: true, photo: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/:roomId', async (req, res) => {
  try {
    const { userId, content, isAudio } = req.body;

    const message = await prisma.message.create({
      data: {
        roomId: req.params.roomId,
        userClerkId: userId, // updated to match new schema
        content
      },
      include: {
        user: { select: { username: true, photo: true } }
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;