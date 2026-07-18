import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getPaymentProvider } from '../utils/payments.js';
import { emitActivity } from '../index.js';

export const paymentRouter = Router();

const DEFAULT_COMMISSION = parseFloat(process.env.DEFAULT_COMMISSION_RATE || '0.10');

// ─── POST /api/payments/initiate (CUSTOMER) ───────────────

paymentRouter.post('/initiate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, provider: { include: { user: true } }, payments: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the customer can pay' });
    }
    if (!['ACCEPTED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot pay for a booking in status ${booking.status}` });
    }
    if (!booking.quoteAmount) {
      return res.status(400).json({ error: 'Booking has no quote amount' });
    }

    // Check no existing successful payment
    const existingPaid = booking.payments.find((p) => ['ESCROW', 'RELEASED'].includes(p.status));
    if (existingPaid) return res.status(400).json({ error: 'Payment already initiated for this booking' });

    const commissionAmount = Math.round(booking.quoteAmount * booking.commissionRate);
    const providerPayoutAmount = booking.quoteAmount - commissionAmount;

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.quoteAmount,
        currencyCode: booking.quoteCurrency,
        status: 'PENDING',
        commissionAmount,
        providerPayoutAmount,
      },
    });

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      phoneNumber: booking.customer.phone,
      amount: booking.quoteAmount,
      currencyCode: booking.quoteCurrency,
      bookingId: booking.id,
      description: `Payment for booking ${booking.id}`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: result.externalRef, status: 'ESCROW' },
    });

    // In sandbox mode, auto-confirm after a short delay
    if (process.env.MPESA_ENV === 'sandbox') {
      setTimeout(async () => {
        try {
          const confirmed = await provider.confirmPayment(result.externalRef);
          if (confirmed.success) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'ESCROW' },
            });
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'PAID' },
            });
            emitActivity('PAYMENT_RECEIVED', booking.customerId, booking.customer.fullName, {
              bookingId: booking.id,
              amount: booking.quoteAmount,
            });
            console.log(`[Payments] Auto-confirmed payment for booking ${booking.id}`);
          }
        } catch (e) {
          console.error('[Payments] Auto-confirm error:', e);
        }
      }, 2000);
    }

    res.json({ payment, externalRef: result.externalRef, message: result.message });
  } catch (err: any) {
    console.error('[Payments] Initiate error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── POST /api/payments/confirm/:bookingId ────────────────

paymentRouter.post('/confirm/:bookingId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { payments: true, customer: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const payment = booking.payments.find((p) => p.status === 'PENDING' || p.status === 'ESCROW');
    if (!payment) return res.status(400).json({ error: 'No pending payment for this booking' });

    if (!payment.externalRef) {
      return res.status(400).json({ error: 'Payment has no external reference' });
    }

    const provider = getPaymentProvider();
    const confirmed = await provider.confirmPayment(payment.externalRef);

    if (confirmed.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'ESCROW' },
      });
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PAID' },
      });
      emitActivity('PAYMENT_RECEIVED', booking.customerId, booking.customer.fullName, {
        bookingId: booking.id,
        amount: payment.amount,
      });
    }

    res.json({ confirmed, booking: await prisma.booking.findUnique({ where: { id: booking.id } }) });
  } catch (err) {
    console.error('[Payments] Confirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/payments/payout/:bookingId (PROVIDER) ─────

paymentRouter.post('/payout/:bookingId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { provider: { include: { user: true } }, payments: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the provider can request payout' });
    }
    if (!['PAID', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot payout a booking in status ${booking.status}` });
    }

    const payment = booking.payments.find((p) => p.status === 'ESCROW');
    if (!payment) return res.status(400).json({ error: 'No escrow payment to release' });

    const provider = getPaymentProvider();
    const payoutResult = await provider.payout({
      phoneNumber: booking.provider.user.phone,
      amount: payment.providerPayoutAmount,
      currencyCode: payment.currencyCode,
      bookingId: booking.id,
      description: `Payout for booking ${booking.id}`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'RELEASED' },
    });

    emitActivity('PAYOUT_SENT', booking.provider.userId, booking.provider.user.fullName, {
      bookingId: booking.id,
      amount: payment.providerPayoutAmount,
    });

    res.json({ payment: await prisma.payment.findUnique({ where: { id: payment.id } }), payoutResult });
  } catch (err: any) {
    console.error('[Payments] Payout error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── GET /api/payments/history ────────────────────────────

paymentRouter.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      booking: {
        OR: [
          { customerId: req.user!.id },
          { provider: { userId: req.user!.id } },
        ],
      },
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              description: true,
              customer: { select: { id: true, fullName: true } },
              provider: { include: { user: { select: { id: true, fullName: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ data: payments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Payments] History error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/payments/mpesa-callback (Webhook) ─────────

paymentRouter.post('/mpesa-callback', async (req: Request, res: Response) => {
  try {
    // M-Pesa callback handler — in sandbox this is logged but not called
    console.log('[M-Pesa Callback]', JSON.stringify(req.body));
    res.json({ result: 'success' });
  } catch (err) {
    console.error('[Payments] Callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
