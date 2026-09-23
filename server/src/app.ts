import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import helmet from 'helmet';
import { env } from './env';
import { errorHandler, notFoundHandler } from './middleware/error';
import activitiesRoutes from './modules/activities/routes';
import authRoutes from './modules/auth/routes';
import contactsRoutes from './modules/contacts/routes';
import dashboardRoutes from './modules/dashboard/routes';
import dataRoutes from './modules/data/routes';
import dealsRoutes from './modules/deals/routes';
import documentsRoutes from './modules/documents/routes';
import eventsRoutes from './modules/events/routes';
import projectsRoutes from './modules/projects/routes';
import quotesRoutes from './modules/quotes/routes';
import reportsRoutes from './modules/reports/routes';
import stagesRoutes from './modules/stages/routes';
import tagsRoutes from './modules/tags/routes';
import tasksRoutes from './modules/tasks/routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      // HSTS y upgrade-insecure-requests solo tienen sentido sirviendo por HTTPS.
      // Sobre http:// (red local o Tailscale) harían que el navegador pidiera los assets
      // por https, el servidor no respondería y la aplicación quedaría en blanco.
      hsts: env.HTTPS_ENABLED,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: env.HTTPS_ENABLED ? {} : { upgradeInsecureRequests: null },
      },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '6mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/stages', stagesRoutes);
  app.use('/api/deals', dealsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/activities', activitiesRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/quotes', quotesRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/data', dataRoutes);

  // Modo "un solo puerto": si existe el build del frontend, se sirve desde la propia API.
  // Útil para usar el CRM desde el móvil en la red local sin levantar dos servidores.
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    // Fallback del enrutado del cliente: cualquier ruta que no sea /api devuelve index.html.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
