import React from 'react';
import {
  Flame,
  ArrowRight,
  TrendingUp,
  Inbox,
} from 'lucide-react';
import type { Complaint, HotspotInfo } from '../types/complaint';
import { ProblemIcon } from '../components/ProblemIcon';

interface HotspotIntelligenceProps {
  hotspots: HotspotInfo[];
  allComplaints: Complaint[];
  onSelectHotspot: (h: HotspotInfo) => void;
  onNavigateToMap: () => void;
  onSelectComplaint: (c: Complaint) => void;
}

export const HotspotIntelligence: React.FC<HotspotIntelligenceProps> = ({
  hotspots,
  allComplaints,
  onSelectHotspot,
  onNavigateToMap,
  onSelectComplaint,
}) => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto transition-colors">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Hotspot Intelligence & Problem Corridors
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Spatial density clustering identifying high-risk recurring civic defects across municipal wards.
        </p>
      </div>

      {/* Hotspots Grid */}
      {/* Hotspots Grid */}
      {hotspots.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-1">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No active hotspot corridors identified</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            As complaints are registered across the city, spatial density algorithms will surface high-risk problem zones automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hotspots.map((h, idx) => {
            // Related reports
            const related = allComplaints.filter((c) => {
              if (h.report_ids && h.report_ids.length > 0) {
                return h.report_ids.includes(c.id) || h.report_ids.includes(c.report_id);
              }
              if (c.latitude && c.longitude && h.latitude && h.longitude) {
                const dLat = Math.abs(c.latitude - h.latitude);
                const dLng = Math.abs(c.longitude - h.longitude);
                return dLat < 0.015 && dLng < 0.015;
              }
              return false;
            });

            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
              >
                <div className="space-y-3.5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        Corridor #{idx + 1}
                      </span>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{h.title}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <ProblemIcon type={h.dominant_issue} className="w-3.5 h-3.5 text-slate-500" />
                      <span className="capitalize">{h.dominant_issue}</span>
                    </div>
                  </div>

                  {/* Metrics 3-box */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">Reports</span>
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {h.total_reports}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-normal">Unresolved</span>
                      <span className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {h.unresolved_count}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-normal">Critical</span>
                      <span className="font-mono text-sm font-semibold text-rose-700 dark:text-rose-400">
                        {h.high_critical_count}
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Trend */}
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px]">7-Day Velocity:</span>
                    </div>
                    <span
                      className={`font-medium font-mono text-[11px] ${
                        h.trend_percentage >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {h.trend_percentage > 0 ? `+${h.trend_percentage}%` : `${h.trend_percentage}%`}
                    </span>
                  </div>

                  {/* Suggested Action */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider block">
                      Operational Recommendation
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {h.suggested_action}
                    </p>
                  </div>

                  {/* Related reports preview */}
                  {related.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                        Corridor Complaints ({related.length})
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                        {related.slice(0, 3).map((rc) => (
                          <div
                            key={rc.id}
                            onClick={() => onSelectComplaint(rc)}
                            className="flex items-center justify-between p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] cursor-pointer transition-colors border border-slate-200/60 dark:border-slate-800/60"
                          >
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {rc.report_id}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                              {rc.location_name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-normal ${
                                rc.severity === 'CRITICAL'
                                  ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                                  : rc.severity === 'HIGH'
                                  ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                                  : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {rc.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    onSelectHotspot(h);
                    onNavigateToMap();
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  <span>Plot on Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

