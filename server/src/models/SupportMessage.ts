import { Document, model, Schema, Types } from 'mongoose';

export interface ISupportMessage extends Document {
  userId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: 'user' | 'admin';
  message: string;
  readByUser: boolean;
  readByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'StudentRegistration', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'StudentRegistration', required: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true, maxlength: 2000, trim: true },
  readByUser: { type: Boolean, default: false },
  readByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

SupportMessageSchema.index({ userId: 1, createdAt: 1 });

export const SupportMessage = model<ISupportMessage>('SupportMessage', SupportMessageSchema);
