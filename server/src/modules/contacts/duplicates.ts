/**
 * Detección de posibles contactos duplicados.
 * Es una sugerencia, nunca una fusión automática: el usuario decide qué hacer.
 */

export interface DuplicateCandidate {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface DuplicateGroup {
  reason: 'email' | 'phone' | 'name';
  value: string;
  contacts: DuplicateCandidate[];
}

const normalizeEmail = (v: string | null) => v?.trim().toLowerCase() || null;
/** Compara solo los dígitos y los 9 últimos, para ignorar prefijos y separadores. */
const normalizePhone = (v: string | null) => {
  const digits = v?.replace(/\D/g, '') ?? '';
  return digits.length >= 6 ? digits.slice(-9) : null;
};
const normalizeName = (first: string, last: string | null) =>
  `${first} ${last ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() || null;

export function findDuplicateGroups(contacts: DuplicateCandidate[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seenPairs = new Set<string>();

  const buckets: { reason: DuplicateGroup['reason']; key: (c: DuplicateCandidate) => string | null }[] =
    [
      { reason: 'email', key: (c) => normalizeEmail(c.email) },
      { reason: 'phone', key: (c) => normalizePhone(c.phone) },
      { reason: 'name', key: (c) => normalizeName(c.firstName, c.lastName) },
    ];

  for (const bucket of buckets) {
    const map = new Map<string, DuplicateCandidate[]>();
    for (const contact of contacts) {
      const key = bucket.key(contact);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(contact);
      map.set(key, list);
    }
    for (const [value, list] of map) {
      if (list.length < 2) continue;
      // Evita repetir el mismo conjunto de contactos por varios motivos.
      const signature = list
        .map((c) => c.id)
        .sort()
        .join('|');
      if (seenPairs.has(signature)) continue;
      seenPairs.add(signature);
      groups.push({ reason: bucket.reason, value, contacts: list });
    }
  }

  return groups;
}
