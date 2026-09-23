import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ALLOW_REGISTRATION: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  // Solo "true" si sirves realmente por HTTPS. Activa HSTS y la subida automática a HTTPS
  // de las peticiones. Con acceso por http:// (red local o Tailscale) debe quedar en false,
  // o el navegador intentará cargar los recursos por HTTPS y la aplicación no arrancará.
  HTTPS_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nConfiguración inválida. Revisa tu fichero .env:\n${details}\n`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
