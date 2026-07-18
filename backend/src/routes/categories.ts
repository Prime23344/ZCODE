import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

export const categoryRouter = Router();

// ─── GET /api/categories ──────────────────────────────────

categoryRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const countryCode = (_req.query.countryCode as string) || 'KE';
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true, countryCode },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    console.error('[Categories] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/categories (ADMIN) ─────────────────────────

categoryRouter.post('/', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, countryCode } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }
    const existing = await prisma.serviceCategory.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Category with this slug already exists' });

    const category = await prisma.serviceCategory.create({
      data: { name, slug, description: description || '', icon: icon || '🔧', countryCode: countryCode || 'KE' },
    });
    res.status(201).json(category);
  } catch (err) {
    console.error('[Categories] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/categories/:id (ADMIN) ─────────────────────

categoryRouter.put('/:id', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, isActive } = req.body;
    const category = await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    res.json(category);
  } catch (err) {
    console.error('[Categories] Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/categories/:id (ADMIN — soft delete) ────

categoryRouter.delete('/:id', authMiddleware, roleGuard('ADMIN'), async (req: Request, res: Response) => {
  try {
    const category = await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Category deactivated', category });
  } catch (err) {
    console.error('[Categories] Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
