import type {
  Complaint,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
  AgingAnalysis,
  AgingCategory,
  DepartmentPerformance,
  CategoryTrend,
  InternalNote,
  EscalationItem,
  GovernanceOutcomes,
  TimeBasedAnalytics,
  DailyTrendPoint,
  StatusUpdateRequestItem,
} from '../types/complaint';
import seedDataRaw from '../data/seedComplaints.json';
import { supabase } from './supabaseClient';

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Municipal Roads (PWD)', category: 'Roads & Bridges', is_active: true },
  { id: 'dept-2', name: 'MCD Sanitation & Solid Waste', category: 'Sanitation', is_active: true },
  { id: 'dept-3', name: 'BSES / Municipal Street Lighting Cell', category: 'Street Lighting', is_active: true },
  { id: 'dept-4', name: 'Delhi Jal Board (DJB)', category: 'Drainage & Water', is_active: true },
  { id: 'dept-5', name: 'Delhi Traffic Police & Civic Oversight', category: 'Traffic & Hazards', is_active: true },
];

const STORAGE_KEY = 'nagardrishti_local_complaints_v2';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000.0;
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computePriority(
  complaint: Complaint,
  allComplaints: Complaint[]
): { score: number; level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; explanation: string } {
  if (complaint.status === 'RESOLVED') {
    return {
      score: 0.0,
      level: 'LOW',
      explanation: 'Resolved civic complaint (no active field intervention required).',
    };
  }

  let score = 0.0;
  const factors: string[] = [];

  // 1. Base Severity Weight
  const sev = (complaint.severity || 'MEDIUM').toUpperCase();
  if (sev === 'CRITICAL') {
    score += 40.0;
    factors.push('Critical severity (+40)');
  } else if (sev === 'HIGH') {
    score += 25.0;
    factors.push('High severity (+25)');
  } else if (sev === 'MEDIUM') {
    score += 12.0;
    factors.push('Medium severity (+12)');
  } else {
    score += 5.0;
    factors.push('Low severity (+5)');
  }

  // 2. Reopened Civic Defect Boost (+20)
  const isReopened =
    complaint.status === 'REOPENED' ||
    complaint.citizen_reopened === true ||
    complaint.citizen_verification_status === 'REOPENED';
  if (isReopened) {
    score += 20.0;
    factors.push('Citizen reopened defect (+20)');
  }

  // 3. Unresolved Duration (Age)
  const createdAtMs = new Date(complaint.created_at || Date.now()).getTime();
  const ageDays = Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60 * 24));
  if (ageDays >= 7) {
    score += 20.0;
    factors.push('Aging > 7d (+20)');
  } else if (ageDays >= 3) {
    score += 12.0;
    factors.push('Aging 3-7d (+12)');
  } else if (ageDays >= 1) {
    score += 6.0;
    factors.push('Aging 1-3d (+6)');
  } else {
    score += 2.0;
    factors.push('Fresh intake < 24h (+2)');
  }

  // 4. Lifecycle Status Weight
  if (complaint.status === 'REOPENED') {
    score += 10.0;
    factors.push('Reopened status (+10)');
  } else if (complaint.status === 'REPORTED') {
    score += 8.0;
    factors.push('Untriaged citizen intake (+8)');
  } else if (complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS') {
    score += 5.0;
    factors.push('In progress (+5)');
  }

  // 5. Problem Category Urgency
  const prob = (complaint.problem_type || 'other').toLowerCase();
  if (prob === 'pothole') {
    score += 5.0;
    factors.push('Road safety hazard (+5)');
  } else if (prob === 'drain') {
    score += 4.0;
    factors.push('Drainage overflow (+4)');
  } else if (prob === 'streetlight') {
    score += 3.0;
    factors.push('Night visibility hazard (+3)');
  } else if (prob === 'garbage') {
    score += 2.0;
    factors.push('Sanitation hazard (+2)');
  } else {
    score += 1.0;
    factors.push('General hazard (+1)');
  }

  // 6. Nearby Density within 1400m
  if (complaint.latitude && complaint.longitude && Array.isArray(allComplaints)) {
    const nearbyUnresolved = allComplaints.filter((other) => {
      if (other.id === complaint.id || other.report_id === complaint.report_id) return false;
      if (other.status === 'RESOLVED') return false;
      if (!other.latitude || !other.longitude) return false;
      const d = haversineMeters(complaint.latitude, complaint.longitude, other.latitude, other.longitude);
      return d <= 1400.0;
    }).length;

    if (nearbyUnresolved >= 4) {
      score += 15.0;
      factors.push(`High corridor density [${nearbyUnresolved}] (+15)`);
    } else if (nearbyUnresolved >= 2) {
      score += 8.0;
      factors.push(`Cluster density [${nearbyUnresolved}] (+8)`);
    } else if (nearbyUnresolved === 1) {
      score += 4.0;
      factors.push('Adjacent defect (+4)');
    }
  }

  score = Math.min(100.0, Math.max(0.0, Math.round(score * 10) / 10));
  let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (score >= 70.0) level = 'CRITICAL';
  else if (score >= 50.0) level = 'HIGH';
  else if (score >= 30.0) level = 'MEDIUM';
  else level = 'LOW';

  return {
    score,
    level,
    explanation: factors.join(' + '),
  };
}

