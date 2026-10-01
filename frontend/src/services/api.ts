import type {
  Complaint,
  ComplaintCreate,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
  AgingAnalysis,
  DepartmentPerformance,
  CategoryTrend,
  InternalNote,
  StatusUpdateRequestItem,
  EscalationItem,
  GovernanceOutcomes,
  TimeBasedAnalytics,
} from '../types/complaint';
import { supabase } from './supabaseClient';
import { clientCivicStore, INITIAL_DEPARTMENTS } from './fallbackStore';

const envApiUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_BASE = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`)
  : '/api';

export const SERVER_ORIGIN = envApiUrl.endsWith('/api')
  ? envApiUrl.slice(0, -4)
  : envApiUrl;

export const CITIZEN_PORTAL_URL =
  import.meta.env.VITE_CITIZEN_PORTAL_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://nagar-drishit-ai.vercel.app');

export interface AuthUserProfile {
  id: string;
  email: string;
  role: 'authority' | 'citizen' | string;
  full_name?: string;
}

// Global callback for session expiry redirection
let onSessionExpiredCallback: (() => void) | null = null;

export function registerSessionExpiryHandler(handler: () => void) {
  onSessionExpiredCallback = handler;
}

export function triggerSessionExpired() {
  if (onSessionExpiredCallback) {
    onSessionExpiredCallback();
  }
}

export async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  if (explicitToken) {
    return { Authorization: `Bearer ${explicitToken}` };
  }
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Could not read auth session:', error.message);
    }

    if (session) {
      // Proactive refresh if within 60s of expiry
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at - now < 60) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session?.access_token) {
            return { Authorization: `Bearer ${refreshed.session.access_token}` };
          }
        } catch {
          // fallback to current session
        }
      }

      if (session.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase access token:', err);
  }
  return {};
}

export async function getJsonAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const auth = await getAuthHeaders(explicitToken);
  return {
    'Content-Type': 'application/json',
    ...auth,
  };
}

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (res.status === 401) {
    triggerSessionExpired();
    throw new Error('Your session has expired or is invalid. Please sign in again.');
  }

  if (res.status === 403) {
    let detail = 'Access denied. Authority privileges required.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    let detail = defaultErrorMsg;
    if (contentType.includes('application/json')) {
      try {
        const err = await res.json();
        if (err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {
        // ignore
      }
    } else {
      detail = `API returned non-JSON response (${res.status} ${contentType || 'unknown'})`;
    }
    throw new Error(detail);
  }

  return res.json();
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (SERVER_ORIGIN) {
    return `${SERVER_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

export async function getAuthUserProfile(explicitToken?: string): Promise<AuthUserProfile> {
  const headers = await getAuthHeaders(explicitToken);
  const res = await fetch(`${API_BASE}/auth/me`, { headers });
  return handleResponse<AuthUserProfile>(res, 'Failed to verify authenticated authority profile.');
}

export async function getComplaints(filters?: {
  problem_type?: string;
  severity?: string;
  status?: string;
  department?: string;
  resolution_status?: string;
  priority_level?: string;
  aging?: string;
  is_reopened?: boolean;
  limit?: number;
}): Promise<Complaint[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.problem_type) params.append('problem_type', filters.problem_type);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.resolution_status) params.append('resolution_status', filters.resolution_status);
    if (filters?.priority_level) params.append('priority_level', filters.priority_level);
    if (filters?.aging) params.append('aging', filters.aging);
    if (filters?.is_reopened !== undefined) params.append('is_reopened', String(filters.is_reopened));
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = `${API_BASE}/complaints${params.toString() ? '?' + params.toString() : ''}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, { headers });
    return await handleResponse<Complaint[]>(res, 'Failed to retrieve complaints.');
  } catch (err) {
    console.warn('Backend /complaints unavailable, falling back to civic store:', err);
    await clientCivicStore.syncWithSupabase();
    return clientCivicStore.getComplaints(filters);
  }
}

export async function getComplaintById(id: string): Promise<Complaint> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}`, { headers });
    return await handleResponse<Complaint>(res, 'Complaint not found.');
  } catch {
    const c = clientCivicStore.getComplaintById(id);
    if (c) return c;
    throw new Error('Complaint not found.');
  }
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  resolution?: { resolution_image_url?: string; resolution_note?: string }
): Promise<Complaint> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status,
        resolution_image_url: resolution?.resolution_image_url,
        resolution_note: resolution?.resolution_note,
      }),
    });
    return await handleResponse<Complaint>(res, 'Failed to update complaint status.');
  } catch {
    return clientCivicStore.updateStatus(id, status, resolution);
  }
}

