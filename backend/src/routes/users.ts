import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const userRouter = Router();

// ─── GET /api/users/me ─────────────────────────────────────

userRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { provider: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[Users] Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/me/bookings ────────────────────────────

userRouter.get('/me/bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { customerId: req.user!.id },
        { provider: { userId: req.user!.id } },
      ],
    };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          provider: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
          category: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Users] Get bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/users/me ─────────────────────────────────────

userRouter.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fullName, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(email !== undefined ? { email } : {}),
      },
      include: { provider: true },
    });
    res.json(user);
  } catch (err) {
    console.error('[Users] Update me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────

userRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        countryCode: true,
        createdAt: true,
        provider: {
          select: {
            id: true,
            bio: true,
            location: true,
            county: true,
            averageRating: true,
            ratingCount: true,
            verificationStatus: true,
            providerCategories: { include: { category: true } },
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[Users] Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
