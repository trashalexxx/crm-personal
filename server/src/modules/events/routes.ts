import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { eventType } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import {
  optionalDate,
  optionalId,
  optionalText,
  parseBody,
  requiredDate,
  requiredText,
} from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
} satisfies Prisma.EventInclude;

const eventSchema = z
  .object({
    title: requiredText(200, 'El título del evento es obligatorio'),
    description: optionalText(2000),
    location: optionalText(200),
    type: eventType.default('MEETING'),
    startsAt: requiredDate,
    endsAt: optionalDate,
    allDay: z.boolean().default(false),
    contactId: optionalId,
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['endsAt'],
  });

const listQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  contactId: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = listQuery.parse(req.query);
    const where: Prisma.EventWhereInput = { userId };
    if (q.from || q.to) {
      where.startsAt = {};
      if (q.from) where.startsAt.gte = q.from;
      if (q.to) where.startsAt.lte = q.to;
    }
    if (q.contactId) where.contactId = q.contactId;

    const items = await prisma.event.findMany({ where, include, orderBy: { startsAt: 'asc' } });
    res.json({ items });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(eventSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.status(201).json(await prisma.event.create({ data: { ...data, userId }, include }));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Evento no encontrado');

    const data = parseBody(eventSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.json(await prisma.event.update({ where: { id: existing.id }, data, include }));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Evento no encontrado');
    await prisma.event.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
