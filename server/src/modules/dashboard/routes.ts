import { Router } from 'express';
import { asyncHandler } from '../../lib/errors';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

/**
 * Resumen del dashboard. Todas las cifras se calculan sobre los datos reales
 * del usuario autenticado; si no hay datos, los contadores son 0.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      contactsByStatus,
      openDeals,
      wonThisMonth,
      tasksOpen,
      tasksOverdue,
      upcomingEvents,
      upcomingTasks,
      recentActivities,
      activeProjects,
      pendingQuotes,
      dealsByStage,
    ] = await Promise.all([
      prisma.contact.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      prisma.deal.aggregate({
        where: { userId, status: 'OPEN' },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.deal.aggregate({
        where: { userId, status: 'WON', closedAt: { gte: startOfMonth } },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.task.count({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.task.count({
        where: {
          userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: startOfDay },
        },
      }),
      prisma.event.findMany({
        where: { userId, startsAt: { gte: startOfDay, lte: in7Days } },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { startsAt: 'asc' },
        take: 8,
      }),
      prisma.task.findMany({
        where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        take: 8,
      }),
      prisma.activity.findMany({
        where: { userId },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      }),
      prisma.project.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.quote.count({ where: { userId, status: { in: ['DRAFT', 'SENT'] } } }),
      prisma.deal.groupBy({
        by: ['stageId'],
        where: { userId, status: 'OPEN' },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
    ]);

    const stages = await prisma.stage.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, color: true },
    });

    const statusCount = (status: string) =>
      contactsByStatus.find((c) => c.status === status)?._count._all ?? 0;

    res.json({
      contacts: {
        total: contactsByStatus.reduce((sum, c) => sum + c._count._all, 0),
        lead: statusCount('LEAD'),
        active: statusCount('ACTIVE'),
        recurring: statusCount('RECURRING'),
        inactive: statusCount('INACTIVE'),
      },
      deals: {
        openCount: openDeals._count._all,
        openAmountCents: openDeals._sum.amountCents ?? 0,
        wonThisMonthCount: wonThisMonth._count._all,
        wonThisMonthAmountCents: wonThisMonth._sum.amountCents ?? 0,
      },
      tasks: { open: tasksOpen, overdue: tasksOverdue },
      projects: { active: activeProjects },
      quotes: { pending: pendingQuotes },
      pipeline: stages.map((stage) => {
        const found = dealsByStage.find((d) => d.stageId === stage.id);
        return {
          stageId: stage.id,
          name: stage.name,
          color: stage.color,
          count: found?._count._all ?? 0,
          amountCents: found?._sum.amountCents ?? 0,
        };
      }),
      upcomingEvents,
      upcomingTasks,
      recentActivities,
    });
  }),
);

export default router;
