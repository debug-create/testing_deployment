// CaseDetailPlaceholder.tsx
import React from 'react';
import { Entity, CaseStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { Sparkline } from './Sparkline';
import {
  ArrowLeft,
  ShieldAlert,
  Terminal,
  Activity,
  User,
  Clock,
  ExternalLink,
  Lock,
  CheckCircle,
} from 'lucide-react';

interface CaseDetailPlaceholderProps {
  caseId: string;
  entity: Entity;
  onBack: () => void;
  onUpdateStatus?: (status: CaseStatus) => void;
}

export function CaseDetailPlaceholder({
  caseId,
  entity,
  onBack,
  onUpdateStatus,
}: CaseDetailPlaceholderProps) {
  const isEscalated = entity.id === 'devraj';

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Org Overview</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>/product/case/{caseId}</span>
            <span>•</span>
            <span className="text-zinc-200">Investigation Dossier</span>
          </div>
        </div>

        {/* Case Header Hero Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0b0b10] border border-white/[0.08] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  isEscalated
                    ? 'bg-[#E8342A]/10 border-[#E8342A]/30 text-[#E8342A]'
                    : 'bg-[#C6613F]/10 border-[#C6613F]/30 text-[#C6613F]'
                }`}
              >
                {isEscalated ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {entity.name}
                  </h1>
                  <span className="text-xs font-mono text-zinc-400">
                    Case #{entity.caseId || '104'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {entity.role} • {entity.department}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge
                status={entity.caseStatus}
                riskLevel={entity.riskLevel}
                riskScore={entity.riskScore}
                size="md"
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Current Risk Index
              </span>
              <div
                className={`text-2xl font-bold font-mono mt-1 ${
                  isEscalated ? 'text-[#E8342A]' : 'text-[#C6613F]'
                }`}
              >
                {entity.riskScore} / 100
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Detection Vector
              </span>
              <div className="text-xs font-mono text-zinc-200 mt-1 truncate">
                {entity.accessVector || 'Off-hours privilege escalation'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Active Telemetry
              </span>
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Ingestion Active
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Sparkline Trail */}
        <div className="p-6 rounded-2xl bg-[#0b0b10] border border-white/[0.08] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C6613F]" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                Risk Elevation Trajectory
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">Past 7 Days</span>
          </div>

          <Sparkline
            data={entity.timelineSparkline}
            color={isEscalated ? '#E8342A' : '#C6613F'}
            height={90}
          />
        </div>

        {/* State Model Preview Actions */}
        <div className="p-6 rounded-2xl bg-[#0b0b10] border border-white/[0.08]">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Analyst Workflow State Model
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Full Case Detail actions (timeline evidence tree, forensic diff, revoke) arrive in next pass.
              </p>
            </div>
            <div className="text-xs font-mono text-zinc-400">
              Current: <strong className="text-white">{entity.caseStatus}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onUpdateStatus?.('Reviewing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                entity.caseStatus === 'Reviewing'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-400 font-semibold'
                  : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white'
              }`}
            >
              Set &apos;Reviewing&apos;
            </button>

            <button
              onClick={() => onUpdateStatus?.('Cleared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                entity.caseStatus === 'Cleared'
                  ? 'bg-[#C6613F]/20 border-[#C6613F] text-[#C6613F] font-semibold'
                  : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white'
              }`}
            >
              Set &apos;Cleared&apos; (Priya Model)
            </button>

            <button
              onClick={() => onUpdateStatus?.('Containment Recommended')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                entity.caseStatus === 'Containment Recommended'
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-200 font-semibold'
                  : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white'
              }`}
            >
              Set &apos;Containment Recommended&apos;
            </button>

            <button
              onClick={() => onUpdateStatus?.('Open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                entity.caseStatus === 'Open'
                  ? 'bg-[#E8342A]/20 border-[#E8342A] text-[#E8342A] font-semibold'
                  : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white'
              }`}
            >
              Reset to &apos;Open&apos;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
