import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../env';
import { asyncHandler, conflict, forbidden, unauthorized } from '../../lib/errors';
import { parseBody, requiredText } from '../../lib/validate';
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
  type AuthRequest,
} from '../../middleware/auth';
import { prisma } from '../../prisma';
import { DEFAULT_STAGES, DEFAULT_TAGS } from './defaults';

const router = Router();

const tooManyRequests = {
  error: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  },
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests,
});

/**
 * Límite más estricto solo para el inicio de sesión, que es la puerta que un atacante
 * intentaría forzar. 8 intentos cada 15 minutos por IP.
 *
 * Se descartó el bloqueo de cuenta tras N fallos: con el CRM expuesto en internet,
 * cualquiera que conozca el correo podría dejar al dueño fuera a base de intentos
 * fallidos. Limitar por IP frena la fuerza bruta sin ese efecto secundario.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooManyRequests,
});

const passwordRules = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(200, 'Contraseña demasiado larga')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'La contraseña debe incluir al menos una letra y un número',
  });

const registerSchema = z.object({
  name: requiredText(120, 'Indica tu nombre'),
  email: z.string().trim().toLowerCase().email('Correo electrónico no válido'),
  password: passwordRules,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico no válido'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

const profileSchema = z.object({
  name: requiredText(120, 'Indica tu nombre'),
  currency: z.string().trim().length(3, 'Usa un código ISO de 3 letras, por ejemplo EUR').toUpperCase(),
  locale: z.string().trim().min(2).max(10),
  theme: z.enum(['light', 'dark', 'system']),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Introduce tu contraseña actual'),
  newPassword: passwordRules,
});

const publicUser = {
  id: true,
  email: true,
  name: true,
  currency: true,
  locale: true,
  theme: true,
  createdAt: true,
} as const;

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!env.ALLOW_REGISTRATION) {
      throw forbidden('El registro de nuevas cuentas está desactivado');
    }
    const data = parseBody(registerSchema, req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw conflict('Ya existe una cuenta con ese correo electrónico');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        stages: { create: DEFAULT_STAGES },
        tags: { create: DEFAULT_TAGS },
      },
      select: publicUser,
    });

    setAuthCookie(res, signToken(user.id));
    res.status(201).json(user);
  }),
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Mismo mensaje en ambos casos para no revelar qué correos existen.
    const invalid = unauthorized('Correo o contraseña incorrectos');
    if (!user) {
      await bcrypt.hash(data.password, 12); // iguala el coste temporal
      throw invalid;
    }
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw invalid;

    setAuthCookie(res, signToken(user.id));
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
      locale: user.locale,
      theme: user.theme,
      createdAt: user.createdAt,
    });
  }),
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: (req as AuthRequest).userId },
      select: publicUser,
    });
    if (!user) throw unauthorized('La cuenta ya no existe');
    res.json(user);
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(profileSchema, req.body);
    const user = await prisma.user.update({
      where: { id: (req as AuthRequest).userId },
      data,
      select: publicUser,
    });
    res.json(user);
  }),
);

router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = parseBody(passwordSchema, req.body);
    const userId = (req as AuthRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized('La cuenta ya no existe');

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw unauthorized('La contraseña actual no es correcta');

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
    });
    res.status(204).end();
  }),
);

export default router;
