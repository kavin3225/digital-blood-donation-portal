import { Schema, model, Document, Types } from 'mongoose';

export type DonorResponseType = 'i_can_help' | 'not_available' | 'withdrawn' | 'logistical_help';
export type CoordinatorFollowUpType = 'pending' | 'contacted' | 'matched_at_hospital' | 'donated' | 'not_selected';

export interface IDonorResponse extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  donorId: Types.ObjectId;
  donorEmail: string;
  donorName: string;
  donorBloodGroup: string;
  donorArea: string;
  responseType: DonorResponseType;
  note?: string;
  coordinatorFollowUp: CoordinatorFollowUpType;
  coordinatorNotes?: string;
  contactViewedByCoordinator: boolean;
  contactViewedAt?: Date;
  respondedAt: Date;
  updatedAt: Date;
}

const DonorResponseSchema = new Schema<IDonorResponse>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      required: true,
      index: true,
    },
    donorEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    donorName: {
      type: String,
      required: true,
    },
    donorBloodGroup: {
      type: String,
      required: true,
    },
    donorArea: {
      type: String,
      required: true,
    },
    responseType: {
      type: String,
      enum: ['i_can_help', 'not_available', 'withdrawn', 'logistical_help'],
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
    coordinatorFollowUp: {
      type: String,
      enum: ['pending', 'contacted', 'matched_at_hospital', 'donated', 'not_selected'],
      default: 'pending',
    },
    coordinatorNotes: {
      type: String,
      default: '',
    },
    contactViewedByCoordinator: {
      type: Boolean,
      default: false,
    },
    contactViewedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

// One response per donor per request
DonorResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

export const DonorResponse = model<IDonorResponse>('DonorResponse', DonorResponseSchema);
