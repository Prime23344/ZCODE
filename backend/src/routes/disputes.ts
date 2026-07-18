import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { emitActivity } from '../index.js';
import multer from 'multer';
import path from 'path';

export const disputeRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|jpg|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// ─── POST /api/disputes ───────────────────────────────────

disputeRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId, reason } = req.body;
    if (!bookingId || !reason) return res.status(400).json({ error: 'bookingId and reason are required' });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isCustomer = booking.customerId === req.user!.id;
    const isProvider = booking.provider.userId === req.user!.id;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: 'Not authorized to dispute this booking' });
    }
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'PAID'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot dispute a booking in status ${booking.status}` });
    }

    const existing = await prisma.dispute.findUnique({ where: { bookingId } });
    if (existing) return res.status(400).json({ error: 'Dispute already exists for this booking' });

    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        openedById: req.user!.id,
        reason,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'DISPUTED' },
    });

    emitActivity('DISPUTE_OPENED', req.user!.id, null, {
      disputeId: dispute.id,
      bookingId,
    });

    res.status(201).json(dispute);
  } catch (err) {
    console.error('[Disputes] Open error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/disputes ────────────────────────────────────

disputeRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;
    if (req.user!.role !== 'ADMIN') {
      where.booking = {
        OR: [
          { customerId: req.user!.id },
          { provider: { userId: req.user!.id } },
        ],
      };
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          openedBy: { select: { id: true, fullName: true } },
          booking: {
            select: {
              id: true,
              description: true,
              customer: { select: { id: true, fullName: true } },
              provider: { include: { user: { select: { id: true, fullName: true } } } },
            },
          },
          evidence: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({ data: disputes, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Disputes] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/disputes/queue (ADMIN) ─────────────────────

disputeRouter.get('/queue', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const where = { status: { in: ['OPEN', 'IN_PROGRESS'] } };
    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        openedBy: { select: { id: true, fullName: true } },
        booking: {
          include: {
            customer: { select: { id: true, fullName: true, phone: true } },
            provider: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
            category: true,
          },
        },
        evidence: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: disputes, total: disputes.length });
  } catch (err) {
    console.error('[Disputes] Queue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/disputes/:id ────────────────────────────────

disputeRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        openedBy: { select: { id: true, fullName: true } },
        booking: {
          include: {
            customer: { select: { id: true, fullName: true, phone: true } },
            provider: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
            category: true,
            messages: { include: { sender: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
            payments: true,
          },
        },
        evidence: true,
      },
    });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    // Authorization
    const isParty =
      dispute.booking.customer.id === req.user!.id ||
      dispute.booking.provider.user.id === req.user!.id;
    if (!isParty && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(dispute);
  } catch (err) {
    console.error('[Disputes] Get one error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/disputes/:id/evidence ─────────────────────

disputeRouter.post('/:id/evidence', authMiddleware, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { booking: { include: { provider: true } } },
    });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    const isParty =
      dispute.booking.customerId === req.user!.id ||
      dispute.booking.provider.userId === req.user!.id;
    if (!isParty) return res.status(403).json({ error: 'Not authorized' });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const created = await Promise.all(
      files.map((file) =>
        prisma.disputeEvidence.create({
          data: {
            disputeId: dispute.id,
            fileUrl: `/uploads/${file.filename}`,
            uploadedBy: req.user!.id,
          },
        })
      )
    );
    res.status(201).json(created);
  } catch (err) {
    console.error('[Disputes] Evidence error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/disputes/:id/resolve (ADMIN) ──────────────

disputeRouter.post('/:id/resolve', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { resolutionType, adminNotes, partialAmount } = req.body;
    if (!resolutionType) return res.status(400).json({ error: 'resolutionType is required' });
    if (!['REFUND_CUSTOMER', 'RELEASE_PAYMENT', 'PARTIAL_SPLIT', 'MORE_INFO'].includes(resolutionType)) {
      return res.status(400).json({ error: 'Invalid resolutionType' });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { booking: { include: { payments: true } } },
    });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.status === 'RESOLVED') return res.status(400).json({ error: 'Dispute already resolved' });

    // Handle payment consequences
    const payment = dispute.booking.payments.find((p) => ['ESCROW', 'PENDING'].includes(p.status));
    if (payment) {
      if (resolutionType === 'REFUND_CUSTOMER') {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      } else if (resolutionType === 'RELEASE_PAYMENT') {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'RELEASED' } });
      } else if (resolutionType === 'PARTIAL_SPLIT' && partialAmount) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PARTIAL',
            providerPayoutAmount: payment.providerPayoutAmount - partialAmount,
          },
        });
      }
    }

    // Set booking status based on resolution
    let newBookingStatus = dispute.booking.status;
    if (resolutionType === 'MORE_INFO') {
      // Keep disputed, set to IN_PROGRESS for admin tracking
    } else if (dispute.booking.completedAt) {
      newBookingStatus = 'COMPLETED';
    } else {
      newBookingStatus = 'CANCELLED';
    }

    await prisma.booking.update({
      where: { id: dispute.bookingId },
      data: { status: newBookingStatus },
    });

    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: resolutionType === 'MORE_INFO' ? 'IN_PROGRESS' : 'RESOLVED',
        resolutionType,
        adminNotes: adminNotes || null,
        resolvedAt: resolutionType === 'MORE_INFO' ? null : new Date(),
      },
    });

    emitActivity('DISPUTE_RESOLVED', req.user!.id, null, {
      disputeId: dispute.id,
      resolutionType,
    });

    res.json(updated);
  } catch (err) {
    console.error('[Disputes] Resolve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
