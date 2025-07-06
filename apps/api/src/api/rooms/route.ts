import express from 'express';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const router = express.Router();

const roomSchema = z.object({
  mood: z.string().min(1).max(50)
});

router.get('/', async (req, res): Promise<void> => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mood: true,
        createdAt: true,
        users: {
          select: { id: true, username: true },
          take: 4
        }
      }
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    const validatedData = roomSchema.parse(req.body);

    const room = await prisma.room.create({
      data: {
        mood: validatedData.mood
      },
      include: {
        users: {
          select: { id: true, username: true }
        }
      }
    });

    res.status(201).json(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

export default router;