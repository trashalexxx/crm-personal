import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { projectStatus } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import { optionalDate, optionalId, optionalText, parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  contact: { select: { id: true, firstName: true, lastName: true, company: true } },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

const projectSchema = z
  .object({
    name: requiredText(160, 'El nombre del proyecto es obligatorio'),
    description: optionalText(4000),
    status: projectStatus.default('PLANNED'),
    progress: z.coerce.number().int().min(0).max(100).default(0),
    contactId: optionalId,
    startDate: optionalDate,
    dueDate: optionalDate,
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    message: 'La fecha de entrega no puede ser anterior a la de inicio',
    path: ['dueDate'],
  });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = z.object({ status: projectStatus.optional() }).parse(req.query);
    const where: Prisma.ProjectWhereInput = { userId };
    if (q.status) where.status = q.status;

    const items = await prisma.project.findMany({
      where,
      include,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }],
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: (req as AuthRequest).userId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
        activities: { orderBy: { occurredAt: 'desc' } },
        documents: true,
      },
    });
    if (!project) throw notFound('Proyecto no encontrado');
    res.json(project);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(projectSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.status(201).json(await prisma.project.create({ data: { ...data, userId }, include }));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Proyecto no encontrado');

    const data = parseBody(projectSchema, req.body);
    await assertOwnedRelations(userId, data);
    res.json(await prisma.project.update({ where: { id: existing.id }, data, include }));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Proyecto no encontrado');
    await prisma.project.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
