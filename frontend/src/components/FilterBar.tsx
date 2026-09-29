import React from 'react';
import { Search, X } from 'lucide-react';
import type { Department } from '../types/complaint';

interface FilterBarProps {
  category: string;
  onCategoryChange: (val: string) => void;
  severity: string;
  onSeverityChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  resolutionStatus?: string;
  onResolutionStatusChange?: (val: string) => void;
  dateHorizon: string;
  onDateHorizonChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  departments: Department[];
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  category,
  onCategoryChange,
  severity,
  onSeverityChange,
  status,
  onStatusChange,
  department,
  onDepartmentChange,
  resolutionStatus = '',
  onResolutionStatusChange,
  dateHorizon,
  onDateHorizonChange,
  search,
  onSearchChange,
  departments,
  onResetFilters,
}) => {
  const activeCount = [
    category,
    severity,
    status,
    department,
    resolutionStatus,
    dateHorizon !== 'all' ? dateHorizon : '',
    search,
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-3 shadow-2xs space-y-2.5 transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, location, details..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Filter by problem category"
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="pothole">Pothole</option>
          <option value="garbage">Garbage</option>
          <option value="streetlight">Streetlight</option>
          <option value="drain">Drainage</option>
          <option value="other">Other</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
          aria-label="Filter by severity level"
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REOPENED">Reopened</option>
        </select>

        {/* Resolution Status Filter */}
        <select
          value={resolutionStatus}
          onChange={(e) => onResolutionStatusChange?.(e.target.value)}
          aria-label="Filter by resolution status"
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer"
        >
          <option value="">All Resolutions</option>
          <option value="pending_resolution">Pending Resolution</option>
          <option value="resolved">Resolved</option>
          <option value="awaiting_verification">Awaiting Citizen Verification</option>
          <option value="citizen_confirmed">Citizen Confirmed</option>
          <option value="reopened">Reopened</option>
        </select>

        {/* Department Filter */}
        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          aria-label="Filter by department"
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 max-w-[160px] truncate transition-colors cursor-pointer"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Time Horizon Segmented Control */}
        <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 text-xs">
          {[
            { val: 'all', label: 'All' },
            { val: 'today', label: 'Today' },
            { val: '7d', label: '7D' },
            { val: '30d', label: '30D' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => onDateHorizonChange(item.val)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                dateHorizon === item.val
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Clear Filters Button */}
        {activeCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-auto cursor-pointer"
            title="Clear all active filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
