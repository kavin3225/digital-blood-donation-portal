export type RoleType = 'Donor' | 'Requester' | 'Both';
export type SystemRoleType = 'student' | 'coordinator' | 'admin';
export type BloodGroupType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
export type WillingnessType = 'Willing' | 'Temporarily Unavailable' | 'Not Willing';
export type NonDonationHelpType = 'None' | 'Transport' | 'Desk Coordination' | 'Logistics';
export type UserType = 'Student';

export interface UserProfile {
  id: string;
  _id?: string;
  email: string;
  googleEmail?: string;
  collegeEmail?: string;
  name: string;
  userType?: UserType;
  registerNumber: string;
  department: string;
  year: string;
  selectedRole: RoleType;
  portalRole: RoleType;
  systemRole: SystemRoleType;
  bloodGroup: BloodGroupType;
  mobile?: string;
  district?: string;
  residenceType?: 'Hostel' | 'Day Scholar';
  approximateArea: string;
  currentWillingness: WillingnessType;
  isProfileComplete?: boolean;
  consentEmergencyCommunications?: boolean;
  shareContactWithRequesters?: boolean;
  lastDonationDate?: string;
  availabilityLastConfirmedAt: string;
  nonDonationHelp?: NonDonationHelpType;
  notificationPreferences?: {
    emergencyAlerts: boolean;
    donorAlerts: boolean;
    generalAlerts: boolean;
  };
  status?: 'active' | 'pending_review' | 'blocked';
}

export type RequestStatus =
  | 'pending_verification'
  | 'verified'
  | 'broadcast'
  | 'coordinating'
  | 'fulfilled'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface HandoverRecord {
  coordinatorId: string;
  coordinatorName: string;
  timestamp: string;
  handoverNote: string;
}

export interface EmergencyRequest {
  _id: string;
  requestId: string;
  requestTarget?: 'Self' | 'College Friend';
  patientEmail?: string;
  patientName?: string;
  patientReference: string;
  district?: string;
  area?: string;
  affectedStudentName?: string;
  affectedStudentEmail?: string;
  affectedStudentRegNo?: string;
  relationshipToStudent?: string;
  hospital?: string;
  hospitalLocation?: string;
  bloodGroup: BloodGroupType;
  urgency?: 'emergency' | 'within_24h' | 'planned';
  unitsRequired: number;
  requiredBy: string;
  contactPersonName: string;
  contactPersonPhone: string;
  briefContext: string;
  requesterRemark?: string;
  supportingEvidenceNote?: string;
  requesterId: string | any;
  requesterEmail: string;
  requesterName?: string;
  status: RequestStatus;
  assignedCoordinatorId?: string;
  assignedCoordinatorName?: string;
  coordinatorNotes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  fulfillmentNotes?: string;
  handoverHistory?: HandoverRecord[];
  verifiedAt?: string;
  broadcastAt?: string;
  fulfilledAt?: string;
  closedAt?: string;
  isDirectCoordinatorCreated?: boolean;
  donorResponseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type DonorResponseType = 'i_can_help' | 'not_available' | 'withdrawn' | 'logistical_help';
export type CoordinatorFollowUpType = 'pending' | 'contacted' | 'matched_at_hospital' | 'donated' | 'not_selected';

export interface DonorResponseItem {
  _id: string;
  requestId: string | EmergencyRequest;
  donorId: string;
  donorEmail: string;
  donorName: string;
  donorBloodGroup: string;
  donorArea: string;
  responseType: DonorResponseType;
  note?: string;
  coordinatorFollowUp: CoordinatorFollowUpType;
  coordinatorNotes?: string;
  contactViewedByCoordinator?: boolean;
  contactViewedAt?: string;
  respondedAt: string;
}

export interface SanitizedDonor {
  id: string;
  name: string;
  userType?: UserType;
  department: string;
  year: string;
  bloodGroup: BloodGroupType;
  district?: string;
  residenceType: 'Hostel' | 'Day Scholar';
  approximateArea: string;
  currentWillingness: WillingnessType;
  nonDonationHelp: NonDonationHelpType;
  disclaimer: string;
  contactPolicy: string;
}

export interface AdminUserItem {
  _id: string;
  id: string;
  name: string;
  googleEmail: string;
  collegeEmail: string;
  userType: UserType;
  registerNumber: string;
  department: string;
  year: string;
  bloodGroup: BloodGroupType;
  mobile: string;
  district: string;
  approximateArea: string;
  portalRole: RoleType;
  systemRole: SystemRoleType;
  isProfileComplete: boolean;
  status: 'active' | 'blocked' | 'pending_review';
  currentWillingness: WillingnessType;
  availabilityLastConfirmedAt?: string;
  consentEmergencyCommunications?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  channel: 'in_app' | 'web_push' | 'email';
  deliveryStatus: 'queued' | 'provider_accepted' | 'failed' | 'acknowledged';
  read: boolean;
  requestId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface FormSyncEventItem {
  _id: string;
  eventId: string;
  submissionTimestamp: string;
  receivedAt: string;
  payload: Record<string, any>;
  status: 'success' | 'failed' | 'conflict_flagged' | 'replay_rejected';
  errorMessage?: string;
  retryCount: number;
}

export interface AuditLogItem {
  _id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface CampusStats {
  totalDonors: number;
  totalFulfilled: number;
  activeBroadcasts: number;
  bloodGroups: Array<{ group: string; count: number }>;
  areas: Array<{ area: string; count: number }>;
  privacyNote: string;
}
