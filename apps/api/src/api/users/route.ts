import express from 'express';
import { prisma } from '@shared-skies/database';

const router = express.Router();

// Get or create user from Clerk
router.post('/sync', async (req, res) => {
  try {
    const { clerkId, username, email, photo } = req.body;

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { username, email, photo },
      create: { clerkId, username, email, photo }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;