import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/errors';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

const query = z.object({
  months: z.coerce.number().int().min(1).max(36).default(6),
});

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const { months } = query.parse(req.query);

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [closedDeals, createdDeals, tasks, contacts, stages, openDeals, quotes] =
      await Promise.all([
        prisma.deal.findMany({
          where: { userId, status: { in: ['WON', 'LOST'] }, closedAt: { gte: from } },
          select: { status: true, amountCents: true, closedAt: true, currency: true },
        }),
        prisma.deal.findMany({
          where: { userId, createdAt: { gte: from } },
          select: { createdAt: true, amountCents: true },
        }),
        prisma.task.findMany({
          where: { userId, createdAt: { gte: from } },
          select: { status: true, createdAt: true, completedAt: true },
        }),
        prisma.contact.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
        prisma.stage.findMany({
          where: { userId },
          orderBy: { position: 'asc' },
          select: { id: true, name: true, color: true },
        }),
        prisma.deal.groupBy({
          by: ['stageId'],
          where: { userId, status: 'OPEN' },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
        prisma.quote.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      ]);

    // Serie mensual continua (incluye meses sin actividad, con ceros).
    const series: {
      month: string;
      wonAmountCents: number;
      lostAmountCents: number;
      wonCount: number;
      lostCount: number;
      createdCount: number;
      tasksCompleted: number;
    }[] = [];

    for (let i = 0; i < months; i += 1) {
      const date = new Date(from.getFullYear(), from.getMonth() + i, 1);
      series.push({
        month: monthKey(date),
        wonAmountCents: 0,
        lostAmountCents: 0,
        wonCount: 0,
        lostCount: 0,
        createdCount: 0,
        tasksCompleted: 0,
      });
    }
    const byMonth = new Map(series.map((s) => [s.month, s]));

    for (const deal of closedDeals) {
      if (!deal.closedAt) continue;
      const bucket = byMonth.get(monthKey(deal.closedAt));
      if (!bucket) continue;
      if (deal.status === 'WON') {
        bucket.wonAmountCents += deal.amountCents;
        bucket.wonCount += 1;
      } else {
        bucket.lostAmountCents += deal.amountCents;
        bucket.lostCount += 1;
      }
    }
    for (const deal of createdDeals) {
      const bucket = byMonth.get(monthKey(deal.createdAt));
      if (bucket) bucket.createdCount += 1;
    }
    for (const task of tasks) {
      if (task.completedAt) {
        const bucket = byMonth.get(monthKey(task.completedAt));
        if (bucket) bucket.tasksCompleted += 1;
      }
    }

    const won = closedDeals.filter((d) => d.status === 'WON');
    const lost = closedDeals.filter((d) => d.status === 'LOST');
    const wonAmount = won.reduce((sum, d) => sum + d.amountCents, 0);
    const closedTotal = won.length + lost.length;

    res.json({
      period: { months, from },
      series,
      conversion: {
        wonCount: won.length,
        lostCount: lost.length,
        winRate: closedTotal ? Math.round((won.length / closedTotal) * 100) : 0,
        wonAmountCents: wonAmount,
        lostAmountCents: lost.reduce((sum, d) => sum + d.amountCents, 0),
        averageWonCents: won.length ? Math.round(wonAmount / won.length) : 0,
      },
      pipeline: stages.map((stage) => {
        const found = openDeals.find((d) => d.stageId === stage.id);
        return {
          stageId: stage.id,
          name: stage.name,
          color: stage.color,
          count: found?._count._all ?? 0,
          amountCents: found?._sum.amountCents ?? 0,
        };
      }),
      contactsByStatus: contacts.map((c) => ({ status: c.status, count: c._count._all })),
      quotesByStatus: quotes.map((q) => ({ status: q.status, count: q._count._all })),
      productivity: {
        created: tasks.length,
        completed: tasks.filter((t) => t.status === 'DONE').length,
        pending: tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
      },
    });
  }),
);

export default router;
