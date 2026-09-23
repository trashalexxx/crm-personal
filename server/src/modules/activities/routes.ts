import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { activityType } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import { optionalDate, optionalId, optionalText, parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  contact: { select: { id: true, firstName: true, lastName: true, company: true } },
  deal: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.ActivityInclude;

const activitySchema = z.object({
  type: activityType.default('NOTE'),
  subject: requiredText(200, 'El asunto es obligatorio'),
  content: optionalText(5000),
  occurredAt: optionalDate,
  durationMin: z.coerce.number().int().min(0).max(24 * 60).nullable().optional(),
  contactId: optionalId,
  dealId: optionalId,
  projectId: optionalId,
});

const listQuery = z.object({
  type: activityType.optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(500).default(100),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = listQuery.parse(req.query);
    const where: Prisma.ActivityWhereInput = { userId };
    if (q.type) where.type = q.type;
    if (q.contactId) where.contactId = q.contactId;
    if (q.dealId) where.dealId = q.dealId;
    if (q.projectId) where.projectId = q.projectId;

    const items = await prisma.activity.findMany({
      where,
      include,
      orderBy: { occurredAt: 'desc' },
      take: q.take,
    });
    res.json({ items });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(activitySchema, req.body);
    await assertOwnedRelations(userId, data);
    const activity = await prisma.activity.create({
      data: { ...data, occurredAt: data.occurredAt ?? new Date(), userId },
      include,
    });
    res.status(201).json(activity);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.activity.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Interacción no encontrada');

    const data = parseBody(activitySchema, req.body);
    await assertOwnedRelations(userId, data);
    const activity = await prisma.activity.update({
      where: { id: existing.id },
      data: { ...data, occurredAt: data.occurredAt ?? existing.occurredAt },
      include,
    });
    res.json(activity);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.activity.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Interacción no encontrada');
    await prisma.activity.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
