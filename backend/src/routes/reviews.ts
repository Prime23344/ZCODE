import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitActivity } from '../index.js';

export const reviewRouter = Router();

// ─── POST /api/reviews (CUSTOMER) ─────────────────────────

reviewRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId, rating, text } = req.body;
    if (!bookingId || !rating) return res.status(400).json({ error: 'bookingId and rating are required' });

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the customer can review' });
    }
    if (booking.status !== 'PAID' && booking.status !== 'REVIEWED') {
      return res.status(400).json({ error: 'Booking must be paid before reviewing' });
    }

    const existing = await prisma.review.findUnique({ where: { bookingId } });
    if (existing) return res.status(400).json({ error: 'Review already exists for this booking' });

    const review = await prisma.review.create({
      data: {
        bookingId,
        customerId: booking.customerId,
        providerId: booking.providerId,
        rating: numRating,
        text: text || '',
      },
    });

    // Change booking status to REVIEWED
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'REVIEWED' },
    });

    // Recalculate provider's average rating
    const allReviews = await prisma.review.findMany({
      where: { providerId: booking.providerId },
      select: { rating: true },
    });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        averageRating: Math.round(avg * 100) / 100,
        ratingCount: allReviews.length,
      },
    });

    emitActivity('REVIEW_POSTED', req.user!.id, null, {
      providerId: booking.providerId,
      rating: numRating,
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('[Reviews] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/reviews/provider/:providerId ───────────────

reviewRouter.get('/provider/:providerId', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where = { providerId: req.params.providerId };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { customer: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ data: reviews, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Reviews] List by provider error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/reviews/:id/response (PROVIDER) ──────────

reviewRouter.post('/:id/response', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ error: 'response is required' });

    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.provider.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the reviewed provider can respond' });
    }
    if (review.providerResponse) {
      return res.status(400).json({ error: 'Response already submitted' });
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { providerResponse: response, respondedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('[Reviews] Response error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
