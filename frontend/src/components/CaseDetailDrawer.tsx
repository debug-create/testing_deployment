// CaseDetailDrawer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Entity, CaseStatus, EvidenceEvent, ResourceTarget } from '../types';
import { Sparkline } from './Sparkline';
import { StatusBadge, ClassificationBadge } from './StatusBadge';
import { getOrCreateCaseDetail } from '../caseData';
import { ShiftMapGraph } from './ShiftMapGraph';
import { CounterfactualWaterfall } from './CounterfactualWaterfall';
import { PersonaAvatar } from './PersonaAvatar';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileCheck2,
  FileX2,
  HelpCircle,
  Clock,
  Layers,
  Terminal,
  Lock,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Building2,
  Briefcase,
  GitCommit,
  Zap,
  Shield,
  FileCode2,
} from 'lucide-react';

interface CaseDetailDrawerProps {
  entity: Entity | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (entityId: string, newStatus: CaseStatus) => void;
}

// Resource Badge Component helper for rendering Protective Hold vs Unlocked chips
export function ResourceBadgeChip({ resource }: { resource?: ResourceTarget | string }) {
  if (!resource) return null;
  const resObj: ResourceTarget =
    typeof resource === 'string'
      ? { id: resource, name: resource, critical: false }
      : resource;

  // ADDITION 2b: Protective hold badge on critical/restricted resources
  if (resObj.protectiveHold) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-amber-950/60 border border-amber-500/50 text-amber-300 shadow-sm flex-wrap"
        title="Resource Protective Hold: Export blocked immediately, pending review"
      >
        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="font-bold text-zinc-200">{resObj.name}</span>
        <span className="text-zinc-500">•</span>
        <span className="text-amber-300 font-medium">
          🔒 Protective hold — export blocked, pending review
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 border border-white/[0.08] text-zinc-300"
      title={resObj.critical ? 'Critical Resource (Active/Unlocked)' : 'Standard Resource'}
    >
      <FileCode2 className="w-3 h-3 text-zinc-400 shrink-0" />
      <span>{resObj.name}</span>
      {resObj.critical && (
        <span className="text-[9px] uppercase tracking-wider text-rose-400 font-semibold px-1 rounded bg-rose-500/10">
          Critical
        </span>
      )}
    </div>
  );
}