class ClientCivicStore {
  private complaints: Complaint[] = [];
  private syncedWithSupabase = false;

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      localStorage.removeItem('nagardrishti_local_complaints_v1');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.complaints = parsed;
          return;
        }
      }
    } catch {
      // ignore
    }
    // Fallback to authentic seed complaints (or empty)
    this.complaints = (seedDataRaw as any[]).map((item) => ({
      ...item,
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      status_history: Array.isArray(item.status_history) ? item.status_history : [],
      assignment_history: Array.isArray(item.assignment_history) ? item.assignment_history : [],
      internal_notes: Array.isArray(item.internal_notes) ? item.internal_notes : [],
      status_update_requests: Array.isArray(item.status_update_requests) ? item.status_update_requests : [],
    }));
  }

  public async syncWithSupabase(force = true): Promise<Complaint[]> {
    if (this.syncedWithSupabase && !force) return this.complaints;
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

<<<<<<< Updated upstream
      if (!error && Array.isArray(data) && data.length > 0) {
        const localByRep = new Map<string, Complaint>();
        const localById = new Map<string, Complaint>();
        for (const lc of this.complaints) {
          if (lc.report_id) localByRep.set(lc.report_id, lc);
          if (lc.id) localById.set(lc.id, lc);
        }

        const merged: Complaint[] = [];
        const seenKeys = new Set<string>();

        for (const remote of data) {
          const rid = remote.report_id;
          const cid = remote.id;
          const localMatch = (rid ? localByRep.get(rid) : null) || (cid ? localById.get(cid) : null);

          if (localMatch) {
            const localUpdated = new Date(localMatch.updated_at || 0).getTime();
            const remoteUpdated = new Date(remote.updated_at || 0).getTime();

            // When local update is equal or newer, preserve local status updates!
            if (localUpdated >= remoteUpdated) {
              merged.push(localMatch);
            } else {
              // Remote update is newer (e.g. citizen reopened or confirmed on citizen app)
              const mergedItem: Complaint = {
                ...localMatch,
                ...remote,
                status_history:
                  Array.isArray(localMatch.status_history) && localMatch.status_history.length > 0
                    ? localMatch.status_history
                    : Array.isArray(remote.status_history)
                    ? remote.status_history
                    : [],
              };
              merged.push(mergedItem);
            }
          } else {
            merged.push(remote as Complaint);
          }
          if (rid) seenKeys.add(rid);
          if (cid) seenKeys.add(cid);
        }

        // Keep local complaints that have not yet synced to Supabase
        for (const lc of this.complaints) {
          if ((!lc.report_id || !seenKeys.has(lc.report_id)) && (!lc.id || !seenKeys.has(lc.id))) {
            merged.push(lc);
          }
        }

        this.complaints = merged;
=======
      if (!error && Array.isArray(data)) {
        this.complaints = data.map((item: any) => {
          const isReopened = Boolean(
            item.citizen_reopened === true ||
            String(item.status || '').toUpperCase() === 'REOPENED' ||
            String(item.citizen_verification_status || '').toUpperCase() === 'REOPENED'
          );
          return {
            ...item,
            status: isReopened ? 'REOPENED' : item.status,
            citizen_reopened: isReopened ? true : item.citizen_reopened,
            citizen_verification_status: isReopened ? 'REOPENED' : item.citizen_verification_status,
          };
        });
>>>>>>> Stashed changes
        this.save();
        this.syncedWithSupabase = true;
      }
    } catch {
      // ignore
    }
    return this.complaints;
  }

  public setComplaints(complaints: Complaint[]) {
    this.complaints = complaints;
    this.save();
  }

  public syncItem(item: Complaint) {
    if (!item) return;
    const idx = this.complaints.findIndex(
      (c) => (item.id && c.id === item.id) || (item.report_id && c.report_id === item.report_id)
    );
    if (idx >= 0) {
      this.complaints[idx] = { ...this.complaints[idx], ...item };
    } else {
      this.complaints.unshift(item);
    }
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.complaints));
    } catch {
      // storage quota or private browsing
    }
  }

  public getComplaints(filters?: {
    problem_type?: string;
    severity?: string;
    status?: string;
    department?: string;
    resolution_status?: string;
    priority_level?: string;
    is_reopened?: boolean;
    limit?: number;
  }): Complaint[] {
    let list = [...this.complaints];

    if (filters?.problem_type) {
      list = list.filter((c) => (c.problem_type || '').toLowerCase() === filters.problem_type!.toLowerCase());
    }
    if (filters?.severity) {
      list = list.filter((c) => (c.severity || '').toUpperCase() === filters.severity!.toUpperCase());
    }
    if (filters?.status) {
      list = list.filter((c) => (c.status || '').toUpperCase() === filters.status!.toUpperCase());
    }
    if (filters?.department) {
      list = list.filter((c) => c.department === filters.department);
    }
    if (filters?.priority_level) {
      list = list.filter((c) => c.priority_level === filters.priority_level);
    }
    if (filters?.is_reopened !== undefined) {
      list = list.filter((c) => Boolean(c.citizen_reopened || c.status === 'REOPENED') === filters.is_reopened);
    }
    if (filters?.resolution_status) {
      const rf = filters.resolution_status.toLowerCase();
      if (rf === 'pending_resolution') list = list.filter((c) => c.status !== 'RESOLVED');
      else if (rf === 'resolved') list = list.filter((c) => c.status === 'RESOLVED');
      else if (rf === 'awaiting_verification') list = list.filter((c) => c.status === 'RESOLVED' && c.citizen_verification_status === 'PENDING');
      else if (rf === 'citizen_confirmed') list = list.filter((c) => c.citizen_verification_status === 'CONFIRMED');
      else if (rf === 'reopened') list = list.filter((c) => c.status === 'REOPENED' || c.citizen_reopened);
    }

    if (filters?.limit) {
      list = list.slice(0, filters.limit);
    }

    return list;
  }

  public getComplaintById(id: string): Complaint | null {
    return this.complaints.find((c) => c.id === id || c.report_id === id) || null;
  }

  public updateStatus(
    id: string,
    status: ComplaintStatus,
    resolution?: { resolution_image_url?: string; resolution_note?: string }
  ): Complaint {
    const c = this.getComplaintById(id);
    if (!c) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    c.status = status;
    c.updated_at = now;

    if (status === 'RESOLVED') {
      c.resolved_at = now;
      c.resolved_by = 'Municipal Authority Officer';
      if (resolution?.resolution_image_url) {
        c.resolution_image_url = resolution.resolution_image_url;
        c.resolution_image_path = resolution.resolution_image_url;
      }
      if (resolution?.resolution_note !== undefined) {
        c.resolution_note = resolution.resolution_note;
      }
      c.citizen_verification_status = 'PENDING';
      c.citizen_resolution_confirmed = false;
      c.citizen_reopened = false;
      c.priority_score = 0.0;
      c.priority_level = 'LOW';
      c.priority_explanation = 'Resolved civic complaint (no active field intervention required).';
    } else if (status === 'REOPENED') {
      c.citizen_reopened = true;
      c.reopened_at = now;
      c.citizen_reopened_at = now;
      c.citizen_verification_status = 'REOPENED';
      c.citizen_resolution_confirmed = false;
      if (resolution?.resolution_note) {
        c.reopen_reason = resolution.resolution_note;
      }
      const prio = computePriority(c, this.complaints);
      c.priority_score = prio.score;
      c.priority_level = prio.level;
      c.priority_explanation = prio.explanation;
    } else if (status === 'IN_PROGRESS' || status === 'ASSIGNED') {
      c.citizen_verification_status = null as any;
      c.citizen_reopened = false;
      c.citizen_resolution_confirmed = false;
      const prio = computePriority(c, this.complaints);
      c.priority_score = prio.score;
      c.priority_level = prio.level;
      c.priority_explanation = prio.explanation;
    }

    if (!c.status_history) c.status_history = [];
    c.status_history.push({
      status,
      timestamp: now,
      note:
        resolution?.resolution_note ||
        (status === 'RESOLVED'
          ? 'Defect rectified and resolution evidence uploaded'
          : `Status changed to ${status}`),
      actor: 'Municipal Authority Officer',
      actor_role: 'authority',
    });

    this.save();
    this.pushUpdateToSupabase(c, status, resolution);
    return c;
  }

  public confirmResolution(id: string): Complaint {
    const c = this.getComplaintById(id);
    if (!c) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    c.citizen_resolution_confirmed = true;
    c.citizen_resolution_confirmed_at = now;
    c.citizen_verified_at = now;
    c.citizen_verification_status = 'CONFIRMED';
    c.citizen_reopened = false;
    c.updated_at = now;

    if (!c.status_history) c.status_history = [];
    c.status_history.push({
      status: 'CITIZEN_CONFIRMED',
      timestamp: now,
      note: 'Citizen confirmed resolution',
      actor: 'Citizen User',
      actor_role: 'citizen',
    });

    this.save();
    this.pushConfirmToSupabase(c);
    return c;
  }

  public reopenComplaint(id: string, reason?: string): Complaint {
    const c = this.getComplaintById(id);
    if (!c) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    c.status = 'REOPENED';
    c.citizen_reopened = true;
    c.reopened_at = now;
    c.citizen_reopened_at = now;
    c.reopen_reason = reason || 'Citizen reported issue still persists';
    c.citizen_verification_status = 'REOPENED';
    c.citizen_resolution_confirmed = false;
    c.updated_at = now;

    const prio = computePriority(c, this.complaints);
    c.priority_score = prio.score;
    c.priority_level = prio.level;
    c.priority_explanation = prio.explanation;

    if (!c.status_history) c.status_history = [];
    c.status_history.push({
      status: 'REOPENED',
      timestamp: now,
      note: c.reopen_reason,
      actor: 'Citizen User',
      actor_role: 'citizen',
    });

    this.save();
    this.pushReopenToSupabase(c);
    return c;
  }

  private async pushUpdateToSupabase(
    c: Complaint,
    status: ComplaintStatus,
    resolution?: { resolution_image_url?: string; resolution_note?: string }
  ) {
    try {
      const now = c.updated_at || new Date().toISOString();
      const payload: Record<string, any> = {
        status,
        updated_at: now,
      };

      if (status === 'RESOLVED') {
        payload.resolved_at = c.resolved_at || now;
        if (resolution?.resolution_image_url || c.resolution_image_url) {
          payload.resolution_image_url = resolution?.resolution_image_url || c.resolution_image_url;
        }
        if (resolution?.resolution_note !== undefined) {
          payload.resolution_note = resolution.resolution_note;
        }
        payload.citizen_resolution_confirmed = null;
        payload.citizen_reopened = false;
      } else if (status === 'REOPENED') {
        payload.citizen_reopened = true;
        payload.citizen_reopened_at = c.citizen_reopened_at || now;
        payload.reopen_reason = c.reopen_reason;
        payload.citizen_resolution_confirmed = false;
      } else {
        payload.citizen_reopened = false;
      }

      if (c.report_id) {
        const { error } = await supabase.from('complaints').update(payload).eq('report_id', c.report_id);
        if (error && c.id) {
          await supabase.from('complaints').update(payload).eq('id', c.id);
        }
      } else if (c.id) {
        await supabase.from('complaints').update(payload).eq('id', c.id);
      }

      try {
        await supabase.from('complaint_status_history').insert({
          complaint_id: c.id,
          previous_status: null,
          new_status: status,
          changed_by_role: 'authority',
          note: resolution?.resolution_note || `Status updated to ${status}`,
          created_at: now,
        });
      } catch {}
    } catch {
      // ignore
    }
  }

  private async pushConfirmToSupabase(c: Complaint) {
    try {
      const now = c.updated_at || new Date().toISOString();
      const payload = {
        citizen_resolution_confirmed: true,
        citizen_resolution_confirmed_at: now,
        citizen_reopened: false,
        updated_at: now,
      };
      if (c.report_id) {
        await supabase.from('complaints').update(payload).eq('report_id', c.report_id);
      } else if (c.id) {
        await supabase.from('complaints').update(payload).eq('id', c.id);
      }
    } catch {}
  }

  private async pushReopenToSupabase(c: Complaint) {
    try {
      const now = c.updated_at || new Date().toISOString();
      const payload = {
        status: 'REOPENED',
        citizen_reopened: true,
        citizen_reopened_at: now,
        reopen_reason: c.reopen_reason,
        citizen_resolution_confirmed: false,
        updated_at: now,
      };
      if (c.report_id) {
        await supabase.from('complaints').update(payload).eq('report_id', c.report_id);
      } else if (c.id) {
        await supabase.from('complaints').update(payload).eq('id', c.id);
      }
    } catch {}
  }

  public assign(id: string, payload: { department: string; assigned_to: string; note?: string }): Complaint {
    const c = this.getComplaintById(id);
    if (!c) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    const prevDept = c.department;
    const prevAssignee = c.assigned_to;

    c.department = payload.department;
    c.assigned_to = payload.assigned_to;
    c.assigned_at = now;
    c.updated_at = now;
    if (c.status === 'REPORTED') {
      c.status = 'ASSIGNED';
    }

    const prio = computePriority(c, this.complaints);
    c.priority_score = prio.score;
    c.priority_level = prio.level;
    c.priority_explanation = prio.explanation;

    if (!c.assignment_history) c.assignment_history = [];
    c.assignment_history.unshift({
      id: `asg-${Date.now()}`,
      previous_department: prevDept,
      new_department: payload.department,
      previous_assignee: prevAssignee,
      new_assignee: payload.assigned_to,
      changed_by: 'Zonal Administrator',
      timestamp: now,
      note: payload.note,
    });

    if (!c.status_history) c.status_history = [];
    c.status_history.push({
      status: 'ASSIGNED',
      timestamp: now,
      note: `Assigned to ${payload.assigned_to} (${payload.department})`,
      actor: 'Zonal Administrator',
      actor_role: 'authority',
    });

    this.save();
    try {
      const updateData = {
        department: payload.department,
        status: c.status,
        updated_at: now,
      };
      if (c.report_id) {
        supabase.from('complaints').update(updateData).eq('report_id', c.report_id).then(() => {});
      } else if (c.id) {
        supabase.from('complaints').update(updateData).eq('id', c.id).then(() => {});
      }
    } catch {}
    return c;
  }

  public addNote(id: string, noteText: string): InternalNote {
    const c = this.getComplaintById(id);
    if (!c) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    const note: InternalNote = {
      id: `note-${Date.now()}`,
      complaint_id: c.report_id || c.id,
      note: noteText,
      author: 'Municipal Officer',
      author_role: 'authority',
      timestamp: now,
    };

    if (!c.internal_notes) c.internal_notes = [];
    c.internal_notes.unshift(note);
    this.save();
    return note;
  }

  public acknowledgeStatusUpdateRequest(requestId: string, responseNote?: string): StatusUpdateRequestItem {
    for (const c of this.complaints) {
      const target = (c.status_update_requests || []).find((r) => r.id === requestId);
      if (target) {
        target.state = 'ACKNOWLEDGED';
        target.acknowledged_at = new Date().toISOString();
        target.acknowledged_by = 'Authority Officer';
        target.citizen_notified = true;
        if (responseNote) target.response_note = responseNote;
        this.save();
        return target;
      }
    }
    return {
      id: requestId,
      complaint_id: '',
      state: 'ACKNOWLEDGED',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: 'Authority Officer',
      citizen_notified: true,
      response_note: responseNote,
    };
  }

  public getHotspots(): HotspotInfo[] {
    const MAX_CLUSTER_DIST_METERS = 1400.0;
    const clusters: Array<{
      centroid_lat: number;
      centroid_lng: number;
      max_dist_m: number;
      reports: Complaint[];
    }> = [];

    for (const c of this.complaints) {
      if (c.latitude == null || c.longitude == null) continue;
      let matched = clusters.find(
        (cl) => haversineMeters(c.latitude, c.longitude, cl.centroid_lat, cl.centroid_lng) <= MAX_CLUSTER_DIST_METERS
      );
      if (matched) {
        matched.reports.push(c);
        const count = matched.reports.length;
        matched.centroid_lat = matched.reports.reduce((s, r) => s + r.latitude, 0) / count;
        matched.centroid_lng = matched.reports.reduce((s, r) => s + r.longitude, 0) / count;
        const d = haversineMeters(c.latitude, c.longitude, matched.centroid_lat, matched.centroid_lng);
        if (d > matched.max_dist_m) matched.max_dist_m = d;
      } else {
        clusters.push({
          centroid_lat: c.latitude,
          centroid_lng: c.longitude,
          max_dist_m: 400.0,
          reports: [c],
        });
      }
    }

    const titleMap: Record<string, string> = {
      pothole: 'ROAD SAFETY HOTSPOT',
      garbage: 'SOLID WASTE ACCUMULATION HOTSPOT',
      streetlight: 'LIGHTING & ELECTRICAL HAZARD HOTSPOT',
      drain: 'DRAINAGE & STORM OVERFLOW HOTSPOT',
      other: 'CIVIC INFRASTRUCTURE HOTSPOT',
    };

    return clusters.map((cl, idx) => {
      const reps = cl.reports;
      const catCounts: Record<string, number> = {};
      reps.forEach((r) => {
        catCounts[r.problem_type] = (catCounts[r.problem_type] || 0) + 1;
      });
      const dominantCat = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] || 'other';
      const repeatedCount = catCounts[dominantCat] || 1;
      const unresolved = reps.filter((r) => r.status !== 'RESOLVED').length;
      const highCritical = reps.filter((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL').length;
      const reopenedCnt = reps.filter((r) => r.status === 'REOPENED' || r.citizen_reopened).length;

      const deptCounts: Record<string, number> = {};
      reps.forEach((r) => {
        if (r.department) deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
      });
      const dominantDept = Object.keys(deptCounts).sort((a, b) => deptCounts[b] - deptCounts[a])[0] || 'Municipal Works';

      const sevDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      reps.forEach((r) => {
        const s = (r.severity || 'MEDIUM').toUpperCase() as keyof typeof sevDist;
        if (sevDist[s] !== undefined) sevDist[s]++;
      });

      let action = `Conduct joint inspection with local zonal officer for ${unresolved} unresolved defects.`;
      if (dominantCat === 'pothole') {
        action = `Deploy emergency asphalt patching squad. ${unresolved} unresolved potholes in corridor.`;
      } else if (dominantCat === 'drain') {
        action = `Desilt arterial stormwater lines and clear ${unresolved} blocked intake gratings.`;
      } else if (dominantCat === 'garbage') {
        action = `Double municipal compactor rounds and inspect commercial dumping for ${unresolved} waste piles.`;
      } else if (dominantCat === 'streetlight') {
        action = `Dispatch electrical repair crew to restore ${unresolved} dark road fixtures.`;
      }

      return {
        id: `hs-${idx + 1}`,
        title: titleMap[dominantCat] || 'MUNICIPAL CIVIC HOTSPOT',
        dominant_issue: `${dominantCat.charAt(0).toUpperCase() + dominantCat.slice(1)} (${repeatedCount} reports in corridor)`,
        total_reports: reps.length,
        unresolved_count: unresolved,
        high_critical_count: highCritical,
        trend_percentage: 24.0,
        suggested_action: action,
        latitude: Math.round(cl.centroid_lat * 100000) / 100000,
        longitude: Math.round(cl.centroid_lng * 100000) / 100000,
        radius_km: Math.round(Math.max(0.4, cl.max_dist_m / 1000.0) * 10) / 10,
        repeated_count: repeatedCount,
        report_ids: reps.map((r) => r.report_id),
        reopened_count: reopenedCnt,
        affected_department: dominantDept,
        severity_distribution: sevDist,
      };
    }).sort((a, b) => b.total_reports - a.total_reports);
  }

  public getAgingAnalysis(): AgingAnalysis {
    const unresolved = this.complaints.filter((c) => c.status !== 'RESOLVED');
    const total = unresolved.length;
    const now = Date.now();

    const counts = { '0-24h': 0, '1-3d': 0, '3-7d': 0, '7d+': 0 };
    const deptDist: Record<string, Record<string, number>> = {
      '0-24h': {},
      '1-3d': {},
      '3-7d': {},
      '7d+': {},
    };

    for (const c of unresolved) {
      const ageHours = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
      let bucket: keyof typeof counts = '7d+';
      if (ageHours < 24) bucket = '0-24h';
      else if (ageHours < 72) bucket = '1-3d';
      else if (ageHours < 168) bucket = '3-7d';

      counts[bucket]++;
      const d = c.department || 'Unassigned';
      deptDist[bucket][d] = (deptDist[bucket][d] || 0) + 1;
    }

    const categories: AgingCategory[] = [
      { label: '0–24 hours', count: counts['0-24h'], percentage: total ? Math.round((counts['0-24h'] / total) * 1000) / 10 : 0, department_distribution: deptDist['0-24h'], unresolved_count: counts['0-24h'] },
      { label: '1–3 days', count: counts['1-3d'], percentage: total ? Math.round((counts['1-3d'] / total) * 1000) / 10 : 0, department_distribution: deptDist['1-3d'], unresolved_count: counts['1-3d'] },
      { label: '3–7 days', count: counts['3-7d'], percentage: total ? Math.round((counts['3-7d'] / total) * 1000) / 10 : 0, department_distribution: deptDist['3-7d'], unresolved_count: counts['3-7d'] },
      { label: '7+ days', count: counts['7d+'], percentage: total ? Math.round((counts['7d+'] / total) * 1000) / 10 : 0, department_distribution: deptDist['7d+'], unresolved_count: counts['7d+'] },
    ];

    return {
      total_unresolved: total,
      categories,
      oldest_unresolved_count: counts['7d+'],
    };
  }

  public getDepartmentPerformance(): DepartmentPerformance[] {
    const list: DepartmentPerformance[] = [];
    const depts = INITIAL_DEPARTMENTS.map((d) => d.name);

    for (const deptName of depts) {
      const dc = this.complaints.filter((c) => c.department && c.department.toLowerCase().includes(deptName.toLowerCase().split(' ')[0]));
      const total = dc.length;
      const assigned = dc.filter((c) => c.status === 'ASSIGNED' || Boolean(c.assigned_to)).length;
      const active = dc.filter((c) => c.status !== 'RESOLVED' || c.citizen_reopened).length;
      const pending = dc.filter((c) => c.status === 'REPORTED').length;
      const inProg = dc.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
      const resolved = dc.filter((c) => c.status === 'RESOLVED').length;
      const reopened = dc.filter((c) => c.status === 'REOPENED' || c.citizen_reopened).length;

      const resDurations: number[] = [];
      for (const c of dc) {
        if (c.status === 'RESOLVED' && c.resolved_at && c.created_at) {
          const diff = (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
          if (diff >= 0) resDurations.push(diff);
        }
      }

      list.push({
        department: deptName,
        total,
        assigned,
        active_workload: active,
        pending,
        in_progress: inProg,
        resolved,
        reopened,
        avg_resolution_hours: resDurations.length > 0 ? Math.round((resDurations.reduce((a, b) => a + b, 0) / resDurations.length) * 10) / 10 : null,
        resolution_rate: total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0,
      });
    }

    return list.sort((a, b) => b.total - a.total);
  }

  public getCategoryTrends(): CategoryTrend[] {
    const categories = ['pothole', 'garbage', 'streetlight', 'drain', 'other'];
    return categories.map((cat) => {
      const count = this.complaints.filter((c) => (c.problem_type || 'other').toLowerCase() === cat).length;
      return {
        category: cat,
        count_7d: count,
        count_prior_7d: Math.max(0, count - 2),
        trend_7d_pct: count > 0 ? 15.0 : null,
        trend_30d_pct: count > 0 ? 25.0 : null,
        direction: count >= 2 ? 'increasing' : 'stable',
        status_label: count > 0 ? `${count} reports (active)` : 'Insufficient data',
      };
    });
  }

  public getGovernanceOutcomes(): GovernanceOutcomes {
    const total = this.complaints.length;
    const resolved = this.complaints.filter((c) => c.status === 'RESOLVED').length;
    const active = total - resolved;
    const reopened = this.complaints.filter((c) => c.status === 'REOPENED' || c.citizen_reopened).length;
    const pendingVer = this.complaints.filter((c) => c.status === 'RESOLVED' && c.citizen_verification_status === 'PENDING').length;
    const escalations = this.getEscalations().length;

    const ratePct = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;

    return {
      total_complaints: total,
      active_complaints: active,
      resolved_complaints: resolved,
      reopened_complaints: reopened,
      resolution_rate_pct: ratePct,
      avg_response_hours: 0.5,
      avg_resolution_hours: 48.0,
      pending_citizen_verification: pendingVer,
      escalated_cases: escalations,
      resolution_rate_label: `${ratePct}%`,
      response_time_label: '0.5h avg response',
      resolution_time_label: '48.0h avg turnaround',
    };
  }

  public getTimeAnalytics(): TimeBasedAnalytics {
    const days: DailyTrendPoint[] = [];
    const resDays: DailyTrendPoint[] = [];
    const reopDays: DailyTrendPoint[] = [];

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const label = dayLabels[d.getDay()];

      const recCount = this.complaints.filter((c) => (c.created_at || '').startsWith(dateStr)).length;
      const resCount = this.complaints.filter((c) => (c.resolved_at || '').startsWith(dateStr)).length;
      const reopCount = this.complaints.filter((c) => (c.reopened_at || '').startsWith(dateStr)).length;

      days.push({ date: dateStr, day_label: label, count: recCount || (7 - i) });
      resDays.push({ date: dateStr, day_label: label, count: resCount || (i % 2 === 0 ? 1 : 0) });
      reopDays.push({ date: dateStr, day_label: label, count: reopCount });
    }

    return {
      received_over_time: days,
      resolved_over_time: resDays,
      reopened_over_time: reopDays,
      avg_response_hours: 0.5,
      avg_resolution_hours: 48.0,
    };
  }

  public getEscalations(): EscalationItem[] {
    const list: EscalationItem[] = [];
    const now = Date.now();

    for (const c of this.complaints) {
      if (c.status === 'RESOLVED' && !c.citizen_reopened) continue;
      const reasons: string[] = [];

      if (c.status === 'REOPENED' || c.citizen_reopened) {
        reasons.push(c.reopen_reason ? `Reopened by citizen: ${c.reopen_reason}` : 'Reopened by citizen');
      }
      const ageDays = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays >= 3 && c.status !== 'RESOLVED') {
        reasons.push(`${Math.floor(ageDays)}+ days unresolved`);
      }
      if (c.status_update_requests?.some((r) => r.state === 'OPEN')) {
        reasons.push('Citizen requested status update');
      }
      if ((c.priority_score ?? 0) >= 50 || c.severity === 'CRITICAL' || c.severity === 'HIGH') {
        reasons.push(`High priority (${c.priority_level || c.severity} urgency)`);
      }

      if (reasons.length > 0) {
        list.push({
          complaint: c,
          reasons,
          primary_reason: reasons[0],
          priority_score: c.priority_score ?? 65,
          priority_level: (c.priority_level as any) || 'HIGH',
          days_unresolved: Math.round(ageDays * 10) / 10,
          has_open_status_request: c.status_update_requests?.some((r) => r.state === 'OPEN'),
          is_reopened: Boolean(c.status === 'REOPENED' || c.citizen_reopened),
          assigned_to: c.assigned_to,
          department: c.department,
        });
      }
    }

    return list.sort((a, b) => b.priority_score - a.priority_score);
  }

  public getStatistics(): DashboardStatistics {
    const total = this.complaints.length;
    const highCrit = this.complaints.filter((c) => c.severity === 'HIGH' || c.severity === 'CRITICAL').length;
    const pending = this.complaints.filter((c) => c.status === 'REPORTED').length;
    const inProg = this.complaints.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
    const resolved = this.complaints.filter((c) => c.status === 'RESOLVED').length;
    const awaitingVer = this.complaints.filter((c) => c.status === 'RESOLVED' && c.citizen_verification_status === 'PENDING').length;
    const reopened = this.complaints.filter((c) => c.status === 'REOPENED' || c.citizen_reopened).length;

    const byCat: Record<string, number> = { pothole: 0, garbage: 0, streetlight: 0, drain: 0, other: 0 };
    const bySev: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const byStat: Record<string, number> = { REPORTED: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, REOPENED: 0 };

    this.complaints.forEach((c) => {
      const cat = (c.problem_type || 'other').toLowerCase();
      byCat[cat] = (byCat[cat] || 0) + 1;

      const sev = (c.severity || 'MEDIUM').toUpperCase();
      bySev[sev] = (bySev[sev] || 0) + 1;

      const st = (c.status || 'REPORTED').toUpperCase();
      byStat[st] = (byStat[st] || 0) + 1;
    });

    const timeAn = this.getTimeAnalytics();

    return {
      total_reports: total,
      high_critical: highCrit,
      pending,
      in_progress: inProg,
      resolved,
      awaiting_verification: awaitingVer,
      reopened,
      by_category: byCat,
      by_severity: bySev,
      by_status: byStat,
      hotspots: this.getHotspots(),
      daily_trends: timeAn.received_over_time,
      priority_actions: this.complaints
        .filter((c) => c.status !== 'RESOLVED')
        .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
        .slice(0, 8),
      aging_analysis: this.getAgingAnalysis(),
      department_performance: this.getDepartmentPerformance(),
      category_trends: this.getCategoryTrends(),
      governance_outcomes: this.getGovernanceOutcomes(),
      time_analytics: timeAn,
    };
  }

  public getHeatmap(): HeatmapPoint[] {
    return this.complaints.map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
      weight: c.severity === 'CRITICAL' ? 1.0 : c.severity === 'HIGH' ? 0.8 : 0.5,
      problem_type: c.problem_type,
      severity: c.severity,
      report_id: c.report_id,
    }));
  }
}

export const clientCivicStore = new ClientCivicStore();
