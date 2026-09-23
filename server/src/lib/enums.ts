import { z } from 'zod';

export const contactStatus = z.enum(['LEAD', 'ACTIVE', 'RECURRING', 'INACTIVE']);
export const dealStatus = z.enum(['OPEN', 'WON', 'LOST']);
export const taskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatus = z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
export const activityType = z.enum(['NOTE', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'OTHER']);
export const eventType = z.enum(['MEETING', 'CALL', 'FOLLOW_UP', 'DEADLINE', 'OTHER']);
export const projectStatus = z.enum(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
export const quoteStatus = z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']);
export const documentType = z.enum(['CONTRACT', 'PROPOSAL', 'INVOICE', 'MATERIAL', 'OTHER']);
