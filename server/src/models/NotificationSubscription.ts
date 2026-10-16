import { Schema, model, Document, Types } from 'mongoose';

export interface INotificationSubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userEmail: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  deviceType: string;
  isActive: boolean;
  subscribedAt: Date;
  lastActiveAt: Date;
}

const NotificationSubscriptionSchema = new Schema<INotificationSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: {
      type: String,
      default: '',
    },
    deviceType: {
      type: String,
      default: 'browser',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: () => new Date(),
    },
    lastActiveAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationSubscription = model<INotificationSubscription>(
  'NotificationSubscription',
  NotificationSubscriptionSchema
);
