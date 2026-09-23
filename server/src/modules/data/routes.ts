import { Router } from 'express';
import { z } from 'zod';
import { parseCsv, toCsv } from '../../lib/csv';
import { contactStatus } from '../../lib/enums';
import { asyncHandler } from '../../lib/errors';
import { parseBody } from '../../lib/validate';
import { requireAuth, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../prisma';

const router = Router();
router.use(requireAuth);

const CONTACT_COLUMNS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'position',
  'status',
  'source',
  'website',
  'linkedin',
  'twitter',
  'instagram',
  'address',
  'city',
  'country',
  'tags',
  'notes',
] as const;

/** Nombres de columna alternativos aceptados al importar (español e inglés). */
const COLUMN_ALIASES: Record<string, (typeof CONTACT_COLUMNS)[number]> = {
  nombre: 'firstName',
  firstname: 'firstName',
  'first name': 'firstName',
  apellido: 'lastName',
  apellidos: 'lastName',
  lastname: 'lastName',
  'last name': 'lastName',
  correo: 'email',
  'correo electronico': 'email',
  'e-mail': 'email',
  email: 'email',
  telefono: 'phone',
  teléfono: 'phone',
  movil: 'phone',
  phone: 'phone',
  empresa: 'company',
  company: 'company',
  cargo: 'position',
  puesto: 'position',
  position: 'position',
  estado: 'status',
  status: 'status',
  origen: 'source',
  source: 'source',
  web: 'website',
  sitio: 'website',
  website: 'website',
  linkedin: 'linkedin',
  twitter: 'twitter',
  instagram: 'instagram',
  direccion: 'address',
  dirección: 'address',
  address: 'address',
  ciudad: 'city',
  city: 'city',
  pais: 'country',
  país: 'country',
  country: 'country',
  etiquetas: 'tags',
  tags: 'tags',
  notas: 'notes',
  notes: 'notes',
};

const STATUS_ALIASES: Record<string, string> = {
  potencial: 'LEAD',
  lead: 'LEAD',
  activo: 'ACTIVE',
  active: 'ACTIVE',
  recurrente: 'RECURRING',
  recurring: 'RECURRING',
  inactivo: 'INACTIVE',
  inactive: 'INACTIVE',
};

router.get(
  '/contacts/export.csv',
  asyncHandler(async (req, res) => {
    const contacts = await prisma.contact.findMany({
      where: { userId: (req as AuthRequest).userId },
      include: { tags: true },
      orderBy: { createdAt: 'asc' },
    });

    const rows = contacts.map((c) => ({
      ...c,
      tags: c.tags.map((t) => t.name).join('; '),
    }));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contactos-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(toCsv(rows, [...CONTACT_COLUMNS]));
  }),
);

const importSchema = z.object({
  csv: z.string().min(1, 'El fichero está vacío').max(5_000_000, 'Fichero demasiado grande'),
  // skip: no toca los existentes | update: actualiza si coincide correo o teléfono
  duplicates: z.enum(['skip', 'update', 'create']).default('skip'),
  dryRun: z.boolean().default(false),
});

