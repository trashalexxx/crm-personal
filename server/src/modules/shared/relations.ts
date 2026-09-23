import { badRequest } from '../../lib/errors';
import { prisma } from '../../prisma';

export interface RelationRefs {
  contactId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  quoteId?: string | null;
}

/**
 * Comprueba que cada relación referenciada existe y pertenece al usuario.
 * Evita que alguien asocie sus registros a datos de otra cuenta.
 */
export async function assertOwnedRelations(userId: string, refs: RelationRefs): Promise<void> {
  const checks: Promise<void>[] = [];

  if (refs.contactId) {
    checks.push(
      prisma.contact
        .findFirst({ where: { id: refs.contactId, userId }, select: { id: true } })
        .then((found) => {
          if (!found) throw badRequest('El contacto seleccionado no existe');
        }),
    );
  }
  if (refs.dealId) {
    checks.push(
      prisma.deal
        .findFirst({ where: { id: refs.dealId, userId }, select: { id: true } })
        .then((found) => {
          if (!found) throw badRequest('La oportunidad seleccionada no existe');
        }),
    );
  }
  if (refs.projectId) {
    checks.push(
      prisma.project
        .findFirst({ where: { id: refs.projectId, userId }, select: { id: true } })
        .then((found) => {
          if (!found) throw badRequest('El proyecto seleccionado no existe');
        }),
    );
  }
  if (refs.quoteId) {
    checks.push(
      prisma.quote
        .findFirst({ where: { id: refs.quoteId, userId }, select: { id: true } })
        .then((found) => {
          if (!found) throw badRequest('El presupuesto seleccionado no existe');
        }),
    );
  }

  await Promise.all(checks);
}
