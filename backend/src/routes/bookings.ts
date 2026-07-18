import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitActivity } from '../index.js';

export const bookingRouter = Router();

// ─── POST /api/bookings ───────────────────────────────────

bookingRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { providerId, categoryId, description, location, county, scheduledAt } = req.body;

    if (!providerId || !categoryId || !description) {
      return res.status(400).json({ error: 'providerId, categoryId, and description are required' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (provider.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ error: 'Provider is not verified' });
    }
    if (provider.userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot book yourself' });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user!.id,
        providerId,
        categoryId,
        description,
        location: location || '',
        county: county || provider.county || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'REQUESTED',
        countryCode: provider.countryCode,
        quoteCurrency: 'KES',
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        provider: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
        category: true,
      },
    });

    emitActivity('BOOKING_CREATED', req.user!.id, booking.customer.fullName, {
      bookingId: booking.id,
      providerId,
      categoryId,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error('[Bookings] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/bookings ────────────────────────────────────

bookingRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

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

    res.json({ data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Bookings] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/bookings/:id ────────────────────────────────

bookingRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        provider: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
        category: true,
        messages: { include: { sender: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
        payments: true,
        reviews: true,
        disputes: { include: { evidence: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Authorization: customer, provider, or admin
    const isCustomer = booking.customerId === req.user!.id;
    const isProvider = booking.provider.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (err) {
    console.error('[Bookings] Get one error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/quote (PROVIDER) ─────────────

bookingRouter.post('/:id/quote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { amount, duration, currency } = req.body;
    if (amount === undefined || duration === undefined) {
      return res.status(400).json({ error: 'amount and duration are required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true, customer: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the assigned provider can quote' });
    }
    if (booking.status !== 'REQUESTED') {
      return res.status(400).json({ error: `Cannot quote a booking in status ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'QUOTED',
        quoteAmount: Math.round(amount),
        quoteDuration: duration,
        quoteCurrency: currency || booking.quoteCurrency || 'KES',
        quotedAt: new Date(),
      },
      include: { provider: { include: { user: true } } },
    });

    emitActivity('BOOKING_QUOTED', req.user!.id, updated.provider.user.fullName, {
      bookingId: booking.id,
      amount,
    });

    res.json(updated);
  } catch (err) {
    console.error('[Bookings] Quote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/accept-quote (CUSTOMER) ──────

bookingRouter.post('/:id/accept-quote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the customer can accept the quote' });
    }
    if (booking.status !== 'QUOTED') {
      return res.status(400).json({ error: `Cannot accept a quote in status ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'ACCEPTED' },
    });

    emitActivity('BOOKING_ACCEPTED', req.user!.id, null, { bookingId: booking.id });
    res.json(updated);
  } catch (err) {
    console.error('[Bookings] Accept quote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/start (PROVIDER) ─────────────

bookingRouter.post('/:id/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the provider can start the job' });
    }
    if (booking.status !== 'ACCEPTED') {
      return res.status(400).json({ error: `Cannot start a booking in status ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'IN_PROGRESS' },
    });
    emitActivity('BOOKING_STARTED', req.user!.id, null, { bookingId: booking.id });
    res.json(updated);
  } catch (err) {
    console.error('[Bookings] Start error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/complete (PROVIDER) ──────────

bookingRouter.post('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the provider can complete the job' });
    }
    if (booking.status !== 'IN_PROGRESS' && booking.status !== 'ACCEPTED') {
      return res.status(400).json({ error: `Cannot complete a booking in status ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    emitActivity('BOOKING_COMPLETED', req.user!.id, null, { bookingId: booking.id });
    res.json(updated);
  } catch (err) {
    console.error('[Bookings] Complete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/cancel ───────────────────────

bookingRouter.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isCustomer = booking.customerId === req.user!.id;
    const isProvider = booking.provider.userId === req.user!.id;
    if (!isCustomer && !isProvider && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!['REQUESTED', 'QUOTED', 'ACCEPTED'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking in status ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: req.user!.id,
        cancelReason: reason || null,
      },
    });
    emitActivity('BOOKING_CANCELLED', req.user!.id, null, { bookingId: booking.id, reason });
    res.json(updated);
  } catch (err) {
    console.error('[Bookings] Cancel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/bookings/:id/messages ─────────────────────

bookingRouter.post('/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isCustomer = booking.customerId === req.user!.id;
    const isProvider = booking.provider.userId === req.user!.id;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: 'Not authorized to message in this booking' });
    }

    const message = await prisma.bookingMessage.create({
      data: {
        bookingId: booking.id,
        senderId: req.user!.id,
        content,
      },
      include: { sender: { select: { id: true, fullName: true } } },
    });
    res.status(201).json(message);
  } catch (err) {
    console.error('[Bookings] Message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/bookings/:id/messages ──────────────────────

bookingRouter.get('/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isCustomer = booking.customerId === req.user!.id;
    const isProvider = booking.provider.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await prisma.bookingMessage.findMany({
      where: { bookingId: booking.id },
      include: { sender: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error('[Bookings] Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
