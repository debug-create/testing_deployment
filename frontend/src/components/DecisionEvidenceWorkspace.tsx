import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Fingerprint,
  GitCompareArrows,
  MapPin,
  Network,
  Radar,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { AccessRequestItem } from '../types';

type TrustState = 'verified' | 'mixed' | 'missing' | 'blocked';

interface TrustAxis {
  label: string;
  state: TrustState;
  reading: string;
  source: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface WhatIfMeasure {
  id: string;
  label: string;
  intent: string;
  changes: string[];
  remains: string;
}

const toneByState: Record<TrustState, string> = {
  verified: 'bg-emerald-400',
  mixed: 'bg-amber-400',
  missing: 'bg-rose-400',
  blocked: 'bg-cyan-300',
};

function shortHash(hash: string) {
  const value = hash.replace('sha256:', '');
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function trustAxesFor(request: AccessRequestItem): TrustAxis[] {
  const verified = request.contextEvidence.filter((item) => item.status === 'verified').length;
  const total = request.contextEvidence.length;
  const missing = request.contextEvidence.filter((item) => item.status === 'missing').length;
  const suspicious = request.id === 'AR-104';

  return [
    {
      label: 'Identity',
      state: suspicious ? 'mixed' : 'verified',
      reading: suspicious ? 'Known account · session origin differs' : 'Known employee · role matched',
      source: 'Identity directory + session',
      icon: Fingerprint,
    },
    {
      label: 'Device & location',
      state: suspicious ? 'missing' : 'verified',
      reading: suspicious ? 'Unknown endpoint · external ASN' : 'Managed device · expected network',
      source: 'MDM + network telemetry',
      icon: MapPin,
    },
    {
      label: 'Operational context',
      state: missing > 0 ? 'missing' : 'verified',
      reading: suspicious ? 'No incident, change, or on-call match' : 'Incident + change + on-call matched',
      source: 'Incident and change systems',
      icon: Activity,
    },
    {
      label: 'Requested scope',
      state: suspicious ? 'blocked' : 'mixed',
      reading: suspicious ? 'Export route held before completion' : 'Critical target · can be tightly scoped',
      source: 'Policy + topology',
      icon: Network,
    },
    {
      label: 'Evidence coverage',
      state: verified === total ? 'verified' : verified > 0 ? 'mixed' : 'missing',
      reading: `${verified}/${total} required context signals verified`,
      source: 'Seeded evidence checklist',
      icon: Radar,
    },
  ];
}

function measuresFor(request: AccessRequestItem): WhatIfMeasure[] {
  if (request.id === 'AR-104') {
    return [
      {
        id: 'isolate',
        label: 'Isolate route',
        intent: 'Keep the current protective hold and isolate the observed egress path.',
        changes: ['External destination becomes unreachable', 'Vault-to-egress route is interrupted', 'Evidence collection continues'],
        remains: 'Employee identity and unrelated internal sessions remain untouched.',
      },
      {
        id: 'revoke',
        label: 'Revoke + rotate',
        intent: 'Terminate this session after approval and rotate the exposed credential set.',
        changes: ['Active session is terminated', 'Credential reuse is invalidated', 'A new verification step is required'],
        remains: 'Other employees and unrelated credentials remain available.',
      },
      {
        id: 'verify',
        label: 'Verify first',
        intent: 'Maintain the hold while collecting owner and endpoint attestation.',
        changes: ['No additional access is granted', 'Owner attestation is requested', 'Endpoint identity is challenged'],
        remains: 'The suspicious transfer stays blocked while uncertainty is reduced.',
      },
    ];
  }

  return [
    {
      id: 'scoped',
      label: '15-min scoped access',
      intent: 'Grant only the bastion action required by the active incident.',
      changes: ['Bastion-only route becomes available', 'Step-up authentication is required', 'Access expires automatically after 15 minutes'],
      remains: 'Vault, external upload, root access, and unrelated databases stay inaccessible.',
    },
    {
      id: 'context',
      label: 'Request context',
      intent: 'Keep the request paused and collect one more independent verification.',
      changes: ['No access is granted', 'Reviewer requests fresh owner confirmation', 'Decision ledger records the new check'],
      remains: 'Production access remains paused until the requested evidence arrives.',
    },
    {
      id: 'deny',
      label: 'Deny request',
      intent: 'Close this request without creating a temporary session.',
      changes: ['Request moves to denied', 'No route or permission is opened', 'Decision reason is recorded'],
      remains: 'The incident continues without this access path.',
    },
  ];
}

export function DecisionEvidenceWorkspace({ request }: { request: AccessRequestItem }) {
  const axes = useMemo(() => trustAxesFor(request), [request]);
  const measures = useMemo(() => measuresFor(request), [request]);
  const [measureId, setMeasureId] = useState(measures[0].id);
  const selected = measures.find((measure) => measure.id === measureId) ?? measures[0];

  React.useEffect(() => setMeasureId(measures[0].id), [request.id]);

  const baseline = request.id === 'AR-104'
    ? ['Session observed', 'Egress transfer interrupted', 'Route awaiting human decision']
    : ['Access not yet granted', 'Critical resource requested', 'Context review in progress'];

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-[#070d16] overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.05)]">
      <header className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-cyan-500/[0.06] to-transparent">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold tracking-wide text-white">Decision Evidence Workspace</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">Trace what was observed, what is trusted, and what each preventive measure would change.</p>
        </div>
        <span className="px-2.5 py-1 rounded-full border border-amber-400/20 bg-amber-400/[0.07] text-[10px] font-mono uppercase tracking-[0.16em] text-amber-300">
          Seeded prototype · replaceable by backend
        </span>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] border-b border-white/10">
        <div className="p-5 xl:border-r border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Trust vector</div>
              <div className="text-xs text-slate-400 mt-1">Independent signals—no blended trust score.</div>
            </div>
            <CircleDashed className="w-5 h-5 text-cyan-300/70" />
          </div>
          <div className="space-y-2.5">
            {axes.map((axis) => {
              const Icon = axis.icon;
              return (
                <div key={axis.label} className="grid grid-cols-[28px_minmax(110px,.62fr)_1.2fr] items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-slate-300" /></div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-100"><span className={`w-1.5 h-1.5 rounded-full ${toneByState[axis.state]}`} />{axis.label}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">{axis.source}</div>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-300">{axis.reading}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-violet-300">Investigation ledger</div>
              <div className="text-xs text-slate-400 mt-1">Evidence and decisions remain attributable.</div>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{request.contextEvidence.length + request.auditTimeline.length} entries</span>
          </div>
          <div className="relative pl-5 space-y-3 before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-cyan-400/70 before:via-violet-400/40 before:to-transparent">
            {request.contextEvidence.slice(0, 3).map((item) => (
              <div key={item.id} className="relative rounded-xl bg-white/[0.025] border border-white/[0.07] px-3 py-2.5">
                <span className={`absolute -left-[19px] top-4 w-2 h-2 rounded-full ring-4 ring-[#070d16] ${item.status === 'verified' ? 'bg-emerald-400' : item.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-100">{item.title}</span><span className="text-[9px] font-mono text-slate-500">{item.timestamp?.split(' ').slice(-2).join(' ')}</span></div>
                <div className="mt-1 text-[10px] text-slate-400">{item.source} · <span className="uppercase">{item.status}</span></div>
              </div>
            ))}
            {request.auditTimeline.slice(0, 2).map((item) => (
              <div key={item.id} className="relative rounded-xl bg-violet-400/[0.035] border border-violet-400/15 px-3 py-2.5">
                <span className="absolute -left-[19px] top-4 w-2 h-2 rounded-full bg-violet-300 ring-4 ring-[#070d16]" />
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-100">{item.action}</span><span className="text-[9px] font-mono text-violet-300">{shortHash(item.immutableHash)}</span></div>
                <div className="mt-1 text-[10px] text-slate-400">{item.actor} · policy decision recorded</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-amber-300"><GitCompareArrows className="w-3.5 h-3.5" />Preventive measure what-if</div>
            <div className="text-xs text-slate-400 mt-1">Preview only. Selecting a measure does not execute it.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {measures.map((measure) => (
              <button key={measure.id} type="button" onClick={() => setMeasureId(measure.id)} className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${measure.id === selected.id ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'}`}>
                {measure.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500"><TimerReset className="w-3.5 h-3.5" />Baseline</div>
            <div className="mt-3 space-y-2">{baseline.map((item) => <div key={item} className="flex items-start gap-2 text-xs text-slate-300"><span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500" />{item}</div>)}</div>
          </div>
          <div className="hidden lg:flex items-center justify-center px-1"><ArrowRight className="w-5 h-5 text-cyan-300" /></div>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.035] p-4">
            <div className="flex items-center justify-between gap-2"><div className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">If measure is applied</div><span className="text-[10px] font-mono text-slate-500">SIMULATED</span></div>
            <div className="mt-2 text-xs font-semibold text-white">{selected.intent}</div>
            <div className="mt-3 space-y-2">{selected.changes.map((item) => <div key={item} className="flex items-start gap-2 text-xs text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />{item}</div>)}</div>
            <div className="mt-3 pt-3 border-t border-white/[0.07] text-[10px] leading-relaxed text-slate-400"><span className="text-slate-200 font-semibold">Unchanged:</span> {selected.remains}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
