import { z } from 'zod';
import { badRequest } from './errors';

/** Texto opcional: convierte "" en null y recorta espacios. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

/** Texto obligatorio con longitud acotada. */
export const requiredText = (max = 200, msg = 'Este campo es obligatorio') =>
  z.string().trim().min(1, msg).max(max, `Máximo ${max} caracteres`);

/** Correo opcional; acepta "" o null. */
export const optionalEmail = z
  .union([z.literal(''), z.null(), z.string().trim().email('Correo electrónico no válido')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

/** URL opcional; acepta "" o null. */
export const optionalUrl = z
  .union([z.literal(''), z.null(), z.string().trim().url('URL no válida').max(500)])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

/** Fecha ISO opcional -> Date | null. */
export const optionalDate = z
  .union([z.literal(''), z.null(), z.string().datetime({ offset: true }), z.coerce.date()])
  .optional()
  .transform((v) => {
    if (v === '' || v === null || v === undefined) return null;
    const d = new Date(v as string | Date);
    return Number.isNaN(d.getTime()) ? null : d;
  });

/** Fecha ISO obligatoria -> Date. */
export const requiredDate = z.coerce.date({ invalid_type_error: 'Fecha no válida' });

/** Importe en céntimos. */
export const cents = z
  .number({ invalid_type_error: 'Importe no válido' })
  .int('El importe debe estar en céntimos (número entero)')
  .min(0, 'El importe no puede ser negativo')
  .max(1_000_000_000_00, 'Importe fuera de rango');

/** Identificador opcional de relación. */
export const optionalId = z
  .union([z.literal(''), z.null(), z.string().cuid().or(z.string().min(1).max(64))])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw badRequest('Datos no válidos', details);
  }
  return result.data;
}
