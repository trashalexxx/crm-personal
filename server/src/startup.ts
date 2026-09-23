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
    // Prisma escribe el detalle del fallo en stderr y solo el encabezado en stdout:
    // hay que imprimir ambos o el motivo real se pierde.
    const err = error as { stdout?: string; stderr?: string; message?: string };
    console.error('No se pudieron aplicar las migraciones.');
    if (err.stdout?.trim()) console.error(`[salida]\n${err.stdout.trim()}`);
    if (err.stderr?.trim()) console.error(`[error]\n${err.stderr.trim()}`);
    if (!err.stdout?.trim() && !err.stderr?.trim()) console.error(err.message);

    // Pistas para los fallos que más se repiten, para no tener que interpretar
    // el código de error de Prisma a mano.
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    if (detail.includes('P3009')) {
      console.error(
        '\nPista: hay una migración marcada como fallida de un intento anterior.\n' +
          'Con la base de datos aún vacía, lo más limpio es borrarla y crearla de nuevo\n' +
          'desde Railway, o ejecutar: prisma migrate resolve --rolled-back 0_init',
      );
    } else if (detail.includes('already exists')) {
      console.error(
        '\nPista: las tablas ya existen pero no constan como migradas.\n' +
          'Ejecuta: prisma migrate resolve --applied 0_init',
      );
    } else if (detail.includes('P1001') || detail.includes("Can't reach database")) {
      console.error(
        '\nPista: no hay conexión con la base de datos. Revisa que DATABASE_URL\n' +
          'apunte al host interno (postgres.railway.internal) y que el servicio esté activo.',
      );
    }

    throw new Error('Migraciones fallidas');
  }
}
