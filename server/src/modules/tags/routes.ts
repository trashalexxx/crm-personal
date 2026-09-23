import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/errors';
import { parseBody, requiredText } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

const tagSchema = z.object({
  name: requiredText(40, 'El nombre de la etiqueta es obligatorio'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal, por ejemplo #6366f1')
    .default('#6366f1'),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tags = await prisma.tag.findMany({
      where: { userId: (req as AuthRequest).userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { contacts: true } } },
    });
    res.json({ items: tags });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(tagSchema, req.body);
    const tag = await prisma.tag.create({ data: { ...data, userId: (req as AuthRequest).userId } });
    res.status(201).json(tag);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.tag.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Etiqueta no encontrada');
    const data = parseBody(tagSchema, req.body);
    res.json(await prisma.tag.update({ where: { id: existing.id }, data }));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const existing = await prisma.tag.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw notFound('Etiqueta no encontrada');
    await prisma.tag.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

export default router;
