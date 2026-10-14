// src/components/ResponseActionAndBlastRadius.tsx
// Component for Policy-Bounded Protective Holds, Response Action Plans, & Interactive Blast Radius Isolation Visualizer
// Non-negotiable honesty rule: visibly displays "Simulated enforcement" & "DEMO SIMULATION · SYNTHETIC DATA"

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Server,
  Database,
  ExternalLink,
  Laptop,
  Key,
  Shield,
  RotateCcw,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { ResponseActionPlan, BlastRadiusData, BlastRadiusNode } from '../types';
import { useAppMode } from '../caseHooks';
import { executeResponseActionSimulated } from '../api/client';
import { SIMULATED_ENFORCEMENT_LABEL } from '../constants';

interface ResponseActionAndBlastRadiusProps {
  caseId: string;
  responseAction?: ResponseActionPlan;
  blastRadius?: BlastRadiusData;
  onRefresh?: () => void;
}

export function ResponseActionAndBlastRadius({
  caseId,
  responseAction,
  blastRadius,
  onRefresh,
}: ResponseActionAndBlastRadiusProps) {
  const { persona, identity } = useAppMode();
  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isSimulated = responseAction?.is_simulated ?? true;
  const simulationLabel = responseAction?.simulation_label || SIMULATED_ENFORCEMENT_LABEL;

  const handleApproveContainment = async () => {
    setExecuting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await executeResponseActionSimulated(
        caseId,
        'approve_containment',
        `Approved by ${identity.name} (${identity.role})`
      );
      setActionSuccess('Containment authorization confirmed (Simulated enforcement sandbox).');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  };

  const handleRollback = async () => {
    setExecuting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await executeResponseActionSimulated(
        caseId,
        'rollback',
        `Rollback initiated by ${identity.name}`
      );
      setActionSuccess('Rollback executed successfully (Simulated sandbox).');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Honesty Banner */}
      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-amber-300">
            {simulationLabel}
          </span>
          <span className="text-amber-200/80">
            — Policy-bounded containment demonstration using a sandbox adapter. Standalone frontend does not alter live cloud infrastructure.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30 shrink-0">
          SIMULATION · SYNTHETIC DATA
        </span>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Response Action Plan Card */}
      {responseAction && (
        <div className="p-5 rounded-xl border border-white/10 bg-[#0a0a0e]">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    responseAction.action_type === 'human_containment'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : responseAction.action_type === 'protective_hold'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {responseAction.action_type.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-white/50">
                  Status: <strong className="text-white uppercase">{responseAction.status}</strong>
                </span>
                {responseAction.duration_ttl && (
                  <span className="flex items-center gap-1 text-xs text-white/60 font-mono">
                    <Clock className="h-3 w-3 text-white/40" />
                    {responseAction.duration_ttl}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white">{responseAction.title}</h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">{responseAction.reason}</p>
            </div>

            {/* Action Buttons based on status and human approval requirement */}
            <div className="flex items-center gap-2">
              {responseAction.requires_human_approval && responseAction.status === 'awaiting_approval' && (
                <button
                  onClick={handleApproveContainment}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
                  title="Authorize broad containment (Requires Reviewer or Admin persona)"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{executing ? 'Authorizing...' : 'Authorize Containment (Human Review)'}</span>
                </button>
              )}

              {responseAction.rollback_supported && responseAction.status === 'approved' && (
                <button
                  onClick={handleRollback}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                  <span>{executing ? 'Rolling back...' : 'Rollback Sandbox Action'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Scope Isolation Breakdown: Affected vs Unaffected */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Affected Scope */}
            <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20">
              <div className="flex items-center gap-2 mb-2 text-rose-300 text-xs font-semibold uppercase tracking-wider">
                <Lock className="h-3.5 w-3.5 text-rose-400" />
                <span>Isolated Scope (Scoped Containment)</span>
              </div>
              {responseAction.affected_scope && responseAction.affected_scope.length > 0 ? (
                <ul className="space-y-1.5">
                  {responseAction.affected_scope.map((scope, idx) => (
                    <li key={idx} className="text-xs font-mono text-rose-200/90 flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>{scope}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/40 italic">No resources isolated under current policy state.</p>
              )}
            </div>

            {/* Unaffected Scope (Preserved Work) */}
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Unaffected Scope (Preserved Developer Work)</span>
              </div>
              {responseAction.unaffected_scope && responseAction.unaffected_scope.length > 0 ? (
                <ul className="space-y-1.5">
                  {responseAction.unaffected_scope.map((scope, idx) => (
                    <li key={idx} className="text-xs font-mono text-emerald-200/90 flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{scope}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/40 italic">Full containment active across all actor scopes.</p>
              )}
            </div>
          </div>

          {responseAction.policy_rule && (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50 font-mono">
              <span>Policy Rule Trigger: <strong className="text-white/80">{responseAction.policy_rule}</strong></span>
              <span>Enforcement Trigger: {responseAction.triggered_at || 'Automatic Telemetry Threshold'}</span>
            </div>
          )}
        </div>
      )}

      {/* Blast Radius Visualizer Graph */}
      {blastRadius && (
        <div className="p-5 rounded-xl border border-white/10 bg-[#0a0a0e]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#C6613F]" />
                <span>Blast Radius & Containment Topology</span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Targeted isolation boundary showing blocked destinations versus preserved operational access.
              </p>
            </div>
            {blastRadius.summary && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {blastRadius.summary.affected_count} Isolated
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {blastRadius.summary.unaffected_count} Preserved
                </span>
              </div>
            )}
          </div>

          {/* Node Grid Visualization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {blastRadius.nodes.map((node) => {
              const isBlocked = node.state === 'blocked' || node.state === 'affected';
              const isVerified = node.state === 'verified' || node.state === 'unaffected' || node.state === 'normal';

              return (
                <div
                  key={node.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isBlocked
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                      : isVerified
                      ? 'bg-[#0e1217] border-white/10 text-zinc-300'
                      : 'bg-zinc-900 border-white/5 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                      {node.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {node.details || (isBlocked ? 'ISOLATED' : 'UNRESTRICTED')}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-white truncate" title={node.label}>
                    {node.label}
                  </div>
                  {node.sublabel && (
                    <div className="text-[10px] text-white/50 font-mono truncate mt-0.5">
                      {node.sublabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Edge Connection List */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <h4 className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2 font-mono">
              Evaluated Access Pathways & Containment Edges
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {blastRadius.edges.map((edge, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono px-2.5 py-1 rounded bg-black/40 border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/80">{edge.from}</span>
                    <ArrowRight className="h-3 w-3 text-white/40" />
                    <span className="text-white/80">{edge.to}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-[11px]">{edge.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        edge.status === 'unauthorized_hold'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {edge.status === 'unauthorized_hold' ? 'BLOCKED' : 'PERMITTED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
