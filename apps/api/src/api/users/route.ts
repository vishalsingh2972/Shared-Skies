import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

// Get or create user from Clerk
router.post('/sync', async (req, res) => {
  try {
    const { clerkId, username, email } = req.body;
    
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { username, email },
      create: { clerkId, username, email }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;