export async function uploadResolutionEvidence(
  file: File
): Promise<{ image_url: string; filename: string }> {
  try {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/complaints/upload-resolution-evidence`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return await handleResponse<{ image_url: string; filename: string }>(
      res,
      'Failed to upload resolution evidence.'
    );
  } catch {
    const previewUrl = URL.createObjectURL(file);
    return {
      image_url: previewUrl,
      filename: file.name,
    };
  }
}

export async function resolveComplaint(
  id: string,
  resolution_image_url: string,
  resolution_note?: string
): Promise<Complaint> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        resolution_image_url,
        resolution_note: resolution_note || '',
      }),
    });
    return await handleResponse<Complaint>(res, 'Failed to mark complaint as resolved.');
  } catch {
    return clientCivicStore.updateStatus(id, 'RESOLVED', {
      resolution_image_url,
      resolution_note,
    });
  }
}

export async function confirmComplaintResolution(id: string): Promise<Complaint> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/confirm-resolution`, {
      method: 'POST',
      headers,
    });
    return await handleResponse<Complaint>(res, 'Failed to confirm complaint resolution.');
  } catch {
    const c = clientCivicStore.getComplaintById(id);
    if (!c) throw new Error('Complaint not found.');
    c.citizen_verification_status = 'CONFIRMED';
    c.citizen_resolution_confirmed = true;
    return c;
  }
}

export async function reopenComplaint(id: string, reason?: string): Promise<Complaint> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/reopen`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: reason || '' }),
    });
    return await handleResponse<Complaint>(res, 'Failed to submit reopen request.');
  } catch {
    return clientCivicStore.updateStatus(id, 'REOPENED', { resolution_note: reason });
  }
}

export async function getComplaintHistory(id: string): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/history`, { headers });
    return await handleResponse<any[]>(res, 'Failed to retrieve complaint history.');
  } catch {
    const c = clientCivicStore.getComplaintById(id);
    return c?.status_history || [];
  }
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/statistics`, { headers });
    return await handleResponse<DashboardStatistics>(res, 'Failed to load dashboard statistics.');
  } catch (err) {
    console.warn('Backend /dashboard/statistics unavailable, falling back to civic store:', err);
    await clientCivicStore.syncWithSupabase();
    return clientCivicStore.getStatistics();
  }
}

export async function getDashboardHeatmap(): Promise<HeatmapPoint[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/heatmap`, { headers });
    return await handleResponse<HeatmapPoint[]>(res, 'Failed to load heatmap data.');
  } catch {
    return clientCivicStore.getHeatmap();
  }
}

export async function getDashboardHotspots(): Promise<HotspotInfo[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/hotspots`, { headers });
    return await handleResponse<HotspotInfo[]>(res, 'Failed to load hotspot data.');
  } catch {
    return clientCivicStore.getHotspots();
  }
}

export async function getDepartments(): Promise<Department[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/departments`, { headers });
    return await handleResponse<Department[]>(res, 'Failed to fetch departments.');
  } catch {
    return INITIAL_DEPARTMENTS;
  }
}

export async function createComplaint(data: ComplaintCreate): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let detail = 'Failed to submit incident report.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function getPriorityActions(): Promise<Complaint[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/priority-actions`, { headers });
    return await handleResponse<Complaint[]>(res, 'Failed to fetch priority actions.');
  } catch {
    return clientCivicStore.getStatistics().priority_actions || [];
  }
}

export async function getAgingAnalysis(): Promise<AgingAnalysis> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/aging`, { headers });
    return await handleResponse<AgingAnalysis>(res, 'Failed to fetch aging analysis.');
  } catch {
    return clientCivicStore.getAgingAnalysis();
  }
}

export async function getDepartmentPerformance(): Promise<DepartmentPerformance[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/departments`, { headers });
    return await handleResponse<DepartmentPerformance[]>(res, 'Failed to fetch department performance.');
  } catch {
    return clientCivicStore.getDepartmentPerformance();
  }
}

export async function getCategoryTrends(): Promise<CategoryTrend[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/trends`, { headers });
    return await handleResponse<CategoryTrend[]>(res, 'Failed to fetch category trends.');
  } catch {
    return clientCivicStore.getCategoryTrends();
  }
}

export async function assignComplaint(
  id: string,
  payload: { department: string; assigned_to: string; note?: string }
): Promise<Complaint> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await handleResponse<Complaint>(res, 'Failed to assign complaint.');
  } catch {
    return clientCivicStore.assign(id, payload);
  }
}

export async function addInternalNote(
  id: string,
  note: string
): Promise<InternalNote> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/internal-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note }),
    });
    return await handleResponse<InternalNote>(res, 'Failed to add internal note.');
  } catch {
    return clientCivicStore.addNote(id, note);
  }
}

export async function getInternalNotes(id: string): Promise<InternalNote[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${id}/internal-notes`, { headers });
    return await handleResponse<InternalNote[]>(res, 'Failed to load internal notes.');
  } catch {
    const c = clientCivicStore.getComplaintById(id);
    return c?.internal_notes || [];
  }
}

