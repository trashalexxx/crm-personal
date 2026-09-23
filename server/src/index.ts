import os from 'node:os';
import { createApp } from './app';
import { env } from './env';
import { prisma } from './prisma';

/** Direcciones IPv4 de la red local, para abrir el CRM desde el móvil. */
function localAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net): net is os.NetworkInterfaceInfo => Boolean(net))
    .filter((net) => net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

async function main() {
  // Falla pronto si la base de datos no está accesible o sin migrar.
  await prisma.$connect();

  const app = createApp();
  // Escucha en todas las interfaces para que otros dispositivos de la red local puedan entrar.
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`API del CRM escuchando (${env.NODE_ENV})`);
    console.log(`  Local:   http://localhost:${env.PORT}`);
    for (const address of localAddresses()) {
      console.log(`  Red:     http://${address}:${env.PORT}`);
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} recibido, cerrando…`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  console.error('No se pudo arrancar el servidor:', err);
  await prisma.$disconnect();
  process.exit(1);
});
