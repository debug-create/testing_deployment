import React, { useEffect, useMemo, useState } from 'react';
import { Database, Eye, Globe2, Search, Server, Shield, UserRound } from 'lucide-react';
import {
  formatScenarioAssetName,
  loadScenarioGraphData,
  ScenarioAssetType,
  ScenarioGraphData,
} from '../data/model_input/loadScenarioIntelligence';
import { TrustVector3D } from './TrustVector3D';
import { sourceScenarioAssetName } from '../data/identityAliases';

interface ScenarioAssetMatrixProps { scenarioId: string; }

const GROUPS: Array<{
  id: string;
  label: string;
  types: ScenarioAssetType[];
  color: string;
  icon: React.ReactNode;
}> = [
  { id: 'identity', label: 'Identity Fabric', types: ['user_identity', 'privileged_identity', 'cloud_identity'], color: '#67E8F9', icon: <UserRound className="h-3.5 w-3.5" /> },
  { id: 'compute', label: 'Endpoints & Compute', types: ['endpoint', 'server'], color: '#94A3B8', icon: <Server className="h-3.5 w-3.5" /> },
  { id: 'application', label: 'Applications', types: ['application'], color: '#A78BFA', icon: <Globe2 className="h-3.5 w-3.5" /> },
  { id: 'data', label: 'Data Stores', types: ['database'], color: '#F43F5E', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'boundary', label: 'Security Boundary', types: ['security_infrastructure', 'external_entry'], color: '#FBBF24', icon: <Shield className="h-3.5 w-3.5" /> },
];

export function ScenarioAssetMatrix({ scenarioId }: ScenarioAssetMatrixProps) {
  const [data, setData] = useState<ScenarioGraphData | null>(null);
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState('all');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [showTrustVector, setShowTrustVector] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    loadScenarioGraphData(scenarioId).then((next) => { if (!cancelled) { setData(next); setSelectedAssetId(next.assets.find((asset) => asset.asset_id === 'identity_admin_003')?.asset_id || next.assets[0]?.asset_id || ''); setShowTrustVector(false); } });
    return () => { cancelled = true; };
  }, [scenarioId]);

  const degreeByAsset = useMemo(() => {
    const degrees = new Map<string, number>();
    data?.relationships.forEach((edge) => {
      degrees.set(edge.source_id, (degrees.get(edge.source_id) || 0) + 1);
      degrees.set(edge.target_id, (degrees.get(edge.target_id) || 0) + 1);
    });
    return degrees;
  }, [data]);

  const eventsByAsset = useMemo(() => {
    const counts = new Map<string, number>();
    data?.events.forEach((event) => {
      [event.source_entity_raw, event.target_entity_raw].forEach((value) => {
        if (value && data.assets.some((asset) => asset.asset_id === value)) counts.set(value, (counts.get(value) || 0) + 1);
      });
    });
    return counts;
  }, [data]);

  const visibleGroups = useMemo(() => GROUPS.map((group) => ({
    ...group,
    assets: (data?.assets || []).filter((asset) => {
      const text = `${formatScenarioAssetName(asset)} ${asset.asset_id} ${asset.zone} ${asset.asset_type}`.toLowerCase();
      return group.types.includes(asset.asset_type) && (groupId === 'all' || group.id === groupId) && text.includes(query.toLowerCase());
    }),
  })).filter((group) => group.assets.length > 0), [data, groupId, query]);

  const selectedAsset = data?.assets.find((asset) => asset.asset_id === selectedAssetId) || data?.assets[0];

  if (!data) return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/10 bg-[#07070a] font-mono text-xs text-zinc-500">Loading {scenarioId} asset matrix…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0b0f19] p-5 shadow-xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" /><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan-300">Selected scenario topology</span></div>
          <h2 className="mt-2 text-lg font-bold text-white">Asset & Identity Matrix</h2>
          <p className="mt-1 text-xs text-zinc-400">Inspect the entities and evidence available to the selected scenario. Select any card to prepare its trust-vector explanation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets…" className="w-52 rounded-lg border border-white/10 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400/40" /></div>
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none"><option value="all">All entity types</option>{GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Entities', data.assets.length], ['Candidate links', data.relationships.length], ['Telemetry events', data.events.length], ['Selected asset', formatScenarioAssetName(selectedAsset!)]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">{label}</div><div className="mt-1 truncate text-sm font-semibold text-zinc-100">{value}</div></div>)}
      </div>
      </div>

      {visibleGroups.map((group) => (
        <section key={group.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#0b0f19] p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 font-mono text-xs">
            <div className="flex items-center gap-2" style={{ color: group.color }}>{group.icon}<span className="font-semibold">{group.label}</span></div>
            <span className="text-[10px] text-zinc-600">{group.assets.length} entities</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.assets.map((asset) => {
              const isEntry = data.entry_points.includes(asset.asset_id);
              const isCritical = data.critical_targets.includes(asset.asset_id);
              return (
                <article onClick={() => setSelectedAssetId(asset.asset_id)} key={asset.asset_id} className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-[#080c16] p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,.25)] ${selectedAssetId === asset.asset_id ? 'border-cyan-300/45 shadow-[0_0_25px_rgba(34,211,238,.06)]' : 'border-white/[0.07] hover:border-white/20'}`}>
                  <span className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${group.color},transparent)` }} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{formatScenarioAssetName(asset)}</h3><p className="mt-1 truncate text-[10px] capitalize text-zinc-500">{asset.asset_type.replaceAll('_', ' ')} · {asset.zone}{sourceScenarioAssetName(asset) ? ` · source ${sourceScenarioAssetName(asset)}` : ''}</p></div>
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase" style={{ color: group.color }}>{asset.criticality}/5</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono"><div className="rounded-lg bg-white/[0.025] py-2"><strong className="block text-xs text-zinc-200">{degreeByAsset.get(asset.asset_id) || 0}</strong><span className="text-[8px] uppercase text-zinc-600">links</span></div><div className="rounded-lg bg-white/[0.025] py-2"><strong className="block text-xs text-zinc-200">{eventsByAsset.get(asset.asset_id) || 0}</strong><span className="text-[8px] uppercase text-zinc-600">events</span></div><div className="rounded-lg bg-white/[0.025] py-2"><strong className="block text-xs text-zinc-200">{Math.round(asset.evidence_coverage * 100)}%</strong><span className="text-[8px] uppercase text-zinc-600">coverage</span></div></div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[10px]"><span className="capitalize text-zinc-500">{asset.exposure} exposure</span><div className="flex gap-1.5">{selectedAssetId === asset.asset_id && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-cyan-200">Selected</span>}{isEntry && <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-amber-300">Entry</span>}{isCritical && <span className="rounded bg-rose-400/10 px-1.5 py-0.5 text-rose-300">Critical</span>}</div></div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-[#0b0f19] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Explain the evidence</div><h3 className="mt-1 text-base font-semibold text-white">Multidimensional Trust Vector</h3><p className="mt-1 text-xs text-zinc-400">Turn the selected asset’s evidence into an interactive five-axis 3D model for presentation.</p></div>
          <button onClick={() => setShowTrustVector((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-2.5 text-xs font-semibold text-cyan-100 transition-all hover:bg-cyan-300/15 hover:shadow-[0_0_25px_rgba(34,211,238,.12)]"><Eye className="h-4 w-4" />{showTrustVector ? 'Hide visualization' : 'Visualize trust vector'}</button>
        </div>
      </section>

      {showTrustVector && selectedAsset && <TrustVector3D asset={selectedAsset} relationships={data.relationships} events={data.events} onClose={() => setShowTrustVector(false)} />}
    </div>
  );
}