export async function createStatusUpdateRequest(
  complaintId: string,
  citizenMessage?: string
): Promise<StatusUpdateRequestItem> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${complaintId}/status-request`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ citizen_message: citizenMessage }),
  });
  return handleResponse<StatusUpdateRequestItem>(res, 'Failed to submit status update request.');
}

export async function acknowledgeStatusUpdateRequest(
  complaintId: string,
  requestId: string,
  responseNote?: string
): Promise<StatusUpdateRequestItem> {
  try {
    const headers = await getJsonAuthHeaders();
    const res = await fetch(`${API_BASE}/complaints/${complaintId}/status-request/${requestId}/acknowledge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ response_note: responseNote }),
    });
    return await handleResponse<StatusUpdateRequestItem>(res, 'Failed to acknowledge status update request.');
  } catch {
    return clientCivicStore.acknowledgeStatusUpdateRequest(requestId, responseNote);
  }
}

export async function getEscalations(): Promise<EscalationItem[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/escalations`, { headers });
    return await handleResponse<EscalationItem[]>(res, 'Failed to load escalations.');
  } catch {
    return clientCivicStore.getEscalations();
  }
}

export async function getStatusUpdateRequests(state?: string): Promise<StatusUpdateRequestItem[]> {
  try {
    const headers = await getAuthHeaders();
    const params = state ? `?state=${encodeURIComponent(state)}` : '';
    const res = await fetch(`${API_BASE}/dashboard/status-requests${params}`, { headers });
    return await handleResponse<StatusUpdateRequestItem[]>(res, 'Failed to load status update requests.');
  } catch {
    const list: StatusUpdateRequestItem[] = [];
    clientCivicStore.getComplaints().forEach((c) => {
      (c.status_update_requests || []).forEach((r) => {
        if (!state || r.state === state) list.push(r);
      });
    });
    return list;
  }
}

export async function getGovernanceOutcomes(): Promise<GovernanceOutcomes> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/governance-outcomes`, { headers });
    return await handleResponse<GovernanceOutcomes>(res, 'Failed to load governance outcomes.');
  } catch {
    return clientCivicStore.getGovernanceOutcomes();
  }
}

export async function getTimeAnalytics(): Promise<TimeBasedAnalytics> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/dashboard/time-analytics`, { headers });
    return await handleResponse<TimeBasedAnalytics>(res, 'Failed to load time-based analytics.');
  } catch {
    return clientCivicStore.getTimeAnalytics();
  }
}

export async function downloadComplaintsCsv(filters?: {
  problem_type?: string;
  severity?: string;
  status?: string;
  department?: string;
  resolution_status?: string;
  priority_level?: string;
  aging?: string;
  is_reopened?: boolean;
}): Promise<void> {
  try {
    const params = new URLSearchParams();
    if (filters?.problem_type) params.append('problem_type', filters.problem_type);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.resolution_status) params.append('resolution_status', filters.resolution_status);
    if (filters?.priority_level) params.append('priority_level', filters.priority_level);
    if (filters?.aging) params.append('aging', filters.aging);
    if (filters?.is_reopened !== undefined) params.append('is_reopened', String(filters.is_reopened));

    const url = `${API_BASE}/complaints/export${params.toString() ? '?' + params.toString() : ''}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, { headers });

    if (res.status === 401) {
      triggerSessionExpired();
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error('Access denied. Authority privileges required to export complaint records.');
    }
    if (!res.ok) {
      throw new Error('Failed to export complaint data.');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = 'nagardrishti_complaints.csv';
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch {
    // Generate CSV on client
    const records = clientCivicStore.getComplaints(filters);
    const headerCols = ['Report ID', 'Problem Type', 'Severity', 'Location', 'Department', 'Status', 'Priority Level', 'Created At'];
    const rows = records.map((c) => [
      c.report_id,
      c.problem_type,
      c.severity,
      `"${(c.location_name || '').replace(/"/g, '""')}"`,
      `"${(c.department || '').replace(/"/g, '""')}"`,
      c.status,
      c.priority_level || 'MEDIUM',
      c.created_at,
    ]);
    const csvContent = [headerCols.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'nagardrishti_complaints.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}
