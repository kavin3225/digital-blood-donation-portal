import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'emergency_broadcast'
  | 'request_status_update'
  | 'donor_response'
  | 'availability_reminder'
  | 'coordinator_assignment';

export type DeliveryChannel = 'in_app' | 'web_push' | 'email';
export type DeliveryStatus = 'queued' | 'provider_accepted' | 'failed' | 'acknowledged';

export interface INotificationLog extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  recipientEmail: string;
  requestId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  channel: DeliveryChannel;
  deliveryStatus: DeliveryStatus;
  errorMessage?: string;
  acknowledgedAt?: Date;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'emergency_broadcast',
        'request_status_update',
        'donor_response',
        'availability_reminder',
        'coordinator_assignment',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['in_app', 'web_push', 'email'],
      default: 'in_app',
    },
    deliveryStatus: {
      type: String,
      enum: ['queued', 'provider_accepted', 'failed', 'acknowledged'],
      default: 'provider_accepted',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    acknowledgedAt: {
      type: Date,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

NotificationLogSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export const NotificationLog = model<INotificationLog>('NotificationLog', NotificationLogSchema);
