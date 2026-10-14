// ComparisonStrip.tsx
import React from 'react';
import { Entity } from '../types';
import { Sparkline } from './Sparkline';
import { ArrowRight, CheckCircle2, ShieldAlert, Clock, Lock, Sparkles, RotateCcw, HelpCircle, Eye } from 'lucide-react';
import { PersonaAvatar } from './PersonaAvatar';

interface ComparisonStripProps {
  entities: Entity[];
  onSelectCase: (entityId: string) => void;
}

export function ComparisonStrip({ entities, onSelectCase }: ComparisonStripProps) {
  const priya = entities.find((e) => e.id.includes('priya') || e.caseId === '101');
  const devraj = entities.find((e) => e.id.includes('devraj') || e.caseId === '104');
  const arjun = entities.find((e) => e.id.includes('arjun') || e.caseId === '107');
  const neha = entities.find((e) => e.id.includes('neha') || e.caseId === '112');

  const quartet = [priya, devraj, arjun, neha].filter(Boolean) as Entity[];

  return (
    <section className="mb-10" aria-label="Symmetric Comparison Strip">
      {/* Crisp, clean header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-3 mb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6613F]" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
            Primary Archetypes · Contract 2.0.0
          </h2>
        </div>
        <p className="text-[11px] font-mono text-zinc-400">
          4 distinct trajectories: Explained • Escalated • Scoped Hold • Indeterminate Baseline
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quartet.map((entity, index) => {
          const isDevraj = entity.id.includes('devraj') || entity.caseId === '104';
          const isPriya = entity.id.includes('priya') || entity.caseId === '101';
          const isArjun = entity.id.includes('arjun') || entity.caseId === '107';
          const isNeha = entity.id.includes('neha') || entity.caseId === '112';

          // Color tokens
          const strokeColor = isDevraj
            ? '#E8342A'
            : isPriya
            ? '#10B981'
            : isArjun
            ? '#F59E0B'
            : '#38BDF8';

          const badgeConfig = (() => {
            if (isPriya) {
              return {
                label: 'Cleared (No Containment)',
                bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
                icon: <CheckCircle2 className="w-3.5 h-3.5" />,
              };
            }
            if (isDevraj) {
              return {
                label: 'Scoped Upload Hold',
                bg: 'bg-rose-950/60 border-rose-600/50 text-rose-300',
                icon: <ShieldAlert className="w-3.5 h-3.5" />,
              };
            }
            if (isArjun) {
              return {
                label: 'Scoped Cloud Hold',
                bg: 'bg-amber-950/40 border-amber-500/40 text-amber-300',
                icon: <Lock className="w-3.5 h-3.5" />,
              };
            }
            return {
              label: 'Observation Only',
              bg: 'bg-sky-950/40 border-sky-500/30 text-sky-300',
              icon: <Eye className="w-3.5 h-3.5" />,
            };
          })();

          // Initials for avatar
          const initials = entity.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          const rawScore = entity.details?.rawDeviationScore ?? (isNeha ? 25 : 100);
          const coveragePct = entity.details?.contextCoverageScore ?? (isPriya ? 100 : isArjun ? 59 : 0);
          const residualScore = entity.details?.residualRiskScore ?? entity.riskScore;

          return (
            <div
              key={entity.id}
              onClick={() => onSelectCase(entity.id)}
              className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${
                isDevraj
                  ? 'bg-[#0f0909]/90 border-rose-500/30 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/10'
                  : isPriya
                  ? 'bg-[#090f0c]/90 border-emerald-500/20 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10'
                  : isArjun
                  ? 'bg-[#0f0d09]/90 border-amber-500/25 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10'
                  : 'bg-[#080d12]/90 border-sky-500/20 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10'
              }`}
            >
              {/* Top Row: Avatar + Name + Trajectory Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <PersonaAvatar
                    id={entity.id}
                    name={entity.name}
                    size="sm"
                    status={isDevraj ? 'escalated' : isArjun ? 'hold' : isPriya ? 'cleared' : 'indeterminate'}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-zinc-100 group-hover:text-white transition-colors truncate">
                        {entity.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        #{entity.caseId}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {entity.role}
                    </div>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border shrink-0 ${badgeConfig.bg}`}
                >
                  {badgeConfig.icon}
                  <span>{badgeConfig.label}</span>
                </div>
              </div>

              {/* Exact Metrics Row */}
              <div className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-lg bg-black/30 border border-white/5 text-center text-[10px] font-mono mb-2">
                <div>
                  <span className="text-zinc-500 block text-[9px]">RAW</span>
                  <span className="font-semibold text-zinc-200">{rawScore}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px]">COV</span>
                  <span className="font-semibold text-zinc-200">{coveragePct}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px]">RESIDUAL</span>
                  <span
                    className={`font-bold ${
                      residualScore >= 70
                        ? 'text-rose-400'
                        : residualScore >= 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {residualScore}
                  </span>
                </div>
              </div>

              {/* Sparkline */}
              <div className="py-1 px-1">
                <Sparkline data={entity.timelineSparkline} color={strokeColor} height={32} />
              </div>

              {/* Bottom Summary & Prompt */}
              <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                <p className="text-zinc-400 truncate max-w-[78%] font-sans">
                  {entity.summary}
                </p>
                <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-zinc-100 transition-colors">
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#C6613F]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

