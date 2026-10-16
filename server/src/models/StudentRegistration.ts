import { Schema, model, Document, Types } from 'mongoose';

export type RoleType = 'Donor' | 'Requester' | 'Both';
export type SystemRoleType = 'student' | 'coordinator' | 'admin';
export type BloodGroupType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
export type WillingnessType = 'Willing' | 'Temporarily Unavailable' | 'Not Willing';
export type SyncStatusType = 'synced' | 'pending_review' | 'blocked' | 'conflict_flagged';
export type AccountStatusType = 'active' | 'pending_review' | 'blocked';
export type NonDonationHelpType = 'None' | 'Transport' | 'Desk Coordination' | 'Logistics';
export type UserType = 'Student' | 'Staff';

export interface IStudentRegistration extends Document {
  _id: Types.ObjectId;
  googleEmail: string;
  collegeEmail?: string;
  googleSubjectId?: string;
  passwordHash?: string;
  emailVerifiedAt?: Date;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  adminLoginTokenHash?: string;
  adminLoginTokenExpiresAt?: Date;
  adminProvisionedAt?: Date;
  adminProvisionedBy?: Types.ObjectId;
  coordinatorProvisionedAt?: Date;
  coordinatorProvisionedBy?: Types.ObjectId;
  name: string;
  userType: UserType;
  registerNumber: string;
  department: string;
  year: string;
  selectedRole: RoleType; // Role preference
  portalRole: RoleType;   // Authenticated portal role preference
  systemRole: SystemRoleType; // Strictly controlled backend role (student, coordinator, admin)
  bloodGroup: BloodGroupType;
  mobile: string;
  district: string;
  residenceType: 'Hostel' | 'Day Scholar';
  approximateArea: string;
  currentWillingness: WillingnessType;
  isProfileComplete: boolean;
  lastDonationDate?: Date;
  consentStored: boolean;
  consentEmergencyCommunications: boolean;
  shareContactWithRequesters: boolean;
  syncStatus: SyncStatusType;
  suspiciousReason?: string;
  status: AccountStatusType;
  availabilityLastConfirmedAt: Date;
  nonDonationHelp: NonDonationHelpType;
  notificationPreferences: {
    emergencyAlerts: boolean;
    donorAlerts: boolean;
    generalAlerts: boolean;
  };
  lastSyncedAt: Date;
  portalEditedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentRegistrationSchema = new Schema<IStudentRegistration>(
  {
    googleEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    collegeEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    googleSubjectId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    passwordHash: { type: String, select: false, default: undefined },
    emailVerifiedAt: { type: Date, select: false, default: undefined },
    emailVerificationTokenHash: { type: String, select: false, default: undefined },
    emailVerificationExpiresAt: { type: Date, select: false, default: undefined },
    passwordResetTokenHash: { type: String, select: false, default: undefined },
    passwordResetExpiresAt: { type: Date, select: false, default: undefined },
    adminLoginTokenHash: { type: String, select: false, default: undefined },
    adminLoginTokenExpiresAt: { type: Date, select: false, default: undefined },
    adminProvisionedAt: { type: Date, default: undefined },
    adminProvisionedBy: { type: Schema.Types.ObjectId, ref: 'StudentRegistration', default: undefined },
    coordinatorProvisionedAt: { type: Date, default: undefined },
    coordinatorProvisionedBy: { type: Schema.Types.ObjectId, ref: 'StudentRegistration', default: undefined },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userType: {
      type: String,
      enum: ['Student', 'Staff'],
      default: 'Student',
      index: true,
    },
    registerNumber: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: String,
      default: 'III Year',
      trim: true,
    },
    selectedRole: {
      type: String,
      enum: ['Donor', 'Requester', 'Both'],
      required: true,
      default: 'Donor',
    },
    portalRole: {
      type: String,
      enum: ['Donor', 'Requester', 'Both'],
      required: true,
      default: 'Donor',
    },
    systemRole: {
      type: String,
      enum: ['student', 'coordinator', 'admin'],
      default: 'student',
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
      index: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    district: {
      type: String,
      default: 'Erode',
      trim: true,
      index: true,
    },
    residenceType: {
      type: String,
      enum: ['Hostel', 'Day Scholar'],
      default: 'Hostel',
    },
    approximateArea: {
      type: String,
      default: 'Campus Hostels',
      trim: true,
      index: true,
    },
    currentWillingness: {
      type: String,
      enum: ['Willing', 'Temporarily Unavailable', 'Not Willing'],
      default: 'Willing',
      index: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastDonationDate: {
      type: Date,
    },
    consentStored: {
      type: Boolean,
      default: true,
    },
    consentEmergencyCommunications: {
      type: Boolean,
      default: true,
    },
    shareContactWithRequesters: { type: Boolean, default: false },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending_review', 'blocked', 'conflict_flagged'],
      default: 'synced',
      index: true,
    },
    suspiciousReason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'pending_review', 'blocked'],
      default: 'active',
      index: true,
    },
    availabilityLastConfirmedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    nonDonationHelp: {
      type: String,
      enum: ['None', 'Transport', 'Desk Coordination', 'Logistics'],
      default: 'None',
    },
    notificationPreferences: {
      emergencyAlerts: { type: Boolean, default: true },
      donorAlerts: { type: Boolean, default: true },
      generalAlerts: { type: Boolean, default: true },
    },
    lastSyncedAt: {
      type: Date,
      default: () => new Date(),
    },
    portalEditedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Checks whether all required profile fields are completed
 */
export const checkProfileCompletion = (user: any): boolean => {
  if (!user) return false;
  const name = (user.name || '').trim();
  const userType = user.userType || 'Student';
  const dept = (user.department || '').trim();
  const blood = (user.bloodGroup || '').trim();
  const mobile = (user.mobile || '').trim();
  const district = (user.district || '').trim();
  const area = (user.approximateArea || '').trim();
  const role = user.portalRole || user.selectedRole;

  if (name.length < 2) return false;
  if (!['Student', 'Staff'].includes(userType)) return false;
  if (dept.length < 2) return false;
  if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].includes(blood)) return false;
  if (mobile.replace(/\D/g, '').length < 10) return false;
  if (district.length < 2) return false;
  if (area.length < 2) return false;
  if (!['Hostel', 'Day Scholar'].includes(user.residenceType)) return false;
  if (!['Donor', 'Requester', 'Both'].includes(role)) return false;

  return true;
};

// Compound index for donor search optimization
StudentRegistrationSchema.index({
  status: 1,
  currentWillingness: 1,
  bloodGroup: 1,
  district: 1,
  approximateArea: 1,
});

export const StudentRegistration = model<IStudentRegistration>(
  'StudentRegistration',
  StudentRegistrationSchema
);
