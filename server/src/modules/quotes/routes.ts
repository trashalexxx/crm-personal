import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { quoteStatus } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
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
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  items: { orderBy: { position: 'asc' } },
  contact: { select: { id: true, firstName: true, lastName: true, company: true } },
  deal: { select: { id: true, title: true } },
} satisfies Prisma.QuoteInclude;

const itemSchema = z.object({
  description: requiredText(300, 'Describe el concepto'),
  quantity: z.coerce.number().min(0).max(100000).default(1),
  unitPriceCents: cents.default(0),
});

const quoteSchema = z.object({
  number: requiredText(40, 'El número de presupuesto es obligatorio'),
  title: requiredText(200, 'El título es obligatorio'),
  notes: optionalText(4000),
  status: quoteStatus.default('DRAFT'),
  currency: z.string().trim().length(3).toUpperCase().default('EUR'),
  taxPercent: z.coerce.number().int().min(0).max(100).default(0),
  contactId: optionalId,
  dealId: optionalId,
  issueDate: optionalDate,
  validUntil: optionalDate,
  items: z.array(itemSchema).max(100).default([]),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = z
      .object({ status: quoteStatus.optional(), contactId: z.string().optional() })
      .parse(req.query);
    const where: Prisma.QuoteWhereInput = { userId };
    if (q.status) where.status = q.status;
    if (q.contactId) where.contactId = q.contactId;

    const items = await prisma.quote.findMany({ where, include, orderBy: { issueDate: 'desc' } });
    res.json({ items });
  }),
);

/** Sugiere el siguiente número de presupuesto: PRE-<año>-<secuencia>. */
router.get(
  '/next-number',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const year = new Date().getFullYear();
    const prefix = `PRE-${year}-`;
    const last = await prisma.quote.findFirst({
      where: { userId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? Number(last.number.slice(prefix.length)) || 0 : 0;
    res.json({ number: `${prefix}${String(seq + 1).padStart(4, '0')}` });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
      include: { ...include, documents: true },
    });
    if (!quote) throw notFound('Presupuesto no encontrado');
    res.json(quote);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const { items, ...data } = parseBody(quoteSchema, req.body);
    await assertOwnedRelations(userId, data);

    const quote = await prisma.quote.create({
      data: {
        ...data,
        userId,
        issueDate: data.issueDate ?? new Date(),
        items: { create: items.map((item, position) => ({ ...item, position })) },
      },
      include,
    });
    res.status(201).json(quote);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Presupuesto no encontrado');

    const { items, ...data } = parseBody(quoteSchema, req.body);
    await assertOwnedRelations(userId, data);

    // Las líneas se reemplazan por completo: es más simple y predecible que un diff parcial.
    const quote = await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      return tx.quote.update({
        where: { id: existing.id },
        data: {
          ...data,
          issueDate: data.issueDate ?? existing.issueDate,
          items: { create: items.map((item, position) => ({ ...item, position })) },
        },
        include,
      });
    });
    res.json(quote);
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Presupuesto no encontrado');
    const { status } = parseBody(z.object({ status: quoteStatus }), req.body);
    res.json(await prisma.quote.update({ where: { id: existing.id }, data: { status }, include }));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Presupuesto no encontrado');
    await prisma.quote.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
