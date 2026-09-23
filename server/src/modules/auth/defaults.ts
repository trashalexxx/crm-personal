import type { Prisma } from '@prisma/client';

/**
 * Configuración inicial de una cuenta nueva.
 * Solo estructura (etapas y etiquetas); nunca contactos, ventas ni métricas de ejemplo.
 */
export const DEFAULT_STAGES: Prisma.StageCreateWithoutUserInput[] = [
  { name: 'Primer contacto', position: 0, probability: 10, color: '#8a8a93' },
  { name: 'Cualificado', position: 1, probability: 30, color: '#fb5f70' },
  { name: 'Propuesta enviada', position: 2, probability: 55, color: '#ed2b40' },
  { name: 'Negociación', position: 3, probability: 75, color: '#d01228' },
  { name: 'Cierre', position: 4, probability: 90, color: '#10b981' },
];

export const DEFAULT_TAGS: Prisma.TagCreateWithoutUserInput[] = [
  { name: 'Prioritario', color: '#d01228' },
  { name: 'Referido', color: '#8b5cf6' },
  { name: 'Newsletter', color: '#0ea5e9' },
];
