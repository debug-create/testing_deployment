// src/components/ScopeBlastRadiusPreview.tsx
// Displays the narrow blast-radius constraint, allowed boundaries, and locked unrelated systems

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Server,
  Database,
  Key,
  FolderLock,
  CheckCircle,
  Ban,
  Clock,
  Fingerprint,
} from 'lucide-react';
import { ScopeBlastRadiusPreview as ScopeData } from '../types';

interface ScopeBlastRadiusPreviewProps {
  scope: ScopeData;
  requestStatus: string;
}

export function ScopeBlastRadiusPreview({ scope, requestStatus }: ScopeBlastRadiusPreviewProps) {
  const isActive = requestStatus === 'ACTIVE';

  return (
    <div className="bg-[#0b0f19] border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0d1424]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Scope & Blast-Radius Boundary</h3>
            <p className="text-xs text-slate-400">
              Deterministic isolation guarantees unrelated production systems remain locked
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Least Privilege Sandbox
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Approved Scope Target Card */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isActive
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'bg-white/[0.02] border-white/10'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'
              }`}>
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-white">Target Resource (Narrowly Scoped)</h4>
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500 text-black">
                      LIVE ACTIVE SESSION
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-emerald-300 mt-0.5 font-medium">
                  {scope.allowedResource}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                  <span>Permission: <strong className="text-slate-200">{scope.allowedPermission}</strong></span>
                  <span>TTL: <strong className="text-slate-200">{scope.sessionTtl}</strong></span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs font-mono font-semibold">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>MFA Enforced</span>
            </div>
          </div>
        </div>

        {/* Prohibited Actions List */}
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            Hard Prohibitions & Policy Bounds
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scope.prohibitedActions.map((act, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/[0.04] border border-rose-500/20 text-[11px] text-rose-200/90 font-medium"
              >
                <Ban className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unaffected / Inaccessible Systems Verification */}
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Unaffected Production Systems (Isolated & Inaccessible)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Zero Residual Exposure</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {scope.unaffectedSystems.map((sys, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-slate-300">{sys.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{sys.reason}</div>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  {sys.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
