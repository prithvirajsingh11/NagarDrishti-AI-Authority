import React, { useState } from 'react';
import { ArrowUpDown, Eye, Inbox } from 'lucide-react';
import type { Complaint, Department } from '../types/complaint';
import { FilterBar } from '../components/FilterBar';
import { ProblemIcon } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';

type SortField = 'created_at' | 'severity' | 'status' | 'report_id';
type SortOrder = 'asc' | 'desc';

interface ComplaintQueueProps {
  complaints: Complaint[];
  departments: Department[];
  loading: boolean;
  onSelectComplaint: (c: Complaint) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (val: string) => void;
  dateHorizon: string;
  onDateHorizonChange: (val: string) => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onResetFilters: () => void;
}

export const ComplaintQueue: React.FC<ComplaintQueueProps> = ({
  complaints,
  departments,
  loading,
  onSelectComplaint,
  categoryFilter,
  onCategoryFilterChange,
  severityFilter,
  onSeverityFilterChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  dateHorizon,
  onDateHorizonChange,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const severityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedComplaints = [...complaints].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === 'severity') {
      comparison = (severityWeight[a.severity] || 0) - (severityWeight[b.severity] || 0);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === 'report_id') {
      comparison = a.report_id.localeCompare(b.report_id);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto transition-colors">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Municipal Complaint Queue
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official triage and audit register for citizen-reported civic infrastructure defects.
          </p>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg shadow-xs">
          {sortedComplaints.length} Records
        </span>
      </div>

      {/* Synchronized Filter Bar */}
      <FilterBar
        category={categoryFilter}
        onCategoryChange={onCategoryFilterChange}
        severity={severityFilter}
        onSeverityChange={onSeverityFilterChange}
        status={statusFilter}
        onStatusChange={onStatusFilterChange}
        department={departmentFilter}
        onDepartmentChange={onDepartmentFilterChange}
        dateHorizon={dateHorizon}
        onDateHorizonChange={onDateHorizonChange}
        search={searchQuery}
        onSearchChange={onSearchQueryChange}
        departments={departments}
        onResetFilters={onResetFilters}
      />

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium select-none">
              <tr>
                <th
                  onClick={() => handleSort('report_id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Report ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Problem</th>
                <th className="py-3 px-4">Location</th>
                <th
                  onClick={() => handleSort('severity')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Severity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Department</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading complaints queue...
                  </td>
                </tr>
              ) : sortedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Inbox className="w-7 h-7 text-slate-600 mb-1" />
                      <p className="text-sm font-semibold text-slate-300">
                        {complaints.length === 0 ? 'No civic reports yet' : 'No complaints found matching the criteria.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {complaints.length === 0
                          ? 'Citizen reports submitted via the mobile/web app will appear here in real-time.'
                          : 'Try clearing your search or adjusting the master filters above.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedComplaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectComplaint(c)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Report ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {c.report_id}
                    </td>

                    {/* Problem */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ProblemIcon type={c.problem_type} className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span className="capitalize text-slate-800 dark:text-slate-200 font-medium">
                          {c.problem_type}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {c.location_name}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4">
                      <SeverityBadge severity={c.severity} size="sm" />
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{c.department}</td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComplaint(c);
                        }}
                        className="p-1 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Inspect complaint"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
