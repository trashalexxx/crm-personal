import { execFileSync } from 'node:child_process';

/**
 * Diagnóstico de arranque.
 *
 * Se ejecuta antes de tocar la base de datos para que, si falta configuración,
 * el log diga exactamente qué variable falla en lugar de un volcado de Prisma.
 * Nunca imprime valores secretos: solo si están presentes y con qué longitud.
 */
export function reportEnvironment(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const optional = ['NODE_ENV', 'PORT', 'HTTPS_ENABLED', 'ALLOW_REGISTRATION', 'CORS_ORIGIN'];

  console.log('--- Configuración detectada ---');

  for (const name of required) {
    const value = process.env[name];
    if (!value) {
      console.log(`  ${name}: AUSENTE O VACÍA  <-- falta esto`);
    } else if (name === 'DATABASE_URL') {
      // Solo el destino, nunca la contraseña.
      let target = 'formato no reconocido';
      try {
        const url = new URL(value);
        target = `${url.protocol}//${url.hostname}:${url.port || '5432'}${url.pathname}`;
      } catch {
        /* se deja el texto por defecto */
      }
      console.log(`  ${name}: presente (${value.length} caracteres) -> ${target}`);
    } else {
      console.log(`  ${name}: presente (${value.length} caracteres)`);
    }
  }

  for (const name of optional) {
    console.log(`  ${name}: ${process.env[name] ?? '(sin definir, se usa el valor por defecto)'}`);
  }

  console.log('-------------------------------');
}

/**
 * Aplica las migraciones pendientes al arrancar.
 *
 * Se hace desde aquí, y no en el script de npm, para que la validación de
 * configuración y sus mensajes ocurran antes: así un fallo de variables se lee
 * de un vistazo en vez de aparecer como un error interno de Prisma.
 */
export function runMigrations(): void {
  console.log('Aplicando migraciones pendientes…');
  try {
    // Se invoca el script de Prisma con el propio Node en vez de pasar por npx:
    // en Windows npx.cmd falla con EINVAL, y así no dependemos del PATH.
    const prismaCli = require.resolve('prisma/build/index.js');
    const output = execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    console.log(output.trim());
    console.log('Migraciones al día.');
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    console.error('No se pudieron aplicar las migraciones:');
    console.error(err.stdout?.trim() || err.stderr?.trim() || err.message);
    throw new Error('Migraciones fallidas');
  }
}
