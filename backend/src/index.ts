import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

import { prisma } from './db.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { categoryRouter } from './routes/categories.js';
import { providerRouter } from './routes/providers.js';
import { bookingRouter } from './routes/bookings.js';
import { paymentRouter } from './routes/payments.js';
import { reviewRouter } from './routes/reviews.js';
import { disputeRouter } from './routes/disputes.js';
import { supportRouter } from './routes/support.js';
import { adminRouter } from './routes/admin.js';
import { uploadRouter } from './routes/uploads.js';

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Middleware ────────────────────────────────────────────

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploads statically
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ─── Routes ────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/providers', providerRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/disputes', disputeRouter);
app.use('/api/support', supportRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── WebSocket (Socket.IO) ────────────────────────────────

export const io = new SocketIOServer(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });

  // Admin subscribes to activity feed
  socket.on('subscribe:admin', () => {
    socket.join('admin:feed');
  });
});

// Exported helper to emit events
export function emitActivity(type: string, actorId: string | null, actorName: string | null, metadata: Record<string, unknown>) {
  const entry = {
    type,
    actorId,
    actorName,
    metadata,
    timestamp: new Date().toISOString(),
  };
  io.to('admin:feed').emit('activity', entry);

  // Also persist to DB
  prisma.activityLog.create({
    data: {
      type,
      actorId,
      actorName,
      metadata: JSON.stringify(metadata),
    },
  }).catch(() => {
    // Non-critical — don't block the main flow
  });
}

// ─── Start Server ─────────────────────────────────────────

async function main() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected');

    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

main();
