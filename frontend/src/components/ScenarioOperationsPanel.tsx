import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, GitCompareArrows, ListChecks, Route, WalletCards } from 'lucide-react';
import {
  formatScenarioAssetName,
  formatScenarioTimestamp,
  getScenarioInterventions,
  loadScenarioGraphData,
  ScenarioGraphData,
  ScenarioGraphRelationship,
  ScenarioIntervention,
} from '../data/model_input/loadScenarioIntelligence';

type PanelTab = 'catalogue' | 'compare' | 'ledger';

function categoryLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FixCard({ fix, selected, onSelect }: { fix: ScenarioIntervention; selected?: boolean; onSelect?: () => void }) {
  return <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition-all ${selected ? 'border-cyan-300/45 bg-cyan-300/[0.07]' : 'border-white/[0.07] bg-white/[0.025] hover:border-white/20'}`}>
    <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold text-white">{fix.name}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{categoryLabel(fix.category)}</div></div><span className="rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-2 py-1 font-mono text-[10px] text-amber-200">{fix.cost_units} cost</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5 text-[9px]"><span className={`rounded px-2 py-1 ${fix.requires_approval ? 'bg-rose-400/10 text-rose-200' : 'bg-emerald-400/10 text-emerald-200'}`}>{fix.requires_approval ? 'Approval required' : 'No approval required'}</span><span className="rounded bg-violet-400/10 px-2 py-1 text-violet-200">{fix.affected_edge_ids.length} candidate route{fix.affected_edge_ids.length === 1 ? '' : 's'}</span><span className="rounded bg-white/[0.04] px-2 py-1 text-slate-400">{fix.side_effects.length} side effect{fix.side_effects.length === 1 ? '' : 's'}</span></div>
  </button>;
}

export function ScenarioOperationsPanel({ scenarioId }: { scenarioId: string }) {
  const [data, setData] = useState<ScenarioGraphData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<PanelTab>('catalogue');
  const fixes = useMemo(() => getScenarioInterventions(scenarioId), [scenarioId]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  useEffect(() => {
    let active = true;
    loadScenarioGraphData(scenarioId).then((graph) => { if (active) setData(graph); });
    setLeftId(fixes[0]?.intervention_id || '');
    setRightId(fixes[1]?.intervention_id || fixes[0]?.intervention_id || '');
    return () => { active = false; };
  }, [scenarioId, fixes]);

  const left = fixes.find((fix) => fix.intervention_id === leftId) || fixes[0];
  const right = fixes.find((fix) => fix.intervention_id === rightId) || fixes[1] || fixes[0];
  const assetMap = new Map(data?.assets.map((asset) => [asset.asset_id, formatScenarioAssetName(asset)]) || []);
  const edgeMap = new Map<string, ScenarioGraphRelationship>((data?.relationships || []).map((edge) => [edge.edge_id, edge]));
  const ledger = (data?.events || []).slice().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).slice(-7).reverse();

  const tabs: Array<{ id: PanelTab; label: string; icon: React.ReactNode }> = [
    { id: 'catalogue', label: 'Preventive measures', icon: <ListChecks className="h-3.5 w-3.5" /> },
    { id: 'compare', label: 'Fix comparison', icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
    { id: 'ledger', label: 'Investigation ledger', icon: <WalletCards className="h-3.5 w-3.5" /> },
  ];

  return <section className="ikori-operations-panel overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19] shadow-xl">
    <header className={`${expanded ? 'border-b border-white/10' : ''}`}>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="group flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between">
        <div><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">Scenario explainer · {scenarioId}</div><h2 className="mt-1 text-sm font-semibold text-white">Evidence-linked preventive controls</h2><p className="mt-1 text-[10px] text-slate-400">Open the seeded control catalogue, route comparison, and investigation replay.</p></div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto"><div className="hidden items-center gap-1.5 text-[9px] font-mono text-slate-400 md:flex"><span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">{fixes.length} measures</span><span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">Compare routes</span><span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">Replay evidence</span></div><span className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white transition-colors group-hover:border-cyan-300/30"><span>{expanded ? 'Close explainer' : 'Open explainer'}</span><ChevronDown className={`h-3.5 w-3.5 text-cyan-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} /></span></div>
      </button>
      {expanded && <div className="flex max-w-full gap-1 overflow-x-auto border-t border-white/[0.06] bg-black/15 p-2 sm:justify-end">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold ${tab === item.id ? 'bg-[#C6613F] text-black' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>{item.icon}{item.label}</button>)}</div>}
    </header>

    {expanded && tab === 'catalogue' && <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{fixes.map((fix) => <React.Fragment key={fix.intervention_id}><FixCard fix={fix} onSelect={() => { setLeftId(fix.intervention_id); setTab('compare'); }} /></React.Fragment>)}</div>}

    {expanded && tab === 'compare' && left && right && <div className="p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {[{ fix: left, setter: setLeftId }, { fix: right, setter: setRightId }].map(({ fix, setter }, index) => <React.Fragment key={`${index}-${fix.intervention_id}`}>{index === 1 && <div className="hidden items-center px-2 lg:flex"><span className="rounded-full border border-white/10 p-2 text-slate-500">VS</span></div>}<div className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><select value={fix.intervention_id} onChange={(event) => setter(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#080c16] px-3 py-2 text-xs text-white">{fixes.map((option) => <option key={option.intervention_id} value={option.intervention_id}>{option.name}</option>)}</select><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white/[0.03] p-2"><strong className="block text-sm text-amber-200">{fix.cost_units}</strong><span className="text-[8px] uppercase text-slate-500">Cost units</span></div><div className="rounded-lg bg-white/[0.03] p-2"><strong className="block text-sm text-violet-200">{fix.affected_edge_ids.length}</strong><span className="text-[8px] uppercase text-slate-500">Routes</span></div><div className="rounded-lg bg-white/[0.03] p-2"><strong className={`block text-sm ${fix.requires_approval ? 'text-rose-200' : 'text-emerald-200'}`}>{fix.requires_approval ? 'Yes' : 'No'}</strong><span className="text-[8px] uppercase text-slate-500">Approval</span></div></div><div className="mt-4 space-y-2"><div className="text-[9px] uppercase tracking-wider text-slate-500">Affected candidate relationships</div>{fix.affected_edge_ids.map((edgeId) => { const edge = edgeMap.get(edgeId); return <div key={edgeId} className="flex items-center gap-2 rounded-lg bg-white/[0.025] p-2 text-[10px] text-slate-300"><Route className="h-3.5 w-3.5 shrink-0 text-cyan-300" />{edge ? `${assetMap.get(edge.source_id) || edge.source_id} → ${assetMap.get(edge.target_id) || edge.target_id}` : edgeId}<span className="ml-auto font-mono text-slate-500">{edgeId}</span></div>; })}</div><div className="mt-4 space-y-2"><div className="text-[9px] uppercase tracking-wider text-slate-500">Declared side effects</div>{fix.side_effects.length ? fix.side_effects.map((effect, effectIndex) => <div key={`${effect.type}-${effectIndex}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] text-slate-300"><span className={`mr-2 rounded px-1.5 py-0.5 uppercase ${effect.severity === 'high' ? 'bg-rose-400/10 text-rose-200' : effect.severity === 'medium' ? 'bg-amber-400/10 text-amber-200' : 'bg-slate-400/10 text-slate-300'}`}>{effect.severity}</span>{categoryLabel(effect.type)} · {effect.affected_asset_ids.map((id) => assetMap.get(id) || id).join(', ')}</div>) : <div className="text-[10px] text-slate-500">No side effects declared in model_input.</div>}</div><div className="mt-4 text-[9px] text-slate-500">Effects listed here are route/configuration changes supplied by the catalogue. Backend what-if recomputation is still pending.</div></div></React.Fragment>)}</div>
    </div>}

    {expanded && tab === 'ledger' && <div className="p-4"><div className="relative ml-2 space-y-3 border-l border-cyan-300/20 pl-5">{ledger.map((event) => <article key={event.event_id} className="relative rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className="absolute -left-[25px] top-4 h-2 w-2 rounded-full bg-cyan-300 ring-4 ring-[#0b0f19]" /><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" /><strong className="text-xs capitalize text-white">{event.event_type.replaceAll('_', ' ')}</strong></div><span className="font-mono text-[9px] text-slate-500">{formatScenarioTimestamp(event.timestamp)}</span></div><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400"><span>{event.source}</span>{event.source_entity_raw && <><ArrowRight className="h-3 w-3" /><span>{assetMap.get(event.source_entity_raw) || event.source_entity_raw}</span></>}{event.target_entity_raw && <><ArrowRight className="h-3 w-3" /><span>{assetMap.get(event.target_entity_raw) || event.target_entity_raw}</span></>}</div></article>)}</div>{!ledger.length && <div className="p-8 text-center text-xs text-slate-500">No matching scenario events are available.</div>}</div>}
  </section>;
}
