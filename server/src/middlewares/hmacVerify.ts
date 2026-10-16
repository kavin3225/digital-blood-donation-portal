import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { FormSyncEvent } from '../models/FormSyncEvent';

export interface HmacVerifiedRequest extends Request {
  rawBodyBuffer?: Buffer;
}

export const verifyAppsScriptHmac = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const signature = req.headers['x-bit-signature'] as string;
  const timestampHeader = req.headers['x-bit-timestamp'] as string;
  const eventId = (req.headers['x-bit-event-id'] as string) || req.body?.eventId;

  if (!signature || !timestampHeader || !eventId) {
    res.status(401).json({
      success: false,
      code: 'MISSING_SYNC_AUTH_HEADERS',
      message: 'Unauthorized: Missing required X-BIT-Signature, X-BIT-Timestamp, or eventId header.',
    });
    return;
  }

  // 1. Clock skew check (5 minutes window)
  const timestamp = parseInt(timestampHeader, 10);
  const now = Date.now();
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 5 * 60 * 1000) {
    res.status(401).json({
      success: false,
      code: 'EXPIRED_OR_FUTURE_TIMESTAMP',
      message: 'Unauthorized: Request timestamp expired or outside permitted 5-minute skew window.',
    });
    return;
  }

  // 2. Replay rejection: check if this eventId was already successfully processed
  const existingEvent = await FormSyncEvent.findOne({ eventId });
  if (existingEvent && existingEvent.status === 'success') {
    res.status(200).json({
      success: true,
      code: 'DUPLICATE_ALREADY_PROCESSED',
      message: 'Event was previously processed successfully. Idempotent acknowledgment returned.',
      eventId,
    });
    return;
  }

  // 3. Compute HMAC-SHA256 signature
  // Payload string: `${timestamp}.${eventId}.${JSON.stringify(req.body)}`
  const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const dataToSign = `${timestampHeader}.${eventId}.${bodyString}`;

  const expectedHmac = crypto
    .createHmac('sha256', ENV.FORM_SYNC_SECRET)
    .update(dataToSign)
    .digest('hex');

  // Also support simple payload signature: crypto.createHmac('sha256', secret).update(bodyString).digest('hex')
  const alternativeHmac = crypto
    .createHmac('sha256', ENV.FORM_SYNC_SECRET)
    .update(bodyString)
    .digest('hex');

  const timingSafeEqual = (a: string, b: string): boolean => {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  };

  const isValid = timingSafeEqual(signature, expectedHmac) || timingSafeEqual(signature, alternativeHmac);

  if (!isValid) {
    // Record rejection in FormSyncEvent
    await FormSyncEvent.create({
      eventId,
      submissionTimestamp: new Date(timestamp),
      payload: req.body,
      signature,
      status: 'failed',
      errorMessage: 'Invalid HMAC signature. Secret mismatch or tampering detected.',
    });

    res.status(401).json({
      success: false,
      code: 'INVALID_HMAC_SIGNATURE',
      message: 'Unauthorized: HMAC signature verification failed.',
    });
    return;
  }

  next();
};
