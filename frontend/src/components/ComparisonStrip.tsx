// ComparisonStrip.tsx — Scenario Intelligence from data/model_input only.
// Never reads data/ground_truth. Its controlled selector also drives Network3DGraph.

import React, { useMemo, useState } from 'react';
import { Activity, GitBranch, Crosshair, Wrench, Database } from 'lucide-react';
import {
  getScenarioIntelligence,
  SCENARIO_INTELLIGENCE_CATALOG,
  ScenarioIntelligenceRecord,
} from '../data/model_input/loadScenarioIntelligence';

interface ComparisonStripProps {
  /** Optional override; defaults to catalog default (scn_0001). */
  scenarioId?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

const CARDS: Array<{
  title: string;
  accent: string;
  accentSoft: string;
  border: string;
  icon: React.ReactNode;
  primary: (s: ScenarioIntelligenceRecord) => { value: number; label: string };
  secondary: (s: ScenarioIntelligenceRecord) => { value: number; label: string };
}> = [
  {
    title: 'Telemetry',
    accent: 'text-sky-300',
    accentSoft: 'bg-sky-500/10 text-sky-300/90',
    border: 'border-sky-500/20 hover:border-sky-500/45',
    icon: <Activity className="w-3.5 h-3.5" />,
    primary: (s) => ({ value: s.event_count, label: 'Events' }),
    secondary: (s) => ({ value: s.source_type_count, label: 'Source types' }),
  },
  {
    title: 'Graph Scope',
    accent: 'text-violet-300',
    accentSoft: 'bg-violet-500/10 text-violet-300/90',
    border: 'border-violet-500/20 hover:border-violet-500/45',
    icon: <GitBranch className="w-3.5 h-3.5" />,
    primary: (s) => ({ value: s.asset_count, label: 'Entities' }),
    secondary: (s) => ({
      value: s.relationship_count,
      label: 'Candidate relationships',
    }),
  },
  {
    title: 'Exposure Context',
    accent: 'text-amber-300',
    accentSoft: 'bg-amber-500/10 text-amber-300/90',
    border: 'border-amber-500/25 hover:border-amber-500/50',
    icon: <Crosshair className="w-3.5 h-3.5" />,
    primary: (s) => ({ value: s.entry_point_count, label: 'Entry points' }),
    secondary: (s) => ({
      value: s.critical_target_count,
      label: 'Critical targets',
    }),
  },
  {
    title: 'Remediation Options',
    accent: 'text-rose-300',
    accentSoft: 'bg-rose-500/10 text-rose-300/90',
    border: 'border-rose-500/25 hover:border-rose-500/50',
    icon: <Wrench className="w-3.5 h-3.5" />,
    primary: (s) => ({ value: s.candidate_fix_count, label: 'Candidate fixes' }),
    secondary: (s) => ({
      value: s.approval_required_count,
      label: 'Approval required',
    }),
  },
];

export function ComparisonStrip({ scenarioId, onScenarioChange }: ComparisonStripProps) {
  const [internalScenarioId, setInternalScenarioId] = useState(
    scenarioId ?? SCENARIO_INTELLIGENCE_CATALOG.default_scenario_id
  );
  const activeScenarioId = scenarioId ?? internalScenarioId;

  const intelligence = useMemo(
    () => getScenarioIntelligence(activeScenarioId),
    [activeScenarioId]
  );

  return (
    <section className="mb-7" aria-label="Scenario Intelligence">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-3 mb-3 border-b border-white/[0.06]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6613F]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
              Scenario Intelligence
            </h2>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-sans leading-snug max-w-2xl">
            Inventory from synthetic <code className="text-zinc-400">data/model_input</code> only
            ({intelligence.graph_version}). No ground-truth paths or model scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-white/[0.08] bg-black/30 text-[10px] font-mono text-zinc-400">
            <Database className="w-3 h-3 text-[#C6613F]" />
            <span>Scenario</span>
            <select
              value={activeScenarioId}
              onChange={(event) => {
                setInternalScenarioId(event.target.value);
                onScenarioChange?.(event.target.value);
              }}
              className="bg-transparent text-zinc-200 border-0 outline-none cursor-pointer max-w-[7.5rem]"
            >
              {SCENARIO_INTELLIGENCE_CATALOG.scenarios.map((scenario) => (
                <option key={scenario.scenario_id} value={scenario.scenario_id}>
                  {scenario.scenario_id}
                </option>
              ))}
            </select>
          </label>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/20 bg-emerald-950/30 text-[10px] font-mono text-emerald-300/90">
            Synthetic dataset
          </span>
        </div>
      </div>

      <div className="ikori-metric-rail relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#09090c]/95 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
        <div className="ikori-metric-scan pointer-events-none absolute inset-y-0 left-0 z-0 w-1/4 bg-gradient-to-r from-transparent via-cyan-300/[0.06] to-transparent blur-xl" />
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, index) => {
            const primary = card.primary(intelligence);
            const secondary = card.secondary(intelligence);

            return (
              <article
                key={card.title}
                className={`group relative flex min-w-0 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.035] ${
                  index < CARDS.length - 1 ? 'lg:border-r lg:border-white/[0.07]' : ''
                } ${index < 2 ? 'sm:border-b lg:border-b-0 border-white/[0.07]' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] ${card.accentSoft}`}>
                    <span className="absolute inset-0 rounded-lg bg-current opacity-0 blur-md transition-opacity group-hover:opacity-15" />
                    {card.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {card.title}
                    </h3>
                    <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className={`text-xl font-bold tabular-nums tracking-tight ${card.accent}`}>{primary.value}</span>
                      <span className="text-[10px] text-zinc-500">{primary.label}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums text-zinc-200">{secondary.value}</div>
                  <div className="max-w-24 truncate text-[8px] font-mono uppercase tracking-wide text-zinc-600">{secondary.label}</div>
                </div>
                <span className={`absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-current transition-transform duration-500 group-hover:scale-x-100 ${card.accent}`} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
