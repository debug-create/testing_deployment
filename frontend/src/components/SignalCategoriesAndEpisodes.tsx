// src/components/SignalCategoriesAndEpisodes.tsx
// Phase 6: Category-Level Risk Decomposition and Temporal Evidence Episodes
// Grouping events into high-level signal categories and coherent causal episodes.

import React, { useState } from 'react';
import {
  Layers,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  HelpCircle,
  FileCheck,
  ChevronRight,
  Database,
  Key,
  Globe,
  Laptop,
} from 'lucide-react';
import { SignalCategory, EvidenceEpisode } from '../types';

interface SignalCategoriesAndEpisodesProps {
  categories?: SignalCategory[];
  episodes?: EvidenceEpisode[];
}

export const SignalCategoriesAndEpisodes: React.FC<SignalCategoriesAndEpisodesProps> = ({
  categories = [],
  episodes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'episodes'>('categories');

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'crypto_operations':
        return <Key className="h-4 w-4" />;
      case 'data_movement':
      case 'data_movement_storage':
        return <Database className="h-4 w-4" />;
      case 'workstation_telemetry':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0e] p-5 mb-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-[#C6613F]" />
            <span>Signal Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('episodes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'episodes'
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-[#C6613F]" />
            <span>Evidence Episodes ({episodes.length})</span>
          </button>
        </div>

        <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
          {activeTab === 'categories' ? 'Domain Breakdown' : 'Causal Grouping'}
        </span>
      </div>

      {/* Tab 1: Signal Categories */}
      {activeTab === 'categories' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.map((cat) => {
            const rawScore = cat.raw_risk ?? cat.category_score ?? 0;
            const resScore = cat.residual_risk ?? cat.category_score ?? 0;
            const cred = cat.context_credit ?? 0;
            const isUnresolved = resScore > 50;
            const isAttenuated = cred > 0.7;

            return (
              <div
                key={cat.id || cat.category_id || cat.name}
                className={`rounded-lg border p-4 transition-colors ${
                  isUnresolved
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : isAttenuated
                    ? 'border-emerald-500/20 bg-emerald-950/5'
                    : 'border-white/10 bg-black/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-white/5 text-white/70">
                      {getCategoryIcon(cat.id || cat.category_id || cat.name)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{cat.display_name || cat.name}</h4>
                      <span className="text-[10px] text-white/40 font-mono">
                        {cat.event_count ?? 1} {(cat.event_count ?? 1) === 1 ? 'event' : 'events'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-white/40 block uppercase font-mono">Residual</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        isUnresolved ? 'text-rose-400' : isAttenuated ? 'text-emerald-400' : 'text-white/90'
                      }`}
                    >
                      {resScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3 pt-2.5 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/40">Raw Anomaly Score:</span>
                    <span className="font-mono text-white/70">{rawScore.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/40">Context Credit:</span>
                    <span className="font-mono text-emerald-400">
                      {cred > 0 ? `-${Math.round(cred * 100)}%` : '0%'}
                    </span>
                  </div>
                  {cat.primary_driver && (
                    <div className="mt-2 text-[11px] text-white/60 bg-black/20 p-2 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase font-mono">Primary Driver:</span>
                      {cat.primary_driver}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Evidence Episodes */}
      {activeTab === 'episodes' && (
        <div className="mt-4 space-y-3">
          {episodes.map((ep) => {
            const rawEpRisk = ep.raw_risk ?? ep.group_score ?? 0;
            const resEpRisk = ep.residual_risk ?? ep.group_score ?? 0;
            const epStatus = ep.status || 'unresolved';
            const isResolved = epStatus === 'explained';
            const isLate = epStatus === 'late_context_affected';
            const isIndeterminate = epStatus === 'indeterminate';

            return (
              <div
                key={ep.id || ep.episode_id || ep.name}
                className="rounded-lg border border-white/10 bg-black/30 p-4 transition-colors hover:border-white/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
                      {ep.id || ep.episode_id || 'ep'}
                    </span>
                    <h4 className="text-xs font-semibold text-white">{ep.name}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/40 font-mono">{ep.time_span || 'Past 24h'}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isLate
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : isIndeterminate
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {epStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/70 mt-1 leading-relaxed">{ep.explanation || ep.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Events</span>
                    <span className="text-white/80">{ep.event_count ?? (ep.event_ids?.length || 1)} events</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Raw Risk</span>
                    <span className="text-white/80">{rawEpRisk.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Residual Risk</span>
                    <span className="text-white/90 font-semibold">{resEpRisk.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Context Status</span>
                    <span className="text-white/80 capitalize">{epStatus.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
