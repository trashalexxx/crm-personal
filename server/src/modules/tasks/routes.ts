import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { taskPriority, taskStatus } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import { optionalDate, optionalId, optionalText, parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { assertOwnedRelations } from '../shared/relations';

const router = Router();
router.use(requireAuth);

const include = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

const taskSchema = z.object({
  title: requiredText(200, 'El título de la tarea es obligatorio'),
  description: optionalText(2000),
  priority: taskPriority.default('MEDIUM'),
  status: taskStatus.default('PENDING'),
  dueDate: optionalDate,
  contactId: optionalId,
  dealId: optionalId,
  projectId: optionalId,
});

const listQuery = z.object({
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  scope: z.enum(['all', 'open', 'overdue', 'today', 'week']).default('all'),
});

function scopeFilter(scope: z.infer<typeof listQuery>['scope']): Prisma.TaskWhereInput {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

  switch (scope) {
    case 'open':
      return { status: { in: ['PENDING', 'IN_PROGRESS'] } };
    case 'overdue':
      return { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: startOfDay } };
    case 'today':
      return {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: startOfDay, lt: endOfDay },
      };
    case 'week':
      return { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: endOfWeek } };
    default:
      return {};
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = listQuery.parse(req.query);
    const where: Prisma.TaskWhereInput = { userId, ...scopeFilter(q.scope) };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.contactId) where.contactId = q.contactId;
    if (q.dealId) where.dealId = q.dealId;
    if (q.projectId) where.projectId = q.projectId;

    const items = await prisma.task.findMany({
      where,
      include,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const data = parseBody(taskSchema, req.body);
    await assertOwnedRelations(userId, data);
    const task = await prisma.task.create({
      data: {
        ...data,
        userId,
        completedAt: data.status === 'DONE' ? new Date() : null,
      },
      include,
    });
    res.status(201).json(task);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Tarea no encontrada');

    const data = parseBody(taskSchema, req.body);
    await assertOwnedRelations(userId, data);
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...data,
        completedAt:
          data.status === 'DONE' ? (existing.completedAt ?? new Date()) : null,
      },
      include,
    });
    res.json(task);
  }),
);

/** Alterna entre pendiente y completada desde la lista. */
router.patch(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Tarea no encontrada');

    const done = existing.status === 'DONE';
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        status: done ? 'PENDING' : 'DONE',
        completedAt: done ? null : new Date(),
      },
      include,
    });
    res.json(task);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Tarea no encontrada');
    await prisma.task.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
