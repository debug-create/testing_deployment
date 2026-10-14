// src/components/EventContributionsView.tsx
// Phase 5: Sortable and Filterable Event-Level Residual Contribution View
// Displays discrete event evidence, context state, context credit, and residual contribution.

import React, { useState, useMemo } from 'react';
import {
  Filter,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Clock,
  ArrowUpDown,
  Flame,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { EventContribution, ContextState } from '../types';

interface EventContributionsViewProps {
  events?: EventContribution[];
  topUnresolvedEventId?: string;
}

type FilterOption = 'all' | 'unresolved' | 'partially_explained' | 'explained' | 'indeterminate' | 'critical' | 'late_context_affected';
type SortField = 'timestamp' | 'event_raw_risk' | 'final_residual_contribution' | 'action';

export const EventContributionsView: React.FC<EventContributionsViewProps> = ({
  events = [],
  topUnresolvedEventId,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortField, setSortField] = useState<SortField>('final_residual_contribution');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (activeFilter !== 'all') {
      if (activeFilter === 'critical') {
        list = list.filter((e) => e.critical_action || e.context_state === 'critical');
      } else if (activeFilter === 'late_context_affected') {
        list = list.filter((e) => e.is_late_context || e.context_state === 'late_context_affected');
      } else {
        list = list.filter((e) => e.context_state === activeFilter);
      }
    }

    list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'final_residual_contribution') {
        comp = b.final_residual_contribution - a.final_residual_contribution;
      } else if (sortField === 'event_raw_risk') {
        comp = b.event_raw_risk - a.event_raw_risk;
      } else if (sortField === 'action') {
        comp = a.action.localeCompare(b.action);
      } else {
        comp = a.timestamp.localeCompare(b.timestamp);
      }
      return sortAsc ? -comp : comp;
    });

    return list;
  }, [events, activeFilter, sortField, sortAsc]);

  const filterCounts = useMemo(() => {
    return {
      all: events.length,
      unresolved: events.filter((e) => e.context_state === 'unresolved').length,
      partially_explained: events.filter((e) => e.context_state === 'partially_explained').length,
      explained: events.filter((e) => e.context_state === 'explained').length,
      indeterminate: events.filter((e) => e.context_state === 'indeterminate').length,
      critical: events.filter((e) => e.critical_action || e.context_state === 'critical').length,
      late_context_affected: events.filter((e) => e.is_late_context || e.context_state === 'late_context_affected').length,
    };
  }, [events]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getContextStateBadge = (state: ContextState, isLate?: boolean) => {
    switch (state) {
      case 'explained':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Explained (100% Credit)
          </span>
        );
      case 'late_context_affected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="h-3 w-3" /> Late-Context Attenuated
          </span>
        );
      case 'partially_explained':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-3 w-3" /> Partial Context
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Flame className="h-3 w-3" /> Critical Unmitigated
          </span>
        );
      case 'indeterminate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <HelpCircle className="h-3 w-3" /> Indeterminate (Sparse Baseline)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-3 w-3" /> Unresolved
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0e] p-5 mb-6">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Event-Level Evidence & Residual Contributions</h3>
            <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
              {events.length} Events Analyzed
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Context credit attenuates raw anomaly risk at the individual event level prior to case fusion.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unresolved', label: 'Unresolved' },
              { id: 'critical', label: 'Critical' },
              { id: 'partially_explained', label: 'Partial' },
              { id: 'explained', label: 'Explained' },
              { id: 'late_context_affected', label: 'Late Context' },
              { id: 'indeterminate', label: 'Indeterminate' },
            ] as const
          ).map((tab) => {
            const count = filterCounts[tab.id];
            if (tab.id !== 'all' && count === 0) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? 'bg-[#C6613F] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${activeFilter === tab.id ? 'bg-black/30' : 'bg-white/10'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-[11px] uppercase tracking-wider font-mono">
              <th
                onClick={() => handleSort('action')}
                className="py-2.5 pr-4 cursor-pointer hover:text-white/80"
              >
                <span className="flex items-center gap-1">Event Action & Source <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="py-2.5 px-3">Resource / Target</th>
              <th className="py-2.5 px-3">Context Status</th>
              <th
                onClick={() => handleSort('event_raw_risk')}
                className="py-2.5 px-3 cursor-pointer hover:text-white/80 text-right"
              >
                <span className="flex items-center justify-end gap-1">Raw Risk <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="py-2.5 px-3 text-right">Context Credit</th>
              <th
                onClick={() => handleSort('final_residual_contribution')}
                className="py-2.5 pl-3 cursor-pointer hover:text-white/80 text-right"
              >
                <span className="flex items-center justify-end gap-1">Residual Contrib <ArrowUpDown className="h-3 w-3" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredEvents.map((ec) => {
              const isTopUnresolved = ec.id === topUnresolvedEventId || (ec.final_residual_contribution > 60 && ec.context_state === 'unresolved');
              const isQuiet = ec.context_state === 'explained' && ec.final_residual_contribution < 1.0;

              return (
                <tr
                  key={ec.id}
                  className={`transition-colors ${
                    isTopUnresolved
                      ? 'bg-rose-950/20 hover:bg-rose-950/30'
                      : isQuiet
                      ? 'opacity-60 hover:opacity-100 bg-black/20'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Action & Source */}
                  <td className="py-3 pr-4 align-top">
                    <div className="flex items-start gap-2">
                      {ec.critical_action && (
                        <span title="Critical touchpoint on sensitive resource" className="mt-0.5 p-0.5 rounded bg-rose-500/20 text-rose-400">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                      <div>
                        <span className="font-medium text-white block leading-snug">{ec.action}</span>
                        <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                          <span className="font-mono">{ec.source}</span>
                          <span>•</span>
                          <span className="font-mono">{ec.timestamp}</span>
                        </div>
                        {ec.explanation && (
                          <p className="text-[11px] text-white/50 mt-1 max-w-md leading-relaxed">{ec.explanation}</p>
                        )}
                        {ec.matched_context_title && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-400/90 font-mono">
                            <FileCheck className="h-3 w-3 shrink-0" />
                            <span className="truncate">Attenuated by: {ec.matched_context_title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Resource / Target */}
                  <td className="py-3 px-3 align-top">
                    <span className="font-mono text-white/80 bg-white/5 px-2 py-0.5 rounded text-[11px] block w-fit">
                      {ec.resource}
                    </span>
                    {ec.destination && (
                      <span className="font-mono text-rose-300/80 bg-rose-950/30 px-2 py-0.5 rounded text-[10px] block w-fit mt-1">
                        → {ec.destination}
                      </span>
                    )}
                    {ec.episode_name && (
                      <span className="text-[10px] text-white/30 block mt-1 font-mono">
                        {ec.episode_name}
                      </span>
                    )}
                  </td>

                  {/* Context State Badge */}
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {getContextStateBadge(ec.context_state, ec.is_late_context)}
                  </td>

                  {/* Raw Risk */}
                  <td className="py-3 px-3 align-top text-right font-mono font-medium text-white/70">
                    {(ec.event_raw_risk ?? 0).toFixed(1)}
                  </td>

                  {/* Context Credit */}
                  <td className="py-3 px-3 align-top text-right font-mono font-medium">
                    {(ec.context_credit ?? 0) > 0 ? (
                      <span className="text-emerald-400">-{Math.round((ec.context_credit ?? 0) * 100)}%</span>
                    ) : (
                      <span className="text-white/30">0%</span>
                    )}
                  </td>

                  {/* Final Residual Contribution */}
                  <td className="py-3 pl-3 align-top text-right font-mono font-semibold">
                    <span
                      className={`text-sm ${
                        (ec.final_residual_contribution ?? 0) > 70
                          ? 'text-rose-400'
                          : (ec.final_residual_contribution ?? 0) > 30
                          ? 'text-amber-400'
                          : (ec.final_residual_contribution ?? 0) > 0
                          ? 'text-white/80'
                          : 'text-emerald-400'
                      }`}
                    >
                      {(ec.final_residual_contribution ?? 0).toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
