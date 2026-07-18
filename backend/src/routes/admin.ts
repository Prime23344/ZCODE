import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

export const adminRouter = Router();

// Helper: date N days ago at start of day
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── GET /api/admin/kpis ──────────────────────────────────

adminRouter.get('/kpis', authMiddleware, roleGuard('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const today = startOfToday();
    const d7 = daysAgo(7);
    const d30 = daysAgo(30);

    const [
      totalUsers, totalCustomers, totalProviders,
      newSignupsToday, newSignups7d, newSignups30d,
      pendingVerification,
      bookings, bookingsTodayCount, bookings30dCount,
      completedBookings30d,
      reviewVolume30d, allReviews,
      openDisputes, openTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      prisma.provider.count({ where: { verificationStatus: 'PENDING_VERIFICATION' } }),
      prisma.booking.groupBy({ by: ['status'], _count: true }),
      prisma.booking.count({ where: { createdAt: { gte: today } } }),
      prisma.booking.count({ where: { createdAt: { gte: d30 } } }),
      prisma.booking.findMany({
        where: { status: { in: ['COMPLETED', 'PAID', 'REVIEWED'] }, completedAt: { gte: d30 } },
        select: { quoteAmount: true, commissionRate: true },
      }),
      prisma.review.count({ where: { createdAt: { gte: d30 } } }),
      prisma.review.findMany({ select: { rating: true } }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    const bookingsByStatus: Record<string, number> = {};
    bookings.forEach((b) => { bookingsByStatus[b.status] = b._count; });

    const grossBookingValue30d = completedBookings30d.reduce((sum, b) => sum + (b.quoteAmount || 0), 0);
    const platformCommission30d = completedBookings30d.reduce(
      (sum, b) => sum + Math.round((b.quoteAmount || 0) * b.commissionRate),
      0
    );
    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    res.json({
      totalUsers,
      totalCustomers,
      totalProviders,
      newSignupsToday,
      newSignups7d,
      newSignups30d,
      pendingVerification,
      bookingsByStatus,
      bookingsToday: bookingsTodayCount,
      bookings30d: bookings30dCount,
      grossBookingValue30d,
      platformCommission30d,
      averageRating: Math.round(averageRating * 100) / 100,
      reviewVolume30d,
      openDisputes,
      openTickets,
    });
  } catch (err) {
    console.error('[Admin] KPIs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/bookings-chart ────────────────────────

adminRouter.get('/bookings-chart', authMiddleware, roleGuard('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const days = 30;
    const start = daysAgo(days);
    const bookings = await prisma.booking.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    bookings.forEach((b) => {
      const key = b.createdAt.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });

    const data = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    res.json(data);
  } catch (err) {
    console.error('[Admin] Bookings chart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/revenue-chart ─────────────────────────

adminRouter.get('/revenue-chart', authMiddleware, roleGuard('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const days = 30;
    const start = daysAgo(days);
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start }, status: { in: ['ESCROW', 'RELEASED', 'PARTIAL'] } },
      select: { amount: true, createdAt: true },
    });

    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    payments.forEach((p) => {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + p.amount);
    });

    const data = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    res.json(data);
  } catch (err) {
    console.error('[Admin] Revenue chart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/category-chart ────────────────────────

adminRouter.get('/category-chart', authMiddleware, roleGuard('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      select: {
        name: true,
        _count: { select: { bookings: true } },
      },
    });

    const data = categories
      .map((c) => ({ category: c.name, value: c._count.bookings }))
      .sort((a, b) => b.value - a.value);

    res.json(data);
  } catch (err) {
    console.error('[Admin] Category chart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/activity ──────────────────────────────

adminRouter.get('/activity', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count(),
    ]);

    const data = entries.map((e) => ({
      ...e,
      metadata: (() => { try { return JSON.parse(e.metadata); } catch { return {}; } })(),
    }));

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error('[Admin] Activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────

adminRouter.get('/users', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const role = req.query.role as string;
    const search = req.query.search as string;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          provider: { select: { id: true, verificationStatus: true, averageRating: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Admin] Users list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
