import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { contactStatus } from '../../lib/enums';
import { asyncHandler, notFound } from '../../lib/errors';
import {
  optionalEmail,
  optionalText,
  optionalUrl,
  parseBody,
  requiredText,
} from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { findDuplicateGroups } from './duplicates';

const router = Router();
router.use(requireAuth);

const contactSchema = z.object({
  firstName: requiredText(80, 'El nombre es obligatorio'),
  lastName: optionalText(80),
  email: optionalEmail,
  phone: optionalText(40),
  company: optionalText(120),
  position: optionalText(120),
  website: optionalUrl,
  linkedin: optionalText(200),
  twitter: optionalText(200),
  instagram: optionalText(200),
  address: optionalText(200),
  city: optionalText(80),
  country: optionalText(80),
  status: contactStatus.default('LEAD'),
  source: optionalText(120),
  notes: optionalText(5000),
  tagIds: z.array(z.string()).max(30).optional(),
});

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  status: contactStatus.optional(),
  tagId: z.string().optional(),
  sort: z.enum(['recent', 'name', 'company']).default('recent'),
  take: z.coerce.number().int().min(1).max(500).default(200),
  skip: z.coerce.number().int().min(0).default(0),
});

const include = { tags: true } satisfies Prisma.ContactInclude;

function buildWhere(userId: string, q: z.infer<typeof listQuery>): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { userId };
  if (q.status) where.status = q.status;
  if (q.tagId) where.tags = { some: { id: q.tagId } };
  if (q.search) {
    // En PostgreSQL `contains` distingue mayúsculas, así que hay que pedir
    // explícitamente modo insensible: si no, buscar "maria" no encontraría "María".
    const term = q.search;
    const like = { contains: term, mode: 'insensitive' } as const;
    where.OR = [
      { firstName: like },
      { lastName: like },
      { email: like },
      { phone: like },
      { company: like },
    ];
  }
  return where;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const q = listQuery.parse(req.query);
    const where = buildWhere(userId, q);

    const orderBy: Prisma.ContactOrderByWithRelationInput =
      q.sort === 'name'
        ? { firstName: 'asc' }
        : q.sort === 'company'
          ? { company: 'asc' }
          : { updatedAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.contact.findMany({ where, include, orderBy, take: q.take, skip: q.skip }),
      prisma.contact.count({ where }),
    ]);
    res.json({ items, total });
  }),
);

router.get(
  '/duplicates',
  asyncHandler(async (req, res) => {
    const contacts = await prisma.contact.findMany({
      where: { userId: (req as AuthRequest).userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
      },
    });
    res.json({ groups: findDuplicateGroups(contacts) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
      include: {
        tags: true,
        deals: { include: { stage: true }, orderBy: { updatedAt: 'desc' } },
        tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
        activities: { orderBy: { occurredAt: 'desc' }, take: 100 },
        events: { orderBy: { startsAt: 'desc' }, take: 50 },
        projects: { orderBy: { updatedAt: 'desc' } },
        quotes: { orderBy: { issueDate: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!contact) throw notFound('Contacto no encontrado');
    res.json(contact);
  }),
);

/** Comprueba que las etiquetas indicadas son del usuario antes de asociarlas. */
async function ownedTagIds(userId: string, tagIds?: string[]): Promise<string[]> {
  if (!tagIds?.length) return [];
  const tags = await prisma.tag.findMany({
    where: { userId, id: { in: tagIds } },
    select: { id: true },
  });
  return tags.map((t) => t.id);
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const { tagIds, ...data } = parseBody(contactSchema, req.body);
    const ids = await ownedTagIds(userId, tagIds);

    const contact = await prisma.contact.create({
      data: { ...data, userId, tags: { connect: ids.map((id) => ({ id })) } },
      include,
    });
    res.status(201).json(contact);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
      select: { id: true },
    });
    if (!existing) throw notFound('Contacto no encontrado');

    const { tagIds, ...data } = parseBody(contactSchema, req.body);
    const ids = await ownedTagIds(userId, tagIds);

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: { ...data, tags: { set: ids.map((id) => ({ id })) } },
      include,
    });
    res.json(contact);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, userId },
      select: { id: true },
    });
    if (!existing) throw notFound('Contacto no encontrado');
    await prisma.contact.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
