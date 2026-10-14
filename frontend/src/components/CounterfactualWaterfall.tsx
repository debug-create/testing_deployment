// CounterfactualWaterfall.tsx
import React, { useState, useMemo } from 'react';
import { Counterfactual, CounterfactualScenario } from '../types';
import {
  ArrowDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Scale,
  Sliders,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CounterfactualWaterfallProps {
  counterfactual: Counterfactual;
  scenarios?: CounterfactualScenario[];
}

export function CounterfactualWaterfall({
  counterfactual,
  scenarios = [],
}: CounterfactualWaterfallProps) {
  const currentRisk = counterfactual.current_risk;
  const deltas = counterfactual.deltas || [];

  // Interactive toggle state for "What-If" simulator
  const [activeFactors, setActiveFactors] = useState<Record<number, boolean>>({});

  // Toggle factor
  const toggleFactor = (idx: number) => {
    setActiveFactors((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Reset simulator
  const resetSimulator = () => {
    setActiveFactors({});
  };

  // Calculate cumulative stepped waterfall stages
  const steppedStages = useMemo(() => {
    let runningRisk = currentRisk;
    return deltas.map((delta, index) => {
      const prevRisk = runningRisk;
      // Either single delta score or cumulative stepped
      const deltaImpact = Math.max(0, currentRisk - delta.risk_without);
      const resultingRisk = delta.risk_without;
      runningRisk = resultingRisk;

      return {
        ...delta,
        prevRisk,
        resultingRisk,
        reduction: prevRisk - resultingRisk,
        totalDropFromCurrent: currentRisk - resultingRisk,
      };
    });
  }, [currentRisk, deltas]);

  // Compute simulated risk based on user's active toggles in the what-if sandbox
  const simulatedRisk = useMemo(() => {
    let totalDeltas = 0;
    deltas.forEach((delta, idx) => {
      if (activeFactors[idx]) {
        totalDeltas += Math.max(0, currentRisk - delta.risk_without);
      }
    });
    return Math.max(5, currentRisk - totalDeltas);
  }, [currentRisk, deltas, activeFactors]);

  const activeTogglesCount = Object.values(activeFactors).filter(Boolean).length;

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* 1. Waterfall Trajectory Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#140c0c] via-[#0f0e14] to-[#090b10] border border-white/[0.08] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8342A] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Bayesian Counterfactual Decomposition
              </span>
            </div>
            <h3 className="font-mono text-sm font-bold text-white mt-1">
              Risk Attenuation Waterfall
            </h3>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-2xl">
              Decomposes aggregate residual risk into isolated behavioral drivers. Identifies exactly how much risk drops if specific anomalous telemetry vectors are refuted or attested.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-black/40 p-3 rounded-xl border border-white/[0.06]">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Observed Risk
              </span>
              <span className="text-xl font-bold font-mono text-[#E8342A]">
                {currentRisk}
                <span className="text-xs text-zinc-500 font-normal">/100</span>
              </span>
            </div>

            <div className="h-8 w-[1px] bg-white/[0.1]" />

            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                Attenuated Floor
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {deltas.length > 0 ? Math.min(...deltas.map((d) => d.risk_without)) : currentRisk}
                <span className="text-xs text-zinc-500 font-normal">/100</span>
              </span>
            </div>
          </div>
        </div>

        {/* Narrative Flow Chain */}
        {deltas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-xs">
            <span className="text-zinc-400 shrink-0">Waterfall Chain:</span>
            <span className="px-2 py-0.5 rounded bg-[#E8342A]/20 text-[#E8342A] border border-[#E8342A]/40 font-bold shrink-0">
              Current: {currentRisk}
            </span>
            {deltas.map((d, i) => (
              <React.Fragment key={`chain-${i}`}>
                <span className="text-zinc-500 shrink-0">→</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-white/[0.08] shrink-0">
                  without [{d.factor_type || `Factor ${i + 1}`}]: <strong className="text-emerald-400">{d.risk_without}</strong>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* 2. THE STEPPED WATERFALL BARS (Real proportional visual bars) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] px-1">
          <span className="uppercase tracking-wider font-semibold">
            Stepped Factor Decomposition ({deltas.length} Evaluated Vectors)
          </span>
          <span>Proportional Bar Length (0-100 Scale)</span>
        </div>

        {/* Row 0: Baseline Observed Risk Bar */}
        <div className="p-4 rounded-xl bg-[#110c0e] border border-[#E8342A]/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#E8342A]/20 text-[#E8342A] border border-[#E8342A]/40 font-bold">
                Baseline
              </span>
              <span className="font-mono text-xs font-semibold text-white">
                Observed Incident Residual Risk
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-[#E8342A]">
              {currentRisk} / 100
            </div>
          </div>

          {/* Full Proportional Baseline Bar */}
          <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-white/[0.08] relative">
            <div
              style={{ width: `${currentRisk}%` }}
              className="h-full bg-gradient-to-r from-red-600 to-[#E8342A] rounded-full"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span>0</span>
            <span>Observed Alert Level: {currentRisk}%</span>
            <span>100</span>
          </div>
        </div>

        {/* Subsequent Waterfall Delta Rows with Stepped Bar Lengths */}
        {deltas.map((delta, index) => {
          const reduction = Math.max(0, currentRisk - delta.risk_without);
          const percentReduction = Math.round((reduction / currentRisk) * 100);
          const targetScore = delta.risk_without;

          return (
            <motion.div
              key={`${delta.label}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="p-4 sm:p-5 rounded-xl bg-[#0c0c12] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3.5"
            >
              {/* Header with Factor Label and Resulting Score */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono bg-zinc-800 text-zinc-200 font-bold shrink-0 border border-white/[0.06]">
                      F{index + 1}
                    </span>
                    <span className="text-xs font-mono font-semibold text-white">
                      {delta.label}
                    </span>
                    {delta.factor_type && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/90 text-[#C6613F] border border-[#C6613F]/30 font-medium">
                        {delta.factor_type}
                      </span>
                    )}
                  </div>

                  {delta.impact_description && (
                    <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-sans">
                      {delta.impact_description}
                    </p>
                  )}
                </div>

                {/* Score Delta Chip */}
                <div className="text-left sm:text-right shrink-0 bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      -{reduction} pts
                    </span>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-300 block mt-0.5">
                    Residual Risk drops: <strong>{currentRisk} → {targetScore}</strong>
                  </span>
                </div>
              </div>

              {/* REAL VISUALLY SATISFYING STEPPED BAR */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-white/[0.08] relative">
                  {/* Remaining Risk Bar */}
                  <div
                    style={{ width: `${targetScore}%` }}
                    className={`h-full transition-all duration-700 ${
                      targetScore >= 70
                        ? 'bg-[#E8342A]'
                        : targetScore >= 40
                        ? 'bg-amber-500'
                        : 'bg-[#C6613F]'
                    }`}
                    title={`Remaining Risk: ${targetScore}/100`}
                  />

                  {/* Attenuated Delta Segment */}
                  <div
                    style={{ width: `${reduction}%` }}
                    className="h-full bg-emerald-500/40 border-l border-emerald-400/60 relative flex items-center justify-center"
                    title={`Attenuated Delta: -${reduction} pts (${percentReduction}% drop)`}
                  >
                    <span className="text-[8px] font-mono text-emerald-200 font-bold hidden sm:inline px-1">
                      -{reduction}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>0</span>
                  <span className="text-emerald-400 font-medium">
                    Attenuated: {targetScore}/100 (-{percentReduction}%)
                  </span>
                  <span>100</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 3. INTERACTIVE "WHAT-IF" SCENARIO SIMULATOR */}
      {deltas.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#0e0e16] border border-[#C6613F]/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#C6613F]/20 border border-[#C6613F]/30 flex items-center justify-center text-[#C6613F]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Interactive Sandbox
                </span>
                <h4 className="text-xs font-mono font-bold text-white">
                  Hypothetical Factor Combinator
                </h4>
              </div>
            </div>

            {activeTogglesCount > 0 && (
              <button
                onClick={resetSimulator}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Simulation</span>
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-400 font-sans">
            Toggle individual counterfactual factors below to simulate compound attestation. See how the net score adjusts if multiple conditions hold true simultaneously:
          </p>

          {/* Interactive Checkbox Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {deltas.map((delta, idx) => {
              const isChecked = !!activeFactors[idx];
              const reduction = Math.max(0, currentRisk - delta.risk_without);

              return (
                <button
                  key={`sim-${idx}`}
                  onClick={() => toggleFactor(idx)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    isChecked
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20 text-white'
                      : 'bg-zinc-900/60 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-mono font-semibold block leading-tight">
                      {delta.label}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1 block">
                      -{reduction} pts reduction
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Simulated Result Gauge Banner */}
          <div className="p-4 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Simulated Net Residual Risk ({activeTogglesCount} factors active)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-2xl font-bold font-mono ${
                    simulatedRisk <= 30
                      ? 'text-emerald-400'
                      : simulatedRisk <= 60
                      ? 'text-amber-400'
                      : 'text-[#E8342A]'
                  }`}
                >
                  {simulatedRisk}
                </span>
                <span className="text-xs font-mono text-zinc-500">/ 100</span>

                {activeTogglesCount > 0 && (
                  <span className="text-xs font-mono text-emerald-400 ml-2">
                    (-{currentRisk - simulatedRisk} pts total reduction)
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Simulated Action Threshold
              </span>
              <span
                className={`text-xs font-mono font-semibold mt-1 inline-block px-2.5 py-1 rounded-md border ${
                  simulatedRisk < 40
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : simulatedRisk < 70
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30'
                }`}
              >
                {simulatedRisk < 40
                  ? 'Cleared / Safe'
                  : simulatedRisk < 70
                  ? 'Review Recommended'
                  : 'Automated Containment'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. BAYESIAN HYPOTHESIS SPACE */}
      {scenarios.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] px-1">
            <span className="uppercase tracking-wider font-semibold">
              Evaluated Bayesian Hypotheses ({scenarios.length})
            </span>
            <span>Posterior Probability</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {scenarios.map((scenario) => {
              const isSupported = scenario.verdict === 'Supported';
              const isRefuted = scenario.verdict === 'Refuted';

              return (
                <div
                  key={scenario.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSupported
                      ? 'bg-[#150d09]/80 border-[#C6613F]/50 shadow-sm'
                      : isRefuted
                      ? 'bg-zinc-900/40 border-white/[0.04] opacity-85'
                      : 'bg-zinc-900/60 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                            isSupported
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : isRefuted
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {isSupported ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isRefuted ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <HelpCircle className="w-3 h-3" />
                          )}
                          <span>{scenario.verdict}</span>
                        </span>

                        <h4 className="text-xs font-mono font-semibold text-white">
                          {scenario.hypothesis}
                        </h4>
                      </div>

                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">
                        {scenario.reasoning}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                        Posterior Prob
                      </span>
                      <span
                        className={`text-base font-bold font-mono mt-0.5 block ${
                          scenario.probability >= 70
                            ? 'text-emerald-400'
                            : scenario.probability <= 30
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {scenario.probability}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
