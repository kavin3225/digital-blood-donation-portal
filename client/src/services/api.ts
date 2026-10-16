const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(result.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = result.code;
    error.data = result;
    throw error;
  }

  return result;
}

export const api = {
  getIntegrationReadiness: () => request('/health'),
  // Auth
  registerWithPassword: (data: Record<string, any>) => request('/auth/register-email', { data }),
  loginWithGoogle: (credential: string) => request('/auth/google', { data: { credential } }),
  loginWithPassword: (data: { email: string; password: string }) => request('/auth/login-email', { data }),
  requestAdminLoginLink: (email: string) => request('/auth/admin-login/request', { data: { email } }),
  verifyAdminLoginLink: (data: { email: string; token: string }) => request('/auth/admin-login/verify', { data }),
  verifyEmailAddress: (data: { email: string; token: string }) => request('/auth/verify-email', { data }),
  requestPasswordReset: (email: string) => request('/auth/password-reset/request', { data: { email } }),
  resetPassword: (data: { email: string; token: string; password: string }) => request('/auth/password-reset/complete', { data }),
  getMe: () => request('/auth/me'),
  updateProfile: (data: any) => request('/auth/profile', { method: 'PUT', data }),
  updatePortalRole: (role: string) => request('/auth/role', { method: 'PUT', data: { role } }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Emergency Requests
  createRequest: (data: any) => request('/requests', { data }),
  getMyRequests: () => request('/requests/mine'),
  getActiveBroadcasts: (bloodGroup?: string, district?: string) => {
    const params = new URLSearchParams();
    if (bloodGroup && bloodGroup !== 'All') params.append('bloodGroup', bloodGroup);
    if (district && district !== 'All') params.append('district', district);
    const qs = params.toString();
    return request(`/requests/active${qs ? `?${qs}` : ''}`);
  },
  getRequestDetails: (id: string) => request(`/requests/${id}`),
  cancelRequest: (id: string, reason?: string) => request(`/requests/${id}/cancel`, { method: 'PUT', data: { reason } }),
  closeRequest: (id: string, status: 'fulfilled' | 'cancelled', note?: string) => request(`/requests/${id}/close`, { method: 'PUT', data: { status, note } }),

  // Donors
  submitDonorResponse: (data: { requestId: string; responseType: string; note?: string }) =>
    request('/donors/respond', { data }),
  getMyResponseHistory: () => request('/donors/history'),
  searchDonors: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request(`/donors/search?${query}`);
  },
  updateAvailabilityFreshness: (data: any) => request('/donors/freshness', { method: 'PUT', data }),

  // Coordinator
  getCoordinatorRequests: () => request('/coordinator/requests'),
  verifyRequest: (id: string, coordinatorNotes?: string) =>
    request(`/coordinator/requests/${id}/verify`, { method: 'PUT', data: { coordinatorNotes } }),
  broadcastRequest: (id: string) => request(`/coordinator/requests/${id}/broadcast`, { method: 'POST' }),
  rejectRequest: (id: string, rejectionReason: string) =>
    request(`/coordinator/requests/${id}/reject`, { method: 'PUT', data: { rejectionReason } }),
  handoverRequest: (id: string, newCoordinatorId: string, handoverNote: string) =>
    request(`/coordinator/requests/${id}/handover`, { method: 'POST', data: { newCoordinatorId, handoverNote } }),
  viewDonorContact: (responseId: string) => request(`/coordinator/donor-response/${responseId}/contact`),
  updateFollowUp: (responseId: string, data: any) =>
    request(`/coordinator/donor-response/${responseId}/follow-up`, { method: 'PUT', data }),
  fulfillRequest: (id: string, fulfillmentNotes?: string) =>
    request(`/coordinator/requests/${id}/fulfill`, { method: 'PUT', data: { fulfillmentNotes } }),

  // Admin
  getAllUsersAdmin: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const qs = query.toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  updateUserAdmin: (studentId: string, data: any) =>
    request(`/admin/users/${studentId}`, { method: 'PUT', data }),
  getAllRequestsAdmin: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const qs = query.toString();
    return request(`/admin/requests${qs ? `?${qs}` : ''}`);
  },
  getAllDonorResponsesAdmin: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.append(key, String(value)); });
    return request(`/admin/donor-responses${query.size ? `?${query}` : ''}`);
  },
  getAllNotificationsAdmin: () => request('/admin/notifications'),
  moderateRequestAdmin: (requestId: string, status: string, note = '') => request(`/admin/requests/${requestId}`, { method: 'PUT', data: { status, note } }),
  sendPortalAnnouncement: (title: string, body: string) => request('/admin/announcements', { data: { title, body } }),
  getSuspiciousRegistrations: () => request('/admin/suspicious-registrations'),
  resolveSuspiciousRegistration: (studentId: string, decision: 'approve' | 'block', reason?: string) =>
    request(`/admin/suspicious-registrations/${studentId}/resolve`, { method: 'PUT', data: { decision, reason } }),
  toggleAccountStatus: (studentId: string, status: 'active' | 'blocked', reason?: string) =>
    request(`/admin/accounts/${studentId}/status`, { method: 'PUT', data: { status, reason } }),
  getSyncEvents: () => request('/admin/sync-events'),
  retrySyncEvent: (eventId: string) => request(`/sync/retry/${eventId}`, { method: 'POST' }),
  getAuditLogs: (action?: string) => request(`/admin/audit-logs${action ? `?action=${action}` : ''}`),

  // Notifications
  subscribeDeviceToken: (subscription: PushSubscriptionJSON) => request('/notifications/subscribe', { data: { subscription, userAgent: navigator.userAgent } }),
  unsubscribeDeviceToken: (endpoint: string) => request('/notifications/unsubscribe', { data: { endpoint } }),
  getMyNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  sendTestNotification: () => request('/notifications/test', { method: 'POST' }),

  // Stats
  getCampusStats: () => request('/stats/overview'),
};
