import type {
  Complaint,
  ComplaintCreate,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
} from '../types/complaint';
import { supabase } from './supabaseClient';

const rawBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
export const API_BASE = rawBase ? `${rawBase}/api` : '/api';

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

export async function getAuthHeaders(): Promise<Record<string, string>> {
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

export async function getJsonAuthHeaders(): Promise<Record<string, string>> {
  const auth = await getAuthHeaders();
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

  if (!res.ok) {
    let detail = defaultErrorMsg;
    try {
      const err = await res.json();
      if (err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch {
      // ignore
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
  if (rawBase) {
    return `${rawBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

export async function getAuthUserProfile(): Promise<AuthUserProfile> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/auth/me`, { headers });
  return handleResponse<AuthUserProfile>(res, 'Failed to verify authenticated authority profile.');
}

export async function getComplaints(filters?: {
  problem_type?: string;
  severity?: string;
  status?: string;
  department?: string;
  resolution_status?: string;
  limit?: number;
}): Promise<Complaint[]> {
  const params = new URLSearchParams();
  if (filters?.problem_type) params.append('problem_type', filters.problem_type);
  if (filters?.severity) params.append('severity', filters.severity);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.resolution_status) params.append('resolution_status', filters.resolution_status);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${API_BASE}/complaints${params.toString() ? '?' + params.toString() : ''}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  return handleResponse<Complaint[]>(res, 'Failed to retrieve complaints.');
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}`, { headers });
  return handleResponse<Complaint>(res, 'Complaint not found.');
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  resolution?: { resolution_image_url?: string; resolution_note?: string }
): Promise<Complaint> {
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
  return handleResponse<Complaint>(res, 'Failed to update complaint status.');
}

export async function uploadResolutionEvidence(
  file: File
): Promise<{ image_url: string; filename: string }> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/complaints/upload-resolution-evidence`, {
    method: 'POST',
    headers: {
      ...headers,
    },
    body: formData,
  });
  return handleResponse<{ image_url: string; filename: string }>(
    res,
    'Failed to upload resolution evidence.'
  );
}

export async function resolveComplaint(
  id: string,
  resolution_image_url: string,
  resolution_note?: string
): Promise<Complaint> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resolution_image_url,
      resolution_note: resolution_note || '',
    }),
  });
  return handleResponse<Complaint>(res, 'Failed to mark complaint as resolved.');
}

export async function confirmComplaintResolution(id: string): Promise<Complaint> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/confirm-resolution`, {
    method: 'POST',
    headers,
  });
  return handleResponse<Complaint>(res, 'Failed to confirm complaint resolution.');
}

export async function reopenComplaint(id: string, reason?: string): Promise<Complaint> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/reopen`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: reason || '' }),
  });
  return handleResponse<Complaint>(res, 'Failed to submit reopen request.');
}

export async function getComplaintHistory(id: string): Promise<any[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/history`, { headers });
  return handleResponse<any[]>(res, 'Failed to retrieve complaint history.');
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/statistics`, { headers });
  return handleResponse<DashboardStatistics>(res, 'Failed to load dashboard statistics.');
}

export async function getDashboardHeatmap(): Promise<HeatmapPoint[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/heatmap`, { headers });
  return handleResponse<HeatmapPoint[]>(res, 'Failed to load heatmap data.');
}

export async function getDashboardHotspots(): Promise<HotspotInfo[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/hotspots`, { headers });
  return handleResponse<HotspotInfo[]>(res, 'Failed to load hotspot data.');
}

export async function getDepartments(): Promise<Department[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/departments`, { headers });
  return handleResponse<Department[]>(res, 'Failed to fetch departments.');
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
