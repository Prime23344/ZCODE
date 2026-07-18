import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { emitActivity } from '../index.js';

export const supportRouter = Router();

// ─── POST /api/support ────────────────────────────────────

supportRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'subject and description are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.id,
        subject,
        description,
      },
    });

    emitActivity('TICKET_CREATED', req.user!.id, null, { ticketId: ticket.id, subject });
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[Support] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/support ─────────────────────────────────────

supportRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;
    if (req.user!.role !== 'ADMIN') {
      where.userId = req.user!.id;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, phone: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({ data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Support] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/support/:id ─────────────────────────────────

supportRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, fullName: true, phone: true, email: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (ticket.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('[Support] Get one error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/support/:id/respond (ADMIN) ───────────────

supportRouter.post('/:id/respond', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { response, status } = req.body;
    if (!response) return res.status(400).json({ error: 'response is required' });

    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        adminResponse: response,
        respondedAt: new Date(),
        status: status || 'IN_PROGRESS',
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[Support] Respond error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
