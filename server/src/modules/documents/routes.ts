import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { documentType } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import { optionalId, optionalText, parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
  quote: { select: { id: true, number: true } },
} satisfies Prisma.DocumentInclude;

const documentSchema = z.object({
  name: requiredText(200, 'El nombre del documento es obligatorio'),
  // Solo enlaces http(s): la aplicación referencia archivos externos, no los almacena.
  url: z
    .string()
    .trim()
    .url('Introduce una URL válida')
    .max(1000)
    .refine((v) => /^https?:\/\//i.test(v), 'El enlace debe empezar por http:// o https://'),
  description: optionalText(1000),
  type: documentType.default('OTHER'),
  contactId: optionalId,
  dealId: optionalId,
  projectId: optionalId,
  quoteId: optionalId,
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = z
      .object({
        type: documentType.optional(),
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        projectId: z.string().optional(),
      })
      .parse(req.query);

    const where: Prisma.DocumentWhereInput = { userId };
    if (q.type) where.type = q.type;
    if (q.contactId) where.contactId = q.contactId;
    if (q.dealId) where.dealId = q.dealId;
    if (q.projectId) where.projectId = q.projectId;

    const items = await prisma.document.findMany({ where, include, orderBy: { createdAt: 'desc' } });
    res.json({ items });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(documentSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.status(201).json(await prisma.document.create({ data: { ...data, userId }, include }));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.document.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Documento no encontrado');

    const data = parseBody(documentSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.json(await prisma.document.update({ where: { id: existing.id }, data, include }));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.document.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Documento no encontrado');
    await prisma.document.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