router.post(
  '/contacts/import',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const { csv, duplicates, dryRun } = parseBody(importSchema, req.body);

    const rawRows = parseCsv(csv);
    if (rawRows.length === 0) {
      res.json({ created: 0, updated: 0, skipped: 0, errors: [], preview: [] });
      return;
    }
    if (rawRows.length > 5000) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Máximo 5000 filas por importación' },
      });
      return;
    }

    // Normaliza las cabeceras a los nombres de campo internos.
    const normalized = rawRows.map((row) => {
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const field = COLUMN_ALIASES[key.trim().toLowerCase()];
        if (field) out[field] = value;
      }
      return out;
    });

    const existing = await prisma.contact.findMany({
      where: { userId },
      select: { id: true, email: true, phone: true },
    });
    const byEmail = new Map(
      existing.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]),
    );
    const byPhone = new Map(
      existing.filter((c) => c.phone).map((c) => [c.phone!.replace(/\D/g, '').slice(-9), c.id]),
    );

    const errors: { row: number; message: string }[] = [];
    const preview: Record<string, unknown>[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const tagCache = new Map<string, string>();
    const resolveTag = async (name: string): Promise<string> => {
      const key = name.toLowerCase();
      const cached = tagCache.get(key);
      if (cached) return cached;
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      });
      tagCache.set(key, tag.id);
      return tag.id;
    };

    for (let i = 0; i < normalized.length; i += 1) {
      const row = normalized[i];
      const lineNumber = i + 2; // +1 cabecera, +1 índice base 1

      if (!row.firstName?.trim()) {
        errors.push({ row: lineNumber, message: 'Falta el nombre' });
        continue;
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        errors.push({ row: lineNumber, message: `Correo no válido: ${row.email}` });
        continue;
      }

      const status =
        STATUS_ALIASES[(row.status ?? '').trim().toLowerCase()] ??
        (contactStatus.safeParse(row.status).success ? row.status : 'LEAD');

      const data = {
        firstName: row.firstName.trim().slice(0, 80),
        lastName: row.lastName?.trim().slice(0, 80) || null,
        email: row.email?.trim().toLowerCase() || null,
        phone: row.phone?.trim().slice(0, 40) || null,
        company: row.company?.trim().slice(0, 120) || null,
        position: row.position?.trim().slice(0, 120) || null,
        status,
        source: row.source?.trim().slice(0, 120) || 'Importación CSV',
        website: row.website?.trim().slice(0, 500) || null,
        linkedin: row.linkedin?.trim().slice(0, 200) || null,
        twitter: row.twitter?.trim().slice(0, 200) || null,
        instagram: row.instagram?.trim().slice(0, 200) || null,
        address: row.address?.trim().slice(0, 200) || null,
        city: row.city?.trim().slice(0, 80) || null,
        country: row.country?.trim().slice(0, 80) || null,
        notes: row.notes?.trim().slice(0, 5000) || null,
      };

      const matchId =
        (data.email ? byEmail.get(data.email) : undefined) ??
        (data.phone ? byPhone.get(data.phone.replace(/\D/g, '').slice(-9)) : undefined);

      if (preview.length < 10) preview.push({ ...data, _match: matchId ? 'duplicado' : 'nuevo' });

      if (dryRun) {
        if (matchId && duplicates === 'skip') skipped += 1;
        else if (matchId && duplicates === 'update') updated += 1;
        else created += 1;
        continue;
      }

      const tagIds: string[] = [];
      if (row.tags?.trim()) {
        for (const name of row.tags.split(/[;,|]/).map((t) => t.trim()).filter(Boolean).slice(0, 10)) {
          tagIds.push(await resolveTag(name.slice(0, 40)));
        }
      }

      try {
        if (matchId && duplicates === 'skip') {
          skipped += 1;
        } else if (matchId && duplicates === 'update') {
          await prisma.contact.update({
            where: { id: matchId },
            data: { ...data, tags: { connect: tagIds.map((id) => ({ id })) } },
          });
          updated += 1;
        } else {
          const contact = await prisma.contact.create({
            data: { ...data, userId, tags: { connect: tagIds.map((id) => ({ id })) } },
          });
          if (contact.email) byEmail.set(contact.email.toLowerCase(), contact.id);
          if (contact.phone) byPhone.set(contact.phone.replace(/\D/g, '').slice(-9), contact.id);
          created += 1;
        }
      } catch (err) {
        errors.push({
          row: lineNumber,
          message: err instanceof Error ? err.message : 'Error al guardar la fila',
        });
      }
    }

    res.json({ created, updated, skipped, errors: errors.slice(0, 100), preview, dryRun });
  }),
);

/** Plantilla CSV vacía con las cabeceras esperadas. */
router.get('/contacts/template.csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-contactos.csv"');
  res.send(toCsv([], [...CONTACT_COLUMNS]));
});

/** Copia de seguridad completa de la cuenta en JSON. */
router.get(
  '/backup.json',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).userId;
    const [contacts, tags, stages, deals, tasks, activities, events, projects, quotes, documents] =
      await Promise.all([
        prisma.contact.findMany({ where: { userId }, include: { tags: { select: { id: true } } } }),
        prisma.tag.findMany({ where: { userId } }),
        prisma.stage.findMany({ where: { userId } }),
        prisma.deal.findMany({ where: { userId } }),
        prisma.task.findMany({ where: { userId } }),
        prisma.activity.findMany({ where: { userId } }),
        prisma.event.findMany({ where: { userId } }),
        prisma.project.findMany({ where: { userId } }),
        prisma.quote.findMany({ where: { userId }, include: { items: true } }),
        prisma.document.findMany({ where: { userId } }),
      ]);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="crm-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.send(
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          data: { tags, stages, contacts, deals, tasks, activities, events, projects, quotes, documents },
        },
        null,
        2,
      ),
    );
  }),
);

export default router;
