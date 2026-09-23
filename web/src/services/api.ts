/** Cliente HTTP compartido por todos los servicios. */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Errores de validación indexados por campo, para pintarlos junto a cada input. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      if (detail.field && !map[detail.field]) map[detail.field] = detail.message;
    }
    return map;
  }
}

/** Parámetros de consulta; los valores no primitivos se ignoran. */
type Query = Record<string, unknown>;

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Query } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: 'include',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está la API en marcha?', 'NETWORK');
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.message ?? `Error ${response.status}`,
      error?.code ?? 'ERROR',
      Array.isArray(error?.details) ? error.details : undefined,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** Descarga un fichero generado por la API (CSV, JSON…). */
  download: async (path: string, fallbackName: string) => {
    const response = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
    if (!response.ok) throw new ApiError(response.status, 'No se pudo generar el fichero');

    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = match?.[1] ?? fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
