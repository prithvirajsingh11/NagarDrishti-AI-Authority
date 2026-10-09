import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clientCivicStore } from '../services/fallbackStore';
import type { Complaint } from '../types/complaint';

let mockSupabaseData: any[] = [];

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockSupabaseData, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

describe('Civic Confirmation & Authority Resolution Sync Suite', () => {
  const baseComplaint: Complaint = {
    id: 'test-sync-101',
    report_id: 'ND-2026-99991',
    problem_type: 'pothole',
    confidence: 0.95,
    severity: 'HIGH',
    status: 'REPORTED',
    description: 'Deep road cavity causing severe hazard',
    image_url: 'https://example.com/pothole.jpg',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    latitude: 28.6139,
    longitude: 77.2090,
    location_name: 'Connaught Place, New Delhi',
    department: 'Municipal Roads (PWD)',
    assigned_to: null,
    assigned_at: null,
    assignment_history: [],
    internal_notes: [],
    status_update_requests: [],
    status_history: [],
    evidence: [],
    duplicate_of: null,
    priority_score: 50.0,
    priority_level: 'HIGH',
    citizen_verification_status: null,
  };

  beforeEach(() => {
    localStorage.clear();
    mockSupabaseData = [];
    clientCivicStore.setComplaints([JSON.parse(JSON.stringify(baseComplaint))]);
  });

  it('1. transitions status to IN_PROGRESS and ASSIGNED without loss', () => {
    // Starting as REPORTED, assignment transitions to ASSIGNED
    const assigned = clientCivicStore.assign('test-sync-101', {
      department: 'MCD Sanitation',
      assigned_to: 'Officer Verma',
      note: 'Urgent site survey',
    });
    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.assigned_to).toBe('Officer Verma');

    // Transition to IN_PROGRESS
    const inProg = clientCivicStore.updateStatus('test-sync-101', 'IN_PROGRESS');
    expect(inProg.status).toBe('IN_PROGRESS');

    const retrieved1 = clientCivicStore.getComplaintById('test-sync-101');
    expect(retrieved1?.status).toBe('IN_PROGRESS');
    expect(retrieved1?.assigned_to).toBe('Officer Verma');
  });

  it('2. authority marks complaint as RESOLVED with evidence image and pending citizen verification', () => {
    const resolutionImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const resolved = clientCivicStore.updateStatus('test-sync-101', 'RESOLVED', {
      resolution_image_url: resolutionImg,
      resolution_note: 'Pothole asphalt laid and rolled to level surface',
    });

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolution_image_url).toBe(resolutionImg);
    expect(resolved.resolution_note).toContain('Pothole asphalt laid');
    expect(resolved.citizen_verification_status).toBe('PENDING');
    expect(resolved.priority_score).toBe(0.0);
    expect(resolved.priority_level).toBe('LOW');
  });

  it('3. timestamp-safe syncWithSupabase does not wipe newer local status updates with stale remote state', async () => {
    // Authority marks as IN_PROGRESS locally
    clientCivicStore.updateStatus('test-sync-101', 'IN_PROGRESS');

    // Remote mock returns older record with status REPORTED
    const olderRemoteItem: any = {
      ...baseComplaint,
      status: 'REPORTED',
      updated_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours old
    };
    mockSupabaseData = [olderRemoteItem];

    // Trigger syncWithSupabase with older remote data
    await clientCivicStore.syncWithSupabase(true);

    const currentLocal = clientCivicStore.getComplaintById('test-sync-101')!;
    // Local IN_PROGRESS is preserved because local timestamp is newer
    expect(currentLocal.status).toBe('IN_PROGRESS');

    // Now simulate remote having newer update (e.g. verified or reopened remotely)
    const newerRemoteItem: any = {
      ...baseComplaint,
      id: 'test-sync-101',
      status: 'RESOLVED',
      citizen_verification_status: 'CONFIRMED',
      updated_at: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
    };
    mockSupabaseData = [newerRemoteItem];

    await clientCivicStore.syncWithSupabase(true);
    const updatedLocal = clientCivicStore.getComplaintById('test-sync-101')!;
    expect(updatedLocal.status).toBe('RESOLVED');
    expect(updatedLocal.citizen_verification_status).toBe('CONFIRMED');
  });

  it('4. citizen reopens complaint and priority escalates with the +30 points boost', () => {
    // First resolve the complaint
    clientCivicStore.updateStatus('test-sync-101', 'RESOLVED', {
      resolution_image_url: 'https://example.com/resolved.jpg',
      resolution_note: 'Resolved by crew',
    });

    const beforeReopen = clientCivicStore.getComplaintById('test-sync-101')!;
    expect(beforeReopen.status).toBe('RESOLVED');
    expect(beforeReopen.priority_score).toBe(0.0);

    // Citizen is dissatisfied with resolution image and reopens
    const reopened = clientCivicStore.reopenComplaint(
      'test-sync-101',
      'The pothole was not filled completely, debris remains on road.'
    );

    expect(reopened.status).toBe('REOPENED');
    expect(reopened.citizen_reopened).toBe(true);
    expect(reopened.citizen_verification_status).toBe('REOPENED');
    expect(reopened.reopen_reason).toBe('The pothole was not filled completely, debris remains on road.');
    // Prior resolution image remains preserved for before/after comparison
    expect(reopened.resolution_image_url).toBe('https://example.com/resolved.jpg');

    // Priority score escalated: +20 reopened defect + 10 reopened status = +30 boost + base severity
    expect(reopened.priority_score).toBeGreaterThanOrEqual(55);
    expect(reopened.priority_explanation).toContain('Citizen reopened defect (+20)');
    expect(reopened.priority_explanation).toContain('Reopened status (+10)');
  });

  it('5. citizen confirms resolution and status stays resolved with CONFIRMED state', () => {
    clientCivicStore.updateStatus('test-sync-101', 'RESOLVED', {
      resolution_image_url: 'https://example.com/resolved.jpg',
      resolution_note: 'Properly paved',
    });

    const confirmed = clientCivicStore.confirmResolution('test-sync-101');
    expect(confirmed.status).toBe('RESOLVED');
    expect(confirmed.citizen_verification_status).toBe('CONFIRMED');
    expect(confirmed.citizen_resolution_confirmed).toBe(true);
    expect(confirmed.priority_score).toBe(0.0);
  });
});
