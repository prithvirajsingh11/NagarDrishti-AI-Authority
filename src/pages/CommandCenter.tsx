import React from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Complaint,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
} from '../types/complaint';
import { LeafletMap, type MapMode } from '../components/LeafletMap';
import { FilterBar } from '../components/FilterBar';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { RepeatedProblemBanner } from '../components/RepeatedProblemBanner';
import { useTheme } from '../context/ThemeContext';

interface CommandCenterProps {
  stats: DashboardStatistics | null;
  complaints: Complaint[];
  heatmapPoints: HeatmapPoint[];
  departments: Department[];
  loading: boolean;
  onSelectComplaint: (c: Complaint) => void;
  onSelectHotspot: (h: HotspotInfo) => void;
  focusedHotspot: HotspotInfo | null;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
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
  onNavigateToReports: () => void;
  onNavigateToHotspots: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  stats,
  complaints,
  heatmapPoints,
  departments,
  loading,
  onSelectComplaint,
  onSelectHotspot,
  focusedHotspot,
  mapMode,
  onMapModeChange,
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
  onNavigateToReports,
  onNavigateToHotspots,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Category chart data
  const categoryChartData = stats?.by_category
    ? Object.entries(stats.by_category)
        .filter(([, count]) => count > 0)
        .map(([cat, count]) => ({
          name: getProblemLabel(cat),
          count,
          key: cat,
        }))
    : [];

  // Moderate muted tones
  const categoryColors: Record<string, string> = {
    pothole: isDark ? '#38bdf8' : '#0284c7',
    garbage: isDark ? '#fb923c' : '#d97706',
    streetlight: isDark ? '#818cf8' : '#4f46e5',
    drain: isDark ? '#34d399' : '#059669',
    other: isDark ? '#94a3b8' : '#64748b',
  };

  const trendData = stats?.daily_trends || [];

  const totalReportsCount = stats?.total_reports ?? (loading ? '...' : 0);
  const isZeroData = !loading && (stats?.total_reports ?? 0) === 0 && complaints.length === 0;

  const chartTheme = {
    grid: isDark ? '#1e293b' : '#f1f5f9',
    tick: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipColor: isDark ? '#f8fafc' : '#0f172a',
    lineStroke: isDark ? '#60a5fa' : '#2563eb',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto transition-colors">
      {/* Repeated Problem Intelligence Banner */}
      {stats?.hotspots && stats.hotspots.length > 0 && (
        <RepeatedProblemBanner
          hotspots={stats.hotspots}
          onSelectHotspot={onSelectHotspot}
        />
      )}

      {/* 5 Minimalist KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Total Reports</span>
            <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {totalReportsCount}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">All logged incidents</span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400">
            <span className="font-medium">Critical & High</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 mt-2">
            {stats?.high_critical ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Requires urgent triage</span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">Pending Triage</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-2">
            {stats?.pending ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Awaiting department</span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400">
            <span className="font-medium">In Progress</span>
            <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-sky-700 dark:text-sky-400 mt-2">
            {stats?.in_progress ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Active crew dispatched</span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="font-medium">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-2">
            {stats?.resolved ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Completed resolutions</span>
        </div>
      </div>

      {/* Synchronized Master Filter Bar */}
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

      {/* Main Map (Dominant Visual Element) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Metropolitan Geographic Map
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ({complaints.length} filtered complaints plotted)
            </span>
          </div>
          {focusedHotspot && (
            <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
              Focus: {focusedHotspot.title}
            </span>
          )}
        </div>

        <LeafletMap
          complaints={complaints}
          heatmapPoints={heatmapPoints}
          mapMode={mapMode}
          onMapModeChange={onMapModeChange}
          onSelectComplaint={onSelectComplaint}
          focusedHotspot={focusedHotspot}
          heightClass="h-[460px]"
        />
      </div>

      {/* Split Section: Top Hotspots vs Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Hotspots */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Top Geographic Hotspots
              </h3>
            </div>
            <button
              onClick={onNavigateToHotspots}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {stats?.hotspots && stats.hotspots.length > 0 ? (
              stats.hotspots.slice(0, 4).map((h, i) => (
                <div
                  key={i}
                  onClick={() => onSelectHotspot(h)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">{h.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        Dominant: {h.dominant_issue} • {h.total_reports} incidents
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/40">
                    {h.high_critical_count} critical
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs font-medium">No active hotspot corridors identified.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Recent Complaints Queue
            </h3>
            <button
              onClick={onNavigateToReports}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer transition-colors"
            >
              <span>Full Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {complaints.length > 0 ? (
              complaints.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint(c)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                      <ProblemIcon type={c.problem_type} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200">
                          {c.report_id}
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {c.location_name}
                      </p>
                    </div>
                  </div>

                  <SeverityBadge severity={c.severity} size="sm" />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs font-medium">
                  {isZeroData ? 'No civic reports yet' : 'No complaints match the filter criteria.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics: Category Distribution & 7-Day Inflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Category Breakdown
          </h3>
          <div className="h-56">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="name" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipColor,
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[entry.key] || '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Inbox className="w-8 h-8 text-slate-400 mb-1" />
                <p className="text-xs">No civic reports yet</p>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Inflow Trend */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            7-Day Inflow Velocity
          </h3>
          <div className="h-56">
            {trendData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartTheme.lineStroke} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartTheme.lineStroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="day_label" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipColor,
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={chartTheme.lineStroke}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inflowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Inbox className="w-8 h-8 text-slate-400 mb-1" />
                <p className="text-xs">No civic reports yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