export function CaseDetailDrawer({
  entity,
  isOpen,
  onClose,
  onUpdateStatus,
}: CaseDetailDrawerProps) {
  // 5 discrete investigation tabs including the new Shift Map
  const [activeTab, setActiveTab] = useState<
    'overview' | 'shiftmap' | 'events' | 'context' | 'counterfactual'
  >('overview');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab, transient action messages, and confirmation states whenever a different entity opens
  useEffect(() => {
    if (entity) {
      setActiveTab('overview');
      setActionNotice(null);
      setConfirmingRevoke(false);
    }
  }, [entity?.id]);

  // Fully independent case detail for this specific entity (computed unconditionally)
  const rawCaseDetail = useMemo(() => {
    if (!entity) return null;
    return (
      entity.details ||
      getOrCreateCaseDetail(entity.id)
    );
  }, [entity]);

  // Prepend the system action event to timelineEvents if threshold is crossed
  const caseDetail = useMemo(() => {
    if (!rawCaseDetail || !entity) return null;
    const qualifies = rawCaseDetail.residualRiskScore >= 70;
    if (!qualifies) {
      return rawCaseDetail;
    }
    const hasAlready = rawCaseDetail.timelineEvents.some((ev) => ev.isSystemAction);
    if (hasAlready) return rawCaseDetail;

    const systemActionEvent: EvidenceEvent = {
      id: `sys-auto-prot-${entity.id}`,
      timestamp: 'Today, 03:06 UTC',
      source: 'IKORI Protective Hold Engine',
      event:
        '⚡ Protective hold active — session privilege reduced to read-only, step-up authentication required.',
      vector: 'Protective Hold Tier 2 Policy Enforcement',
      severity: 'high',
      isSystemAction: true,
      details:
        'Protective hold policy rule triggered immediately upon residual risk crossing 70/100 threshold (net score: ' +
        rawCaseDetail.residualRiskScore +
        '/100). Safe, reversible session containment enforced; admin notified.',
    };

    return {
      ...rawCaseDetail,
      timelineEvents: [systemActionEvent, ...rawCaseDetail.timelineEvents],
    };
  }, [rawCaseDetail, entity]);

  // Early return MUST be placed after all React hooks to preserve unconditional call order
  if (!isOpen || !entity || !caseDetail) return null;

  const qualifiesForAutomaticProtectiveAction = caseDetail.residualRiskScore >= 70;
  const isEscalated = entity.riskLevel === 'escalated' || entity.caseStatus === 'Open';
  const isResolved = entity.caseStatus === 'Cleared';
  const isRevoked = entity.caseStatus === 'Containment Recommended';
  const isReviewing = entity.caseStatus === 'Reviewing';
  const isReopened = entity.caseStatus === 'Reopened';
  const isIndeterminate =
    entity.classification === 'indeterminate' ||
    caseDetail.classification === 'indeterminate';

  const accentColor = isEscalated
    ? '#E8342A'
    : isResolved
    ? '#C6613F'
    : isReopened
    ? '#ff7e54'
    : '#D97706';

  const handleStatusChange = (newStatus: CaseStatus, notice: string) => {
    onUpdateStatus(entity.id, newStatus);
    setActionNotice(notice);
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  return (
    <div
      id="case-detail-modal-root"
      className="fixed inset-0 z-50 flex justify-end"
      aria-labelledby="case-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Backdrop overlay with subtle blur and smooth fade */}
      <div
        id="case-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in cursor-pointer"
        aria-hidden="true"
      />

      {/* 2. Slide-in Right Sidebar Drawer */}
      <aside
        id="case-detail-sidebar"
        className="relative z-10 w-full max-w-2xl h-full bg-[#09090d] border-l border-white/[0.08] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right text-zinc-100 font-sans"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0c0c12]/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PersonaAvatar
              id={entity.id}
              name={entity.name}
              size="md"
              status={isEscalated ? 'escalated' : isResolved ? 'cleared' : 'hold'}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
                  Case #{entity.caseId || entity.id.slice(0, 4).toUpperCase()}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-[11px] font-mono text-zinc-400 truncate">
                  {entity.department}
                </span>
              </div>
              <h2
                id="case-drawer-title"
                className="text-base font-bold text-white tracking-tight truncate"
              >
                {entity.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status & Classification Badges */}
            <StatusBadge
              status={entity.caseStatus}
              riskLevel={entity.riskLevel}
              riskScore={entity.riskScore}
              classification={entity.classification || caseDetail.classification}
              size="sm"
            />

            {(entity.classification || caseDetail.classification) && (
              <ClassificationBadge
                classification={entity.classification || caseDetail.classification!}
                size="sm"
              />
            )}

            <button
              id="close-case-drawer-button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer ml-1"
              aria-label="Close case drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Notice Alert Banner */}
        {actionNotice && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Tab Navigation Strip */}
        <div className="px-6 border-b border-white/[0.06] bg-[#09090d] shrink-0 flex items-center gap-5 text-xs font-mono overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 relative cursor-pointer font-medium whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6613F]" />
            )}
          </button>

          {/* ADDITION 5: Shift Map Tab */}
          <button
            onClick={() => setActiveTab('shiftmap')}
            className={`py-3 relative cursor-pointer font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'shiftmap'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-[#C6613F]" />
            <span>Shift Map</span>
            {activeTab === 'shiftmap' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6613F]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`py-3 relative cursor-pointer font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Evidence ({caseDetail.timelineEvents.length})
            {activeTab === 'events' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6613F]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={`py-3 relative cursor-pointer font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'context'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Context Ledger ({caseDetail.contextLedger.length})
            {activeTab === 'context' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6613F]" />
            )}
          </button>

          {/* ADDITION 4: Counterfactuals Tab with Stepped Waterfall */}
          <button
            onClick={() => setActiveTab('counterfactual')}
            className={`py-3 relative cursor-pointer font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'counterfactual'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Counterfactuals ({caseDetail.counterfactualWaterfall?.deltas.length || caseDetail.counterfactuals.length})
            {activeTab === 'counterfactual' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6613F]" />
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* ADDITION 3: System Reopen Callout Banner */}
              {isReopened && (
                <div className="p-4 rounded-xl bg-[#1d120a] border border-[#C6613F]/60 text-amber-200 text-xs shadow-lg shadow-[#C6613F]/10 flex items-start gap-3 animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-[#C6613F]/20 border border-[#C6613F]/40 flex items-center justify-center text-[#ff7e54] shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#ff7e54]">
                        System Reopen Triggered
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-white/[0.08]">
                        {caseDetail.reopenMetadata?.date || 'Today, 05:22 UTC'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 mt-1.5 leading-relaxed font-mono">
                      {entity.reopenNotice ||
                        caseDetail.reopenMetadata?.message ||
                        'Reopened — new activity on Today, 05:22 UTC falls outside the scope of the Quarterly Maintenance RFC-388 that previously explained this case.'}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                      <span>Status: Re-escalated to Active Investigation</span>
                      <span>•</span>
                      <span className="text-zinc-300">Continuous Intent Graph drift detected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ADDITION 1: Indeterminate Callout Banner */}
              {isIndeterminate && (
                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-700/70 text-zinc-300 text-xs shadow-sm flex items-start gap-3 animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Risk Classification: Indeterminate
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-white/[0.08]">
                        Sparse Telemetry (&lt; 14 days)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                      This entity has genuinely insufficient historical telemetry to classify confidently (e.g. employee tenure &lt; 14 days / 336 hours). This indicates <em>"we do not have enough baseline data yet,"</em> not <em>"this behavior is confirmed anomalous."</em>
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                      <span>Confidence: {caseDetail.confidence || 31}%</span>
                      <span>•</span>
                      <span className="text-zinc-300">Requires supervised baseline collection</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ADDITION 2a: System Protective Action Banner on Overview if threshold >= 70 */}
              {qualifiesForAutomaticProtectiveAction && (
                <div className="p-3.5 rounded-xl bg-[#1c1209]/90 border border-amber-500/40 text-amber-200 text-xs font-sans shadow-lg shadow-amber-950/30 flex items-start gap-3 animate-in fade-in">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        ⚡ Automatic Action — Session Privilege Reduced
                      </span>
                      <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Tier 2 Enforced
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                      Session privilege reduced to read-only, step-up authentication required. Reversible containment enforced automatically at 0.3s after detection.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                      <span>Status: Safe, reversible hold active</span>
                      <span>•</span>
                      <span className="text-zinc-300">Awaiting SOC supervisor disposition or override</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Three-number risk calculation display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    IKORI Risk Calculus Formula
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Residual = Raw Deviation - Contextual Attenuation
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#0c0c12] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Raw Deviation
                    </span>
                    <div className="text-xl font-bold font-mono text-zinc-200 mt-1">
                      {caseDetail.rawDeviationScore}
                      <span className="text-xs font-normal text-zinc-400">/100</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Gross behavioral drift
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c0c12] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Context Coverage
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {caseDetail.contextCoverageScore}%
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      RFC & schedule validation
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c0c12] border border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-zinc-400">
                      Residual Risk
                    </span>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        isEscalated
                          ? 'text-[#E8342A]'
                          : isResolved
                          ? 'text-[#C6613F]'
                          : isReopened
                          ? 'text-[#ff7e54]'
                          : 'text-amber-400'
                      }`}
                    >
                      {caseDetail.residualRiskScore}
                      <span className="text-xs font-normal text-zinc-400">/100</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      Net alert score
                    </span>
                  </div>
                </div>
              </div>

              {/* Behavioral Summary */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Incident Hypothesis & Pattern
                </span>
                <div className="p-4 rounded-xl bg-[#0c0c12] border border-white/[0.06] space-y-2">
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {entity.summary}
                  </p>
                  {entity.accessVector && (
                    <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <Terminal className="w-3.5 h-3.5 text-[#C6613F] shrink-0" />
                      <span className="truncate">Vector: {entity.accessVector}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 7-Day Trajectory Sparkline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    7-Day Residual Velocity
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Last active {entity.lastActive}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#0c0c12] border border-white/[0.06]">
                  <Sparkline
                    data={entity.timelineSparkline}
                    color={accentColor}
                    height={72}
                  />
                </div>
              </div>

              {/* High-Water Evidence Signals with Resource Badges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    High-Water Evidence Signals
                  </span>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="text-[11px] font-mono text-[#C6613F] hover:text-[#E07B57] cursor-pointer flex items-center gap-1"
                  >
                    <span>View all events</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {caseDetail.timelineEvents.slice(0, 3).map((ev) => {
                    const isSystemAction = ev.isSystemAction;

                    return (
                      <div
                        key={ev.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          isSystemAction
                            ? 'bg-[#181109]/90 border-amber-500/40 shadow-sm'
                            : 'bg-[#0c0c12] border-white/[0.06]'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            isSystemAction
                              ? 'bg-amber-400 animate-pulse'
                              : ev.severity === 'critical'
                              ? 'bg-[#E8342A]'
                              : ev.severity === 'high'
                              ? 'bg-amber-400'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-mono font-medium truncate ${
                                isSystemAction ? 'text-amber-300 font-semibold' : 'text-white'
                              }`}
                            >
                              {ev.event}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                              {ev.timestamp}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                            {ev.details}
                          </p>

                          {/* ADDITION 2b: Resource-level Protective Hold badge */}
                          {ev.resource && (
                            <div className="mt-2 pt-2 border-t border-white/[0.04]">
                              <ResourceBadgeChip resource={ev.resource} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SHIFT MAP (ADDITION 5) */}
          {activeTab === 'shiftmap' && (
            <ShiftMapGraph
              data={
                caseDetail.shiftMap || {
                  nodes: [
                    { id: `${entity.id}-ident`, label: `${entity.id}@corp`, type: 'identity' },
                    { id: `${entity.id}-res`, label: 'Production Workstation', type: 'resource' },
                  ],
                  edges: [
                    {
                      from: `${entity.id}-ident`,
                      to: `${entity.id}-res`,
                      status: entity.classification || 'explained',
                      timestamp: 'Today, 02:00 UTC',
                    },
                  ],
                  change_point_timestamp: 'Today, 02:00 UTC',
                }
              }
              actorName={entity.name}
            />
          )}

          {/* TAB 3: EVIDENCE EVENTS */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Per-Event Forensic Stream</span>
                <span>Chronological Telemetry</span>
              </div>

              {caseDetail.timelineEvents.map((ev, index) => {
                const isSystemAction = ev.isSystemAction;

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border space-y-2 transition-all ${
                      isSystemAction
                        ? 'bg-[#150f08]/95 border-amber-500/50 shadow-md shadow-amber-950/20'
                        : 'bg-[#0c0c12] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono ${
                            isSystemAction
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {isSystemAction ? <Zap className="w-3 h-3 text-amber-400" /> : index + 1}
                        </span>
                        <span
                          className={`text-xs font-mono font-semibold truncate ${
                            isSystemAction ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {ev.source}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSystemAction ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>System Action</span>
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                              ev.severity === 'critical'
                                ? 'bg-[#E8342A]/15 text-[#E8342A] border border-[#E8342A]/30'
                                : ev.severity === 'high'
                                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-400">
                          {ev.timestamp}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-medium ${
                        isSystemAction ? 'text-amber-200 font-semibold' : 'text-zinc-200'
                      }`}
                    >
                      {ev.event}
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {ev.details}
                    </p>

                    {/* ADDITION 2b: Resource badge chip */}
                    {ev.resource && (
                      <div className="pt-2 border-t border-white/[0.04]">
                        <ResourceBadgeChip resource={ev.resource} />
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                      <Terminal className="w-3 h-3 text-[#C6613F]" />
                      <span>Vector: {ev.vector}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: CONTEXT LEDGER */}
          {activeTab === 'context' && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                <span>Context Attenuation Ledger</span>
                <span>Coverage: {caseDetail.contextCoverageScore}%</span>
              </div>

              {caseDetail.contextLedger.map((item) => {
                const isValid = item.status === 'valid';
                const isMissing = item.status === 'missing';
                const isUnmatched = item.status === 'unmatched';
                const isExpired = item.status === 'expired';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#0c0c12] border border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        {item.type}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                          isValid
                            ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                            : isExpired
                            ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                            : isMissing
                            ? 'bg-[#E8342A]/10 text-[#E8342A] border border-[#E8342A]/20'
                            : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                        }`}
                      >
                        {isValid ? (
                          <FileCheck2 className="w-3 h-3" />
                        ) : (
                          <FileX2 className="w-3 h-3" />
                        )}
                        <span>{item.status.toUpperCase()}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-white">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {item.note}
                    </p>

                    {/* ADDITION 2b: Resource badge chip on context ledger item */}
                    {item.resource && (
                      <div className="pt-2 border-t border-white/[0.04]">
                        <ResourceBadgeChip resource={item.resource} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: COUNTERFACTUALS (ADDITION 4) */}
          {activeTab === 'counterfactual' && (
            <CounterfactualWaterfall
              counterfactual={
                caseDetail.counterfactualWaterfall || {
                  current_risk: caseDetail.residualRiskScore,
                  deltas: [
                    {
                      label: 'Without Anomalous Access Factor',
                      risk_without: Math.round(caseDetail.residualRiskScore * 0.5),
                      factor_type: 'Baseline Shift',
                      impact_description: 'Removes anomalous telemetry volume outside baseline window',
                    },
                  ],
                }
              }
              scenarios={caseDetail.counterfactuals}
            />
          )}
        </div>

        {/* Bottom Analyst Actions Footer (FIX 3: Four terminal-capable states) */}
        <div className="p-5 border-t border-white/[0.08] bg-[#0c0c12]/95 backdrop-blur-md shrink-0 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Operational Disposition</span>
            <span>
              Current: <strong className="text-white">{entity.caseStatus || 'Open'}</strong>
            </span>
          </div>

          {confirmingRevoke ? (
            <div className="p-3.5 rounded-xl bg-[#160d10] border border-[#E8342A]/60 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-300">
                <ShieldAlert className="w-4 h-4 text-[#E8342A] shrink-0" />
                <span>Human Confirmation Required: Revoke Access</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                Confirm immediate emergency access revocation for <strong>{entity.name}</strong>. Active Teleport SSH tunnels will be severed and AWS/GCP session credentials invalidated.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmingRevoke(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 border border-white/[0.1] text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmingRevoke(false);
                    handleStatusChange(
                      'Containment Recommended',
                      `Containment recommendation logged and confirmed for ${entity.name}. Teleport and database tokens held.`
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-colors shadow-sm shadow-[#E8342A]/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Containment</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {/* Action 1: Investigate (available immediately, not gated) */}
              <button
                onClick={() =>
                  handleStatusChange(
                    'Reviewing',
                    `Case #${entity.caseId || '104'} moved to Active Investigation.`
                  )
                }
                className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isReviewing
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
                title="Move case to active investigation"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>{isReviewing ? 'Investigating' : 'Investigate'}</span>
              </button>

              {/* Action 2: Clear Case (Terminal state) */}
              <button
                onClick={() =>
                  handleStatusChange(
                    'Cleared',
                    `Case #${entity.caseId || '104'} marked Cleared. Intent and context verified.`
                  )
                }
                className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isResolved
                    ? 'bg-[#C6613F]/20 border-[#C6613F]/40 text-[#C6613F]'
                    : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Clear Case</span>
              </button>

              {/* Action 3: Recommend Containment */}
              <button
                onClick={() => {
                  if (isRevoked) {
                    handleStatusChange(
                      'Containment Recommended',
                      `Case already in Containment Recommended status.`
                    );
                  } else {
                    setConfirmingRevoke(true);
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isRevoked
                    ? 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                    : 'bg-[#E8342A] border-[#E8342A] text-white hover:bg-[#E8342A]/90 shadow-md shadow-[#E8342A]/20'
                }`}
                title="Initiate containment recommendation"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isRevoked ? 'Containment' : 'Contain'}</span>
              </button>
            </div>
          )}

          {/* Action 4 / ADDITION 3: System Reopen Simulation or Reset */}
          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-500">System Reopen Engine:</span>
            {isReopened ? (
              <span className="text-[#ff7e54] font-medium flex items-center gap-1">
                <RotateCcw className="w-3 h-3 animate-spin" />
                <span>Reopened via telemetry drift</span>
              </span>
            ) : (
              <button
                onClick={() =>
                  handleStatusChange(
                    'Reopened',
                    `System Reopen triggered for Case #${entity.caseId || '104'} due to out-of-scope telemetry drift.`
                  )
                }
                className="text-[#C6613F] hover:text-[#ff7e54] flex items-center gap-1 hover:underline cursor-pointer"
                title="Test and demonstrate system-initiated auto-reopen behavior"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Simulate System Reopen</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
