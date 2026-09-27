import React, { useState } from 'react';
import {
  X,
  MapPin,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types/complaint';
import { ProblemIcon, getProblemLabel } from './ProblemIcon';
import { resolveImageUrl } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';

interface ComplaintDrawerProps {
  complaint: Complaint | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: ComplaintStatus) => Promise<void>;
  onSelectDuplicate?: (duplicateReportId: string) => void;
}

export const ComplaintDrawer: React.FC<ComplaintDrawerProps> = ({
  complaint,
  onClose,
  onUpdateStatus,
  onSelectDuplicate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!complaint) return null;

  const handleStatusChange = async (targetStatus: ComplaintStatus) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await onUpdateStatus(complaint.id, targetStatus);
    } catch (err: any) {
      setErrorMsg(err.message || 'Status transition failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const lifecycleSteps: { status: ComplaintStatus; label: string; desc: string }[] = [
    { status: 'REPORTED', label: 'Reported', desc: 'Registered by citizen' },
    { status: 'ASSIGNED', label: 'Assigned', desc: 'Routed to department' },
    { status: 'IN_PROGRESS', label: 'In Progress', desc: 'Crew dispatched on-site' },
    { status: 'RESOLVED', label: 'Resolved', desc: 'Civic defect rectified' },
  ];

  const currentStepIdx = lifecycleSteps.findIndex((s) => s.status === complaint.status);

  // Available valid next actions
  const getNextStatuses = (current: ComplaintStatus): ComplaintStatus[] => {
    switch (current) {
      case 'REPORTED':
        return ['ASSIGNED', 'IN_PROGRESS'];
      case 'ASSIGNED':
        return ['IN_PROGRESS', 'RESOLVED'];
      case 'IN_PROGRESS':
        return ['RESOLVED'];
      case 'RESOLVED':
        return ['IN_PROGRESS']; // allow reopen if needed
      default:
        return [];
    }
  };

  const nextActions = getNextStatuses(complaint.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Surface */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col h-full overflow-hidden transition-colors duration-150">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <ProblemIcon type={complaint.problem_type} className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {complaint.report_id}
                </span>
                <StatusBadge status={complaint.status} size="sm" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                {getProblemLabel(complaint.problem_type)} Incident
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Duplicate Alert Notice */}
          {complaint.duplicate_of && (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-300">Possible Duplicate Detected</h4>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                    This report is linked to existing complaint #{complaint.duplicate_of}.
                  </p>
                </div>
              </div>
              {onSelectDuplicate && (
                <button
                  onClick={() => onSelectDuplicate(complaint.duplicate_of!)}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-medium rounded-md transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>View Original</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Citizen Photographic Evidence */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Citizen Photographic Evidence
            </h4>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video relative group shadow-xs">
              <img
                src={resolveImageUrl(complaint.image_url)}
                alt={complaint.description || 'Civic defect evidence'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60';
                }}
              />
              <a
                href={resolveImageUrl(complaint.image_url)}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-950/85 hover:bg-white text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1 transition-colors shadow-xs"
              >
                <span>Full Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {complaint.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 leading-relaxed">
                "{complaint.description}"
              </p>
            )}
          </div>

          {/* AI Vision Analysis */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <h4>Gemini Vision Assessment</h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {Math.round(complaint.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-medium">Visual Severity</span>
                <div className="mt-1">
                  <SeverityBadge severity={complaint.severity} size="sm" />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-medium">Category</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium capitalize mt-1">
                  {complaint.problem_type}
                </p>
              </div>
            </div>

            {/* Observations */}
            {complaint.evidence && complaint.evidence.length > 0 && (
              <div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-medium">
                  Objective Visual Observations
                </span>
                <ul className="mt-1 space-y-1">
                  {complaint.evidence.map((point, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Geographic Location</span>
              </div>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{complaint.location_name}</p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Responsible Department</span>
              </div>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{complaint.department}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Timeline */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Civic Resolution Lifecycle
            </h4>
            <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {lifecycleSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.status} className="relative">
                    <span
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 transition-colors ${
                        isCurrent
                          ? 'border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100'
                          : isPassed
                          ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-400'
                          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? 'text-slate-900 dark:text-slate-100'
                              : isPassed
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Authority Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Current: <strong className="text-slate-900 dark:text-slate-100 font-medium">{complaint.status}</strong>
          </span>

          <div className="flex items-center gap-2">
            {nextActions.map((target) => (
              <button
                key={target}
                onClick={() => handleStatusChange(target)}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Mark as {target.replace('_', ' ')}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
