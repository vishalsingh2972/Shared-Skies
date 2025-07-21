import express from 'express';
import { prisma } from '@shared-skies/database';
import { apiRateLimit, roomCreationRateLimit } from '../../middleware/rateLimiter';

const router = express.Router();

// Get all rooms (with API rate limiting)
router.get('/', apiRateLimit, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        users: {
          include: { user: { select: { username: true } } }
        }
      }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create a room (with stricter rate limiting)
router.post('/', roomCreationRateLimit, async (req, res) => {
  try {
    const { mood } = req.body;
    const room = await prisma.room.create({
      data: { mood }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

export default router;