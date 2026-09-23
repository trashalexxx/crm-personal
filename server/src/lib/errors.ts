import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'No autenticado') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Sin permisos') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Recurso no encontrado') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string) => new AppError(409, msg, 'CONFLICT');

/** Envuelve un handler async para que sus rechazos lleguen al middleware de errores. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
