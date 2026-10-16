import { Schema, model, Document, Types } from 'mongoose';

export type FormSyncStatus = 'success' | 'failed' | 'conflict_flagged' | 'replay_rejected';

export interface IFormSyncEvent extends Document {
  _id: Types.ObjectId;
  eventId: string;
  submissionTimestamp: Date;
  receivedAt: Date;
  payload: Record<string, any>;
  signature: string;
  status: FormSyncStatus;
  errorMessage?: string;
  retryCount: number;
  lastRetriedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FormSyncEventSchema = new Schema<IFormSyncEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    submissionTimestamp: {
      type: Date,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: () => new Date(),
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'conflict_flagged', 'replay_rejected'],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetriedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
    },
  },
  {
    timestamps: true,
  }
);

export const FormSyncEvent = model<IFormSyncEvent>('FormSyncEvent', FormSyncEventSchema);
