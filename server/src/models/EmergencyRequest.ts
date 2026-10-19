import { Schema, model, Document, Types } from 'mongoose';
import { BloodGroupType } from './StudentRegistration';

export type RequestStatusType =
  | 'pending_verification'
  | 'verified'
  | 'broadcast'
  | 'coordinating'
  | 'fulfilled'
  | 'rejected'
  | 'cancelled'
  | 'expired';
export type RequestUrgencyType = 'emergency' | 'within_24h' | 'planned';

export interface IHandoverEntry {
  coordinatorId: Types.ObjectId;
  coordinatorName: string;
  timestamp: Date;
  handoverNote: string;
}

export interface IBroadcastEntry {
  timestamp: Date;
  recipientCount: number;
  channel: string;
}

export interface IEmergencyRequest extends Document {
  _id: Types.ObjectId;
  requestId: string;
  clientRequestKey?: string;
  requestTarget: 'Self' | 'College Friend';
  patientEmail: string;
  patientName?: string;
  patientReference?: string;
  district: string;
  area: string;
  hospital?: string;
  hospitalLocation?: string;
  bloodGroup: BloodGroupType;
  urgency: RequestUrgencyType;
  unitsRequired: number;
  requiredBy: Date;
  contactPersonName: string;
  contactPersonPhone: string;
  briefContext: string;
  requesterRemark?: string;
  supportingEvidenceNote?: string;
  affectedStudentName?: string;
  affectedStudentEmail?: string;
  affectedStudentRegNo?: string;
  relationshipToStudent?: string;
  requesterId: Types.ObjectId;
  requesterEmail: string;
  requesterName?: string;
  status: RequestStatusType;
  assignedCoordinatorId?: Types.ObjectId;
  assignedCoordinatorName?: string;
  coordinatorNotes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  fulfillmentNotes?: string;
  handoverHistory: IHandoverEntry[];
  broadcastHistory: IBroadcastEntry[];
  verifiedAt?: Date;
  broadcastAt?: Date;
  fulfilledAt?: Date;
  closedAt?: Date;
  isDirectCoordinatorCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HandoverEntrySchema = new Schema<IHandoverEntry>({
  coordinatorId: { type: Schema.Types.ObjectId, ref: 'StudentRegistration', required: true },
  coordinatorName: { type: String, required: true },
  timestamp: { type: Date, default: () => new Date() },
  handoverNote: { type: String, required: true },
});

const BroadcastEntrySchema = new Schema<IBroadcastEntry>({
  timestamp: { type: Date, default: () => new Date() },
  recipientCount: { type: Number, default: 0 },
  channel: { type: String, default: 'in_app' },
});

const EmergencyRequestSchema = new Schema<IEmergencyRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientRequestKey: { type: String, trim: true, maxlength: 100 },
    requestTarget: {
      type: String,
      enum: ['Self', 'College Friend'],
      default: 'Self',
      index: true,
    },
    patientEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: '',
    },
    patientReference: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      required: true,
      trim: true,
      default: 'Erode',
      index: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
      default: 'Sathyamangalam',
    },
    affectedStudentName: { type: String, trim: true },
    affectedStudentEmail: { type: String, trim: true },
    affectedStudentRegNo: { type: String, trim: true },
    relationshipToStudent: { type: String, trim: true },
    hospital: {
      type: String,
      trim: true,
      default: '',
    },
    hospitalLocation: {
      type: String,
      trim: true,
      default: '',
    },
    bloodGroup: {
      type: String,
      required: true,
      index: true,
    },
    urgency: { type: String, enum: ['emergency', 'within_24h', 'planned'], default: 'emergency', index: true },
    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    requiredBy: {
      type: Date,
      required: true,
    },
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPersonPhone: {
      type: String,
      required: true,
      trim: true,
    },
    briefContext: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    requesterRemark: { type: String, default: '', trim: true, maxlength: 500 },
    supportingEvidenceNote: {
      type: String,
      default: '',
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      required: true,
      index: true,
    },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    requesterName: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pending_verification',
        'verified',
        'broadcast',
        'coordinating',
        'fulfilled',
        'rejected',
        'cancelled',
        'expired',
      ],
      default: 'pending_verification',
      index: true,
    },
    assignedCoordinatorId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
    },
    assignedCoordinatorName: {
      type: String,
      default: '',
    },
    coordinatorNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    fulfillmentNotes: {
      type: String,
      default: '',
    },
    handoverHistory: [HandoverEntrySchema],
    broadcastHistory: [BroadcastEntrySchema],
    verifiedAt: {
      type: Date,
    },
    broadcastAt: {
      type: Date,
      index: true,
    },
    fulfilledAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    isDirectCoordinatorCreated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

EmergencyRequestSchema.index({ status: 1, bloodGroup: 1, district: 1, requiredBy: 1 });
EmergencyRequestSchema.index({ requesterId: 1, clientRequestKey: 1 }, { unique: true, partialFilterExpression: { clientRequestKey: { $type: 'string' } } });

export const EmergencyRequest = model<IEmergencyRequest>(
  'EmergencyRequest',
  EmergencyRequestSchema
);
