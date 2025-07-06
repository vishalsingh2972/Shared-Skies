import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

// Get all rooms
router.get('/', async (req, res) => {
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

// Create a room
router.post('/', async (req, res) => {
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