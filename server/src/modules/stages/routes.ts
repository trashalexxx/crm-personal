import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

const stageSchema = z.object({
  name: requiredText(60, 'El nombre de la etapa es obligatorio'),
  probability: z.coerce.number().int().min(0).max(100).default(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal no válido').default('#6366f1'),
  position: z.coerce.number().int().min(0).optional(),
});

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const stages = await prisma.stage.findMany({
      where: { userId: (req as AuthRequest).userId },
      orderBy: { position: 'asc' },
      include: { _count: { select: { deals: true } } },
    });
    res.json({ items: stages });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(stageSchema, req.body);
    const count = await prisma.stage.count({ where: { userId } });
    const stage = await prisma.stage.create({
      data: { ...data, position: data.position ?? count, userId },
    });
    res.status(201).json(stage);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.stage.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Etapa no encontrada');
    const data = parseBody(stageSchema, req.body);
    res.json(await prisma.stage.update({ where: { id: existing.id }, data }));
  }),
);

router.post(
  '/reorder',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const { ids } = parseBody(reorderSchema, req.body);
    const owned = await prisma.stage.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) throw badRequest('Alguna etapa no pertenece a tu cuenta');

    await prisma.$transaction(
      ids.map((id, position) => prisma.stage.update({ where: { id }, data: { position } })),
    );
    res.status(204).end();
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.stage.findFirst({
      where: { id: req.params.id, userId },
      include: { _count: { select: { deals: true } } },
    });
    if (!existing) throw notFound('Etapa no encontrada');
    if (existing._count.deals > 0) {
      throw badRequest(
        `No puedes eliminar la etapa: tiene ${existing._count.deals} oportunidad(es). Muévelas antes.`,
      );
    }
    const remaining = await prisma.stage.count({ where: { userId } });
    if (remaining <= 1) throw badRequest('Debe quedar al menos una etapa en el pipeline');

    await prisma.stage.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
