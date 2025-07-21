import express from 'express';
import { prisma } from '@shared-skies/database';
import { userSyncRateLimit } from '../../middleware/rateLimiter';

const router = express.Router();

// Get or create user from Clerk (with rate limiting)
router.post('/sync', userSyncRateLimit, async (req, res) => {
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