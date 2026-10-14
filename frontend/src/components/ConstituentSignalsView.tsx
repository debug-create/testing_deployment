// ConstituentSignalsView.tsx
import React from 'react';
import { ConstituentSignal } from '../types';
import { Sliders, Cpu, ShieldCheck, Activity, Info } from 'lucide-react';

interface ConstituentSignalsViewProps {
  signals?: ConstituentSignal[];
  rawDeviationScore: number;
}

export function ConstituentSignalsView({
  signals = [],
  rawDeviationScore,
}: ConstituentSignalsViewProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-[#0c0c12] border border-white/[0.08] text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-300">
          <Sliders className="w-4 h-4 text-[#C6613F]" />
          <span className="font-semibold uppercase tracking-wider">Constituent Anomaly Signals</span>
        </div>
        <p className="mt-2 text-zinc-500 font-sans text-xs">
          Raw baseline deviation ({rawDeviationScore}/100) computed from unified telemetry stream.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#0c0c12] border border-white/[0.08] space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C6613F]" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Constituent Anomaly Signals ({signals.length})
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Mathematical breakdown of telemetry inputs contributing to the raw deviation score ({rawDeviationScore}/100).
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-[#C6613F]/15 border border-[#C6613F]/30 text-[#C6613F]">
            Rule-Based
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
            Weighted
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {signals.map((sig) => {
          const isRuleBased = sig.category === 'rule-based';
          return (
            <div
              key={sig.id}
              className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${
                        isRuleBased
                          ? 'bg-[#C6613F]/20 text-[#C6613F] border-[#C6613F]/40'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {isRuleBased ? 'Rule-Based' : 'Weighted'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[140px]">
                      src: {sig.signal_source}
                    </span>
                  </div>
                  <h4 className="text-xs font-mono font-bold text-white mt-1.5">{sig.name}</h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-zinc-200">
                    {(sig.value ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    wt: {(((sig.weight ?? 0.1) * 100)).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(5, sig.value))}%` }}
                    className={`h-full ${
                      isRuleBased ? 'bg-[#C6613F]' : 'bg-amber-500/80'
                    }`}
                  />
                </div>
              </div>

              {sig.description && (
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  {sig.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
