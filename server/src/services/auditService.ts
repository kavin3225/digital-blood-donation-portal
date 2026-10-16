import { AuditLog, IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';

export interface AuditParams {
  actorId?: Types.ObjectId | string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const logAudit = async (params: AuditParams): Promise<IAuditLog> => {
  try {
    const log = new AuditLog({
      actorId: params.actorId ? new Types.ObjectId(params.actorId.toString()) : undefined,
      actorEmail: params.actorEmail.toLowerCase().trim(),
      actorRole: params.actorRole,
      action: params.action,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      details: params.details || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date(),
    });
    return await log.save();
  } catch (error) {
    console.error('[AuditService] Failed to write audit log:', error);
    // Return empty model instance or rethrow, but never crash the core application flow
    return {} as IAuditLog;
  }
};
