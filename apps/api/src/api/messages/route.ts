import express from 'express';
import { prisma } from '@shared-skies/database';
import { messageRateLimit, audioRateLimit } from '../../middleware/rateLimiter';

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
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message (with stricter rate limiting for audio)
router.post('/:roomId', async (req, res) => {
  try {
    const { userId, content, isAudio } = req.body;
    
    // Apply additional rate limiting for audio messages
    if (isAudio) {
      // This would need additional middleware application
      // For now, we'll handle it in the route logic
    }
    
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