import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { dealStatus } from '../../lib/enums';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import {
  cents,
  optionalDate,
  optionalId,
  optionalText,
  parseBody,
  requiredText,
} from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

const include = {
  stage: true,
  contact: { select: { id: true, firstName: true, lastName: true, company: true } },
} satisfies Prisma.DealInclude;

const dealSchema = z.object({
  title: requiredText(160, 'El título de la oportunidad es obligatorio'),
  description: optionalText(2000),
  contactId: optionalId,
  stageId: z.string().min(1, 'Selecciona una etapa'),
  amountCents: cents.default(0),
  currency: z.string().trim().length(3).toUpperCase().default('EUR'),
  expectedCloseDate: optionalDate,
  notes: optionalText(2000).optional(),
});

const moveSchema = z.object({
  stageId: z.string().min(1),
  position: z.coerce.number().int().min(0).default(0),
});

const closeSchema = z.object({
  status: dealStatus,
  lostReason: optionalText(500),
});

const listQuery = z.object({
  status: dealStatus.optional(),
  contactId: z.string().optional(),
  search: z.string().trim().max(120).optional(),
});

/** Valida que etapa y contacto (si viene) pertenecen al usuario. */
async function assertRelations(userId: string, stageId: string, contactId: string | null) {
  const stage = await prisma.stage.findFirst({ where: { id: stageId, userId } });
  if (!stage) throw badRequest('La etapa seleccionada no existe');
  if (contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw badRequest('El contacto seleccionado no existe');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = listQuery.parse(req.query);
    const where: Prisma.DealWhereInput = { userId };
    if (q.status) where.status = q.status;
    if (q.contactId) where.contactId = q.contactId;
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };

    const items = await prisma.deal.findMany({
      where,
      include,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
      include: {
        ...include,
        tasks: { orderBy: { dueDate: 'asc' } },
        activities: { orderBy: { occurredAt: 'desc' } },
        quotes: true,
        documents: true,
      },
    });
    if (!deal) throw notFound('Oportunidad no encontrada');
    res.json(deal);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(dealSchema, req.body);
    await assertRelations(userId, data.stageId, data.contactId ?? null);

    const count = await prisma.deal.count({ where: { userId, stageId: data.stageId } });
    const deal = await prisma.deal.create({
      data: { ...data, userId, position: count },
      include,
    });
    res.status(201).json(deal);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Oportunidad no encontrada');

    const data = parseBody(dealSchema, req.body);
    await assertRelations(userId, data.stageId, data.contactId ?? null);
    res.json(await prisma.deal.update({ where: { id: existing.id }, data, include }));
  }),
);

/** Mueve la oportunidad a otra etapa/posición (arrastrar y soltar en el Kanban). */
router.patch(
  '/:id/move',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Oportunidad no encontrada');

    const { stageId, position } = parseBody(moveSchema, req.body);
    const stage = await prisma.stage.findFirst({ where: { id: stageId, userId } });
    if (!stage) throw badRequest('La etapa seleccionada no existe');

    const siblings = await prisma.deal.findMany({
      where: { userId, stageId, status: 'OPEN', id: { not: existing.id } },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const ordered = [...siblings.map((s) => s.id)];
    ordered.splice(Math.min(position, ordered.length), 0, existing.id);

    await prisma.$transaction([
      prisma.deal.update({
        where: { id: existing.id },
        data: { stageId, status: 'OPEN', closedAt: null, lostReason: null },
      }),
      ...ordered.map((id, index) =>
        prisma.deal.update({ where: { id }, data: { position: index } }),
      ),
    ]);

    const deal = await prisma.deal.findUnique({ where: { id: existing.id }, include });
    res.json(deal);
  }),
);

/** Marca la oportunidad como ganada, perdida o la reabre. */
router.patch(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Oportunidad no encontrada');

    const { status, lostReason } = parseBody(closeSchema, req.body);
    const deal = await prisma.deal.update({
      where: { id: existing.id },
      data: {
        status,
        closedAt: status === 'OPEN' ? null : new Date(),
        lostReason: status === 'LOST' ? lostReason : null,
      },
      include,
    });

    // Al ganar una venta, el contacto asociado pasa a cliente activo.
    if (status === 'WON' && deal.contactId) {
      await prisma.contact.updateMany({
        where: { id: deal.contactId, userId, status: { in: ['LEAD'] } },
        data: { status: 'ACTIVE' },
      });
    }
    res.json(deal);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Oportunidad no encontrada');
    await prisma.deal.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
