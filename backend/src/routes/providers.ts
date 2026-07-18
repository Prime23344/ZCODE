import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { emitActivity } from '../index.js';
import multer from 'multer';
import path from 'path';

export const providerRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|jpg|webp)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP) or PDF files are allowed'));
    }
  },
});

// ─── GET /api/providers (Search) ──────────────────────────

providerRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where: any = { verificationStatus: 'VERIFIED' };
    if (req.query.county) where.county = req.query.county as string;
    if (req.query.minRating) where.averageRating = { gte: parseFloat(req.query.minRating as string) };
    if (req.query.category) {
      where.providerCategories = { some: { category: { slug: req.query.category as string } } };
    }

    const [providersRaw, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
          providerCategories: { include: { category: true } },
          portfolioPhotos: { take: 4 },
        },
        orderBy: { averageRating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.provider.count({ where }),
    ]);

    // Normalize: rename providerCategories → categories for frontend compatibility
    const providers = providersRaw.map(({ providerCategories, ...p }: any) => ({
      ...p,
      categories: providerCategories,
    }));

    res.json({
      data: providers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Providers] Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/providers/:id ────────────────────────────────

providerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const providerRaw = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, createdAt: true } },
        providerCategories: { include: { category: true } },
        portfolioPhotos: true,
        verificationDocuments: true,
      },
    });
    if (!providerRaw) return res.status(404).json({ error: 'Provider not found' });
    const { providerCategories, ...provider } = providerRaw as any;
    res.json({ ...provider, categories: providerCategories });
  } catch (err) {
    console.error('[Providers] Get one error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/providers/onboarding (PROVIDER) ───────────

providerRouter.post('/onboarding', authMiddleware, roleGuard('PROVIDER'), async (req: Request, res: Response) => {
  try {
    const { bio, location, county, categoryIds } = req.body;
    const provider = await prisma.provider.findUnique({ where: { userId: req.user!.id } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        bio: bio ?? provider.bio,
        location: location ?? provider.location,
        county: county ?? provider.county,
        verificationStatus: provider.verificationStatus === 'UNVERIFIED' ? 'PENDING_VERIFICATION' : provider.verificationStatus,
      },
      include: { user: true },
    });

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      // Replace categories
      await prisma.providerCategory.deleteMany({ where: { providerId: provider.id } });
      await prisma.providerCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({ providerId: provider.id, categoryId })),
      });
    }

    emitActivity('PROVIDER_ONBOARDED', req.user!.id, updated.user.fullName, {
      providerId: provider.id,
      county: updated.county,
    });

    const resultRaw = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: { user: true, providerCategories: { include: { category: true } } },
    });
    const { providerCategories: pc, ...rest } = resultRaw as any;
    res.json({ ...rest, categories: pc });
  } catch (err) {
    console.error('[Providers] Onboarding error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/providers/verification-queue (ADMIN) ───────
// Note: must come before /:id to avoid conflict

providerRouter.get('/verification/queue', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { verificationStatus: 'PENDING_VERIFICATION' };
    const [providersRaw, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          verificationDocuments: true,
          providerCategories: { include: { category: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.provider.count({ where }),
    ]);
    const providers = providersRaw.map(({ providerCategories, ...p }: any) => ({ ...p, categories: providerCategories }));
    res.json({ data: providers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Providers] Verification queue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/providers/:id/verify (ADMIN) ──────────────

providerRouter.post('/:id/verify', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { action, reason } = req.body;
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return res.status(400).json({ error: 'action must be APPROVE or REJECT' });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        verificationStatus: newStatus,
        verificationRejectionReason: action === 'REJECT' ? (reason || 'Documents not sufficient') : null,
      },
      include: { user: true },
    });

    // Mark documents reviewed
    await prisma.verificationDocument.updateMany({
      where: { providerId: provider.id, reviewedAt: null },
      data: { reviewedAt: new Date(), reviewedBy: req.user!.id },
    });

    emitActivity('PROVIDER_VERIFIED', provider.userId, provider.user.fullName, {
      providerId: provider.id,
      status: newStatus,
    });

    res.json(updated);
  } catch (err) {
    console.error('[Providers] Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/providers/:id/documents (PROVIDER) ────────

providerRouter.post('/:id/documents', authMiddleware, roleGuard('PROVIDER'), upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (provider.userId !== req.user!.id) return res.status(403).json({ error: 'Not your provider profile' });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const documentType = (req.body.documentType as string) || 'NATIONAL_ID';
    const issuingCountry = (req.body.issuingCountry as string) || 'KE';

    const created = await Promise.all(
      files.map((file) =>
        prisma.verificationDocument.create({
          data: {
            providerId: provider.id,
            documentType,
            issuingCountry,
            fileUrl: `/uploads/${file.filename}`,
          },
        })
      )
    );

    // Ensure status is PENDING
    if (provider.verificationStatus === 'UNVERIFIED') {
      await prisma.provider.update({
        where: { id: provider.id },
        data: { verificationStatus: 'PENDING_VERIFICATION' },
      });
    }

    emitActivity('PROVIDER_SUBMITTED_DOCS', req.user!.id, null, { providerId: provider.id });
    res.status(201).json(created);
  } catch (err) {
    console.error('[Providers] Document upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/providers/:id/portfolio (PROVIDER) ────────

providerRouter.post('/:id/portfolio', authMiddleware, roleGuard('PROVIDER'), upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (provider.userId !== req.user!.id) return res.status(403).json({ error: 'Not your provider profile' });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const created = await Promise.all(
      files.map((file) =>
        prisma.portfolioPhoto.create({
          data: {
            providerId: provider.id,
            fileUrl: `/uploads/${file.filename}`,
            caption: req.body.caption || '',
          },
        })
      )
    );
    res.status(201).json(created);
  } catch (err) {
    console.error('[Providers] Portfolio upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
