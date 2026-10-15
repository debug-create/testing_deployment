import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Billboard, Line, OrbitControls, Text } from '@react-three/drei';
import { Activity, Fingerprint, Info, MapPin, Network, Pause, Play, Radar, Rotate3D, ShieldCheck } from 'lucide-react';
import * as THREE from 'three';
import {
  formatScenarioAssetName,
  ScenarioGraphAsset,
  ScenarioGraphEvent,
  ScenarioGraphRelationship,
} from '../data/model_input/loadScenarioIntelligence';

interface TrustVector3DProps {
  asset: ScenarioGraphAsset;
  relationships: ScenarioGraphRelationship[];
  events: ScenarioGraphEvent[];
  onClose: () => void;
}

interface AxisReading {
  label: string;
  value: number | null;
  source: string;
  note: string;
  proxy?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

type ReplayPhase = 0 | 1 | 2;

const REPLAY_PHASES = [
  { label: 'State 1', title: 'Normal employee baseline', detail: 'Expected identity, device and scope patterns form the reference twin.', color: '#34d399' },
  { label: 'State 2', title: 'Digital twin triggered', detail: 'An authentication deviation starts probabilistic path search.', color: '#fbbf24' },
  { label: 'State 3', title: 'Evidence converged · action taken', detail: 'Growing evidence localizes the anomalous session and isolates its candidate route.', color: '#fb7185' },
] as const;

const PHASE_VALUES: Record<ReplayPhase, number[]> = {
  0: [0.92, 0.86, 0.88, 0.82, 0.38],
  1: [0.71, 0.58, 0.55, 0.49, 0.69],
  2: [0.46, 0.31, 0.27, 0.22, 0.94],
};

const PROBABILITY_STATES = [
  { prior: 0.18, posterior: 0.18, updates: [{ label: 'Baseline prior only', llr: 0 }] },
  { prior: 0.18, posterior: 0.43, updates: [{ label: 'Authentication deviation', llr: 0.70 }, { label: 'Device/context mismatch', llr: 0.55 }] },
  { prior: 0.18, posterior: 0.90, updates: [{ label: 'Authentication deviation', llr: 0.70 }, { label: 'Device/context mismatch', llr: 0.55 }, { label: 'Privilege expansion', llr: 0.80 }, { label: 'Critical target access', llr: 0.90 }, { label: 'Secret exposure signal', llr: 0.80 }] },
] as const;

const MARKOV_MATRIX = [
  [0.82, 0.17, 0.01],
  [0.12, 0.43, 0.45],
  [0.04, 0.10, 0.86],
] as const;

const MONTE_CARLO_OUTCOMES = [
  [{ label: 'No escalation', value: 82 }, { label: 'Needs review', value: 17 }, { label: 'Contained', value: 1 }],
  [{ label: 'No escalation', value: 31 }, { label: 'Needs review', value: 46 }, { label: 'Contained', value: 23 }],
  [{ label: 'No escalation', value: 5 }, { label: 'Needs review', value: 13 }, { label: 'Contained', value: 82 }],
] as const;

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function TrustShape({ readings, activeAxis, onAxis, phase }: { readings: AxisReading[]; activeAxis: number; onAxis: (index: number) => void; phase: ReplayPhase }) {
  const radius = 3.05;
  const points = readings.map((reading, index) => {
    const angle = Math.PI / 2 + (index * Math.PI * 2) / readings.length;
    const magnitude = reading.value ?? 0.08;
    return new THREE.Vector3(Math.cos(angle) * radius * magnitude, Math.sin(angle) * radius * magnitude, 0.28 + magnitude * 0.35);
  });
  const ring = (scale: number, z = 0) => readings.map((_, index) => {
    const angle = Math.PI / 2 + (index * Math.PI * 2) / readings.length;
    return new THREE.Vector3(Math.cos(angle) * radius * scale, Math.sin(angle) * radius * scale, z);
  });
  const shapeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, point.y) : shape.lineTo(point.x, point.y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
    geometry.translate(0, 0, 0.12);
    return geometry;
  }, [readings]);

  return (
    <group rotation={[-0.08, 0.06, 0]}>
      {[0.25, 0.5, 0.75, 1].map((scale) => <Line key={scale} points={[...ring(scale), ring(scale)[0]]} color={scale === 1 ? '#475569' : '#1e293b'} lineWidth={scale === 1 ? 1.2 : 0.7} transparent opacity={0.8} />)}
      {readings.map((_, index) => <Line key={`spoke-${index}`} points={[[0, 0, 0], ring(1)[index]]} color="#334155" lineWidth={0.8} />)}
      <mesh geometry={shapeGeometry}>
        <meshStandardMaterial color={REPLAY_PHASES[phase].color} emissive={phase === 0 ? '#059669' : phase === 1 ? '#d97706' : '#be123c'} emissiveIntensity={0.62} transparent opacity={0.5} side={THREE.DoubleSide} roughness={0.24} metalness={0.22} />
      </mesh>
      <Line points={[...points, points[0]]} color={REPLAY_PHASES[phase].color} lineWidth={2.4} />
      {points.map((point, index) => (
        <group key={readings[index].label} position={point}>
          <mesh onPointerEnter={() => onAxis(index)} onClick={() => onAxis(index)} scale={index === activeAxis ? 1.35 : 1}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color={readings[index].value === null ? '#f59e0b' : index === activeAxis ? '#ffffff' : REPLAY_PHASES[phase].color} emissive={index === activeAxis ? '#22d3ee' : REPLAY_PHASES[phase].color} emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
      {readings.map((reading, index) => {
        const endpoint = ring(1.22, 0.08)[index];
        return (
          <Billboard key={`label-${reading.label}`} position={endpoint} follow>
            <Text fontSize={0.19} color={index === activeAxis ? '#ecfeff' : '#94a3b8'} anchorX="center" anchorY="middle" outlineColor="#020617" outlineWidth={0.02}>
              {reading.label.toUpperCase()}
            </Text>
          </Billboard>
        );
      })}
      <mesh position={[0, 0, 0.65]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#e0f2fe" emissive={REPLAY_PHASES[phase].color} emissiveIntensity={1.8} />
      </mesh>
      <pointLight position={[0, 0, 2]} color="#22d3ee" intensity={18} distance={7} />
    </group>
  );
}

export function TrustVector3D({ asset, relationships, events, onClose }: TrustVector3DProps) {
  const [activeAxis, setActiveAxis] = useState(0);
  const [phase, setPhase] = useState<ReplayPhase>(0);
  const [playing, setPlaying] = useState(false);
  const connected = relationships.filter((edge) => edge.source_id === asset.asset_id || edge.target_id === asset.asset_id);
  const relatedEvents = events.filter((event) => event.source_entity_raw === asset.asset_id || event.target_entity_raw === asset.asset_id);
  const baseReadings: AxisReading[] = [
    { label: 'Identity', value: asset.identity_confidence, source: 'identity_confidence', note: 'Entity-resolution confidence supplied by model_input.', icon: Fingerprint },
    { label: 'Device / location', value: asset.configuration_confidence, source: 'configuration_confidence proxy', note: 'Configuration confidence is shown as a temporary device-context proxy; location attestation is not present.', proxy: true, icon: MapPin },
    { label: 'Operational context', value: mean(relatedEvents.map((event) => event.collection_confidence).filter((value): value is number => typeof value === 'number')), source: 'matching event collection confidence', note: relatedEvents.length ? `${relatedEvents.length} matching telemetry events contribute context.` : 'No matching event confidence is available for this entity.', icon: Activity },
    { label: 'Requested scope', value: mean(connected.map((edge) => edge.prior_probability)), source: 'candidate relationship prior proxy', note: 'Candidate topology prior is a scope proxy only; it is not access approval or attack feasibility.', proxy: true, icon: Network },
    { label: 'Evidence coverage', value: asset.evidence_coverage, source: 'evidence_coverage', note: 'Coverage describes available evidence, not whether the entity is compromised.', icon: Radar },
  ];
  const readings = baseReadings.map((reading, index) => ({
    ...reading,
    value: PHASE_VALUES[phase][index],
    source: `${reading.source} · staged replay`,
  }));
  const active = readings[activeAxis];
  const probability = PROBABILITY_STATES[phase];
  const outcomes = MONTE_CARLO_OUTCOMES[phase];

  useEffect(() => {
    setPhase(0);
    setPlaying(false);
  }, [asset.asset_id]);

  useEffect(() => {
    if (!playing) return;
    if (phase === 2) {
      const stop = window.setTimeout(() => setPlaying(false), 1200);
      return () => window.clearTimeout(stop);
    }
    const timer = window.setTimeout(() => setPhase((value) => (value + 1) as ReplayPhase), 3800);
    return () => window.clearTimeout(timer);
  }, [phase, playing]);

  const startReplay = () => {
    setPhase(0);
    setActiveAxis(0);
    setPlaying(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#070d16] shadow-[0_0_60px_rgba(34,211,238,.07)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-400/[0.07] to-transparent px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300"><Rotate3D className="h-4 w-4" /><span className="font-mono text-[10px] uppercase tracking-[0.18em]">Interactive evidence model</span></div>
          <h3 className="mt-1 text-base font-semibold text-white">Multidimensional Trust Vector · {formatScenarioAssetName(asset)}</h3>
          <p className="mt-1 text-xs text-slate-400">Run the guided trace, then drag to rotate, scroll to zoom, or inspect an axis.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={playing ? () => setPlaying(false) : startReplay} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/15">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause trace' : phase === 2 ? 'Replay 3 states' : 'Play 3-state trace'}</button>
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">Close</button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-px border-b border-white/10 bg-white/10 md:grid-cols-3">
        {REPLAY_PHASES.map((item, index) => <button key={item.label} onClick={() => { setPhase(index as ReplayPhase); setPlaying(false); }} className={`bg-[#070d16] px-4 py-3 text-left transition-colors ${phase === index ? 'bg-white/[0.055]' : 'hover:bg-white/[0.025]'}`}><div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-mono" style={{ borderColor: item.color, color: item.color }}>{index + 1}</span><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">{item.label}</span>{phase === index && playing && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: item.color }} />}</div><div className="mt-1 text-xs font-semibold text-white">{item.title}</div><div className="mt-1 text-[10px] text-slate-400">{item.detail}</div></button>)}
      </div>
      <div className="grid min-h-[530px] grid-cols-1 xl:grid-cols-[1.55fr_.85fr]">
        <div className="relative min-h-[420px] border-b border-white/10 xl:border-b-0 xl:border-r">
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
            <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Geometry</div>
            <div className="mt-1 text-[11px] text-slate-300">Distance from centre = supplied confidence / proxy</div>
          </div>
          <Canvas camera={{ position: [0, -1.6, 8.3], fov: 44 }} dpr={[1, 1.7]}>
            <color attach="background" args={['#040811']} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[4, 4, 7]} intensity={2.1} color="#bae6fd" />
            <TrustShape readings={readings} activeAxis={activeAxis} onAxis={setActiveAxis} phase={phase} />
            <OrbitControls enablePan={false} minDistance={5.8} maxDistance={11} autoRotate autoRotateSpeed={0.55} />
          </Canvas>
        </div>
        <aside className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Axis inspector</div>
          <div className="mt-3 space-y-2">
            {readings.map((reading, index) => {
              const Icon = reading.icon;
              return (
                <button key={reading.label} onClick={() => setActiveAxis(index)} className={`w-full rounded-xl border p-3 text-left transition-all ${index === activeAxis ? 'border-cyan-300/40 bg-cyan-300/[0.07]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'}`}>
                  <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-white"><Icon className="h-3.5 w-3.5 text-cyan-300" />{reading.label}</span><span className={`font-mono text-xs ${reading.value === null ? 'text-amber-300' : 'text-cyan-200'}`}>{reading.value === null ? 'N/A' : `${Math.round(reading.value * 100)}%`}</span></div>
                  <div className="mt-1.5 truncate text-[9px] uppercase tracking-wider text-slate-500">{reading.source}{reading.proxy ? ' · proxy' : ''}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100"><Info className="h-3.5 w-3.5" />{active.label}</div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{active.note}</p>
          </div>
          {phase === 2 && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-200"><ShieldCheck className="h-4 w-4" />Preventive action staged</div><div className="mt-1 text-[10px] leading-relaxed text-slate-300">Candidate route isolated, session placed on protective hold, and human approval requested for credential rotation.</div></div>}
          <div className="mt-4 text-[10px] leading-relaxed text-slate-500">This is a five-axis evidence view, not a combined trust score. Replay values are seeded presentation states; candidate priors are not confirmed attacker movement.</div>
        </aside>
      </div>

      <div className="grid grid-cols-1 border-t border-white/10 xl:grid-cols-3">
        <section className="border-b border-white/10 p-5 xl:border-b-0 xl:border-r">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">Probability explanation</div>
          <h4 className="mt-1 text-sm font-semibold text-white">Prior → evidence → posterior</h4>
          <div className="mt-4 flex items-center gap-3"><div className="text-center"><div className="text-lg font-bold text-slate-200">{Math.round(probability.prior * 100)}%</div><div className="text-[9px] uppercase text-slate-500">Prior</div></div><div className="h-px flex-1 bg-gradient-to-r from-slate-600 via-amber-400 to-rose-400" /><div className="text-center"><div className="text-lg font-bold text-rose-300">{Math.round(probability.posterior * 100)}%</div><div className="text-[9px] uppercase text-slate-500">Prototype posterior</div></div></div>
          <div className="mt-3 space-y-1.5">{probability.updates.map((update) => <div key={update.label} className="flex items-center justify-between rounded-lg bg-white/[0.025] px-2.5 py-2 text-[10px]"><span className="text-slate-300">{update.label}</span><span className="font-mono text-amber-300">{update.llr ? `LLR +${update.llr.toFixed(2)}` : 'reference'}</span></div>)}</div>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Seeded log-likelihood illustration. Backend evidence weights will replace these prototype updates.</p>
        </section>

        <section className="border-b border-white/10 p-5 xl:border-b-0 xl:border-r">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">Markov transition model</div>
          <h4 className="mt-1 text-sm font-semibold text-white">Next-state probability matrix</h4>
          <div className="mt-4 grid grid-cols-[64px_repeat(3,1fr)] gap-1 text-center font-mono text-[9px]"><span /><span className="text-slate-500">Normal</span><span className="text-slate-500">Trigger</span><span className="text-slate-500">Converged</span>{MARKOV_MATRIX.flatMap((row, rowIndex) => [<span key={`r-${rowIndex}`} className={`flex items-center text-left ${phase === rowIndex ? 'text-violet-200' : 'text-slate-500'}`}>{REPLAY_PHASES[rowIndex].label}</span>, ...row.map((value, colIndex) => <span key={`${rowIndex}-${colIndex}`} className={`rounded-md border px-1 py-2 ${phase === rowIndex ? 'border-violet-300/30 bg-violet-300/10 text-violet-100' : 'border-white/[0.06] bg-white/[0.02] text-slate-400'}`}>{Math.round(value * 100)}%</span>)])}</div>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Rows sum to 100%. The highlighted row represents the current replay state; this matrix is seeded until transition estimates arrive.</p>
        </section>

        <section className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Monte Carlo path search</div>
          <div className="flex items-center justify-between"><h4 className="mt-1 text-sm font-semibold text-white">1,000 seeded traces</h4><span className="text-[9px] font-mono text-cyan-300">STATE {phase + 1}</span></div>
          <div className="mt-4 space-y-3">{outcomes.map((outcome, index) => <div key={outcome.label}><div className="mb-1 flex justify-between text-[10px]"><span className="text-slate-400">{outcome.label}</span><span className="font-mono text-slate-200">{outcome.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className={`h-full rounded-full transition-all duration-700 ${index === 2 ? 'bg-cyan-300' : index === 1 ? 'bg-amber-300' : 'bg-slate-500'}`} style={{ width: `${outcome.value}%` }} /></div></div>)}</div>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Outcome distribution is separate from the Markov transition matrix. It illustrates repeated path sampling, not a measured production result.</p>
        </section>
      </div>
    </section>
  );
}
