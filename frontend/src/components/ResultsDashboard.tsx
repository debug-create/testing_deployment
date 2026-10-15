import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Box, Braces, Check, ChevronDown, Download, GitBranch, Globe2, KeyRound, Layers3, Shield, ShieldCheck, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Entity } from '../types';
import { ARJUN_CURRENT_ASSESSMENT_REASSESSED, ARJUN_ORIGINAL_ASSESSMENT, DEVRAJ_ASSESSMENT, NEHA_ASSESSMENT, PRIYA_ASSESSMENT } from '../data/recordingSeed';
import { IKORI_PERSONAS } from '../data/identityAliases';
import { EvaluationArtifact, loadLatestEvaluationResult } from '../data/evaluation/loadEvaluationResults';
import './ResultsDashboard.css';
import { ProductBrand, ProductHeaderFrame, ProductNavigation } from './ProductNavigation';

type ProductView = '3d-graph' | 'threat-map' | 'matrix' | 'access-requests';
interface ResultsDashboardProps { entities: Entity[]; onNavigateHome: () => void; onNavigateProduct: (view: ProductView) => void; }
type ScenarioKey = 'all' | 'resolved' | 'escalated' | 'sparse';

const scenarioData = [
  { id: '101', name: IKORI_PERSONAS.priya, outcome: 'resolved', raw: PRIYA_ASSESSMENT.raw_deviation, residual: PRIYA_ASSESSMENT.residual_risk, confidence: Math.round((PRIYA_ASSESSMENT.assessment_confidence ?? 0) * 100) },
  { id: '104', name: IKORI_PERSONAS.devraj, outcome: 'escalated', raw: DEVRAJ_ASSESSMENT.raw_deviation, residual: DEVRAJ_ASSESSMENT.residual_risk, confidence: Math.round((DEVRAJ_ASSESSMENT.assessment_confidence ?? 0) * 100) },
  { id: '107', name: IKORI_PERSONAS.arjun, outcome: 'resolved', raw: ARJUN_CURRENT_ASSESSMENT_REASSESSED.raw_deviation, residual: ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk, confidence: Math.round((ARJUN_CURRENT_ASSESSMENT_REASSESSED.assessment_confidence ?? 0) * 100) },
  { id: '112', name: IKORI_PERSONAS.neha, outcome: 'sparse', raw: NEHA_ASSESSMENT.raw_deviation, residual: NEHA_ASSESSMENT.residual_risk, confidence: Math.round((NEHA_ASSESSMENT.assessment_confidence ?? 0) * 100) },
] as const;

const outcomeColors: Record<string, string> = { resolved: '#34D399', escalated: '#FB3B57', sparse: '#F59E0B' };
const replayStages = [
  { label: 'Signal detected', detail: 'Off-pattern access grouped into one review episode', color: '#FB3B57' },
  { label: 'Twin correlated', detail: 'Identity, asset and context evidence connected', color: '#22D3EE' },
  { label: 'Context applied', detail: 'Approved evidence recalculated the assessment', color: '#A78BFA' },
  { label: 'Decision recorded', detail: 'Human-reviewed outcome preserved with provenance', color: '#34D399' },
];

export function ResultsDashboard({ entities, onNavigateHome, onNavigateProduct }: ResultsDashboardProps) {
  const [scenario, setScenario] = useState<ScenarioKey>('all');
  const [metric, setMetric] = useState<'risk' | 'confidence'>('risk');
  const [methodOpen, setMethodOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [evaluationArtifact, setEvaluationArtifact] = useState<EvaluationArtifact | null>(null);
  const [evaluationChecked, setEvaluationChecked] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStage((stage) => (stage + 1) % replayStages.length), 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadLatestEvaluationResult().then((artifact) => { setEvaluationArtifact(artifact); setEvaluationChecked(true); });
  }, []);

  const filteredData = useMemo(() => scenario === 'all' ? scenarioData : scenarioData.filter((item) => item.outcome === scenario), [scenario]);
  const activeCases = entities.filter((entity) => entity.hasActiveCase).length;
  const reassessmentDrop = ARJUN_ORIGINAL_ASSESSMENT.residual_risk - ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk;
  const reviewedCount = scenarioData.filter((item) => item.outcome !== 'sparse').length;

  const exportReport = () => {
    const payload = { report: 'IKORI Decision Evidence', source: 'Deterministic synthetic recording fixture', generatedAt: new Date().toISOString(), benchmarkMetrics: null, scenarioAssessments: scenarioData };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ikori-decision-evidence.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="results-page">
      <ProductHeaderFrame>
        <ProductBrand onHome={onNavigateHome} />
        <ProductNavigation active="results" onNavigate={(target) => target !== 'results' && onNavigateProduct(target)} />
        <div className="results-nav-status"><span /> Synthetic evaluation</div>
      </ProductHeaderFrame>

      <div className="results-shell">
        <section className="results-heading">
          <div><p className="results-eyebrow"><Sparkles size={13} /> Decision evidence</p><h1>Results <span>that explain themselves.</span></h1><p className="results-subtitle">See what changed, why it changed, and what still needs evidence.</p></div>
          <div className="results-heading-actions">
            <label className="results-filter"><span>Scenario cohort</span><select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioKey)}><option value="all">All scenarios</option><option value="resolved">Context resolved</option><option value="escalated">Escalated</option><option value="sparse">Sparse evidence</option></select><ChevronDown size={14} /></label>
            <button className="results-export" onClick={exportReport}><Download size={15} /> Export evidence</button>
          </div>
        </section>

        <div className="results-provenance"><Activity size={14} /><span>{evaluationArtifact ? <><strong>Evaluation artifact connected.</strong> {evaluationArtifact.modelVersion} · {evaluationArtifact.datasetVersion} · {evaluationArtifact.provenance}</> : <><strong>{evaluationChecked ? 'Awaiting backend evaluation artifact.' : 'Checking evaluation artifacts…'}</strong> Scenario values below remain seeded demonstrations, not precision, recall, F1, or held-out performance claims.</>}</span></div>

        <section className="results-kpis" aria-label="Results summary">
          <article className="is-cyan"><span>Scenarios reviewed</span><strong>{reviewedCount}/{scenarioData.length}</strong><small>One needs more evidence</small></article>
          <article className="is-violet"><span>Observed entities</span><strong>{entities.length}</strong><small>Current organization graph</small></article>
          <article className="is-amber"><span>Active decisions</span><strong>{activeCases}</strong><small>Human review remains visible</small></article>
          <article className="is-emerald"><span>Largest context change</span><strong>−{reassessmentDrop.toFixed(1)}</strong><small>Residual-risk points · Case 107</small></article>
        </section>

        <section className="results-grid">
          <article className="results-panel results-profile">
            <div className="results-panel-head"><div><span className="results-index">01</span><h2>Scenario outcomes</h2></div><div className="results-segmented"><button className={metric === 'risk' ? 'is-active' : ''} onClick={() => setMetric('risk')}>Risk</button><button className={metric === 'confidence' ? 'is-active' : ''} onClick={() => setMetric('confidence')}>Confidence</button></div></div>
            <p className="results-panel-copy">Recorded outcomes by scenario. Hover any bar for the exact value.</p>
            <div className="results-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredData} margin={{ top: 16, right: 8, left: -22, bottom: 0 }} barGap={7}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" strokeDasharray="3 7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} /><Tooltip cursor={{ fill: 'rgba(255,255,255,.03)' }} contentStyle={{ background: '#09090D', border: '1px solid rgba(255,255,255,.12)', color: '#fff', borderRadius: 10, fontSize: 12 }} />{metric === 'risk' ? <><Bar dataKey="raw" name="Raw deviation" fill="#334155" radius={[6, 6, 0, 0]} /><Bar dataKey="residual" name="Residual risk" radius={[6, 6, 0, 0]}>{filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}</Bar></> : <Bar dataKey="confidence" name="Assessment confidence" radius={[6, 6, 0, 0]}>{filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}</Bar>}</BarChart></ResponsiveContainer></div>
          </article>

          <article className="results-panel results-replay">
            <div className="results-panel-head"><div><span className="results-index">02</span><h2>Decision replay</h2></div><span className="results-live"><i /> Live sequence</span></div>
            <p className="results-panel-copy">How the digital twin turns telemetry into a reviewable decision.</p>
            <div className="results-replay-track"><span className="results-replay-line" />{replayStages.map((stage, index) => <button key={stage.label} className={activeStage === index ? 'is-active' : activeStage > index ? 'is-complete' : ''} onClick={() => setActiveStage(index)}><span className="results-stage-dot" style={{ '--stage-color': stage.color } as React.CSSProperties}>{activeStage > index ? <Check size={11} /> : index + 1}</span><span><strong>{stage.label}</strong><small>{stage.detail}</small></span></button>)}</div>
          </article>

          <article className="results-panel results-impact">
            <div className="results-panel-head"><div><span className="results-index">03</span><h2>Context intervention</h2></div><ShieldCheck size={17} /></div><p className="results-panel-copy">Case 107 · original and reassessed records remain side by side.</p>
            <div className="results-impact-values"><div><span>Before context</span><strong>{ARJUN_ORIGINAL_ASSESSMENT.residual_risk}</strong></div><div className="results-impact-arrow">→</div><div><span>After review</span><strong>{ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}</strong></div></div>
            <div className="results-impact-bar"><span style={{ width: `${ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}%` }} /></div><div className="results-impact-caption"><strong>−{reassessmentDrop.toFixed(1)} points</strong><span>Context changed the decision—not the original evidence.</span></div>
          </article>

          <article className="results-panel results-cases">
            <div className="results-panel-head"><div><span className="results-index">04</span><h2>Scenario status</h2></div><GitBranch size={17} /></div>
            <div className="results-case-list">{filteredData.map((item) => <div key={item.id}><span className="results-case-orb" style={{ background: outcomeColors[item.outcome], boxShadow: `0 0 18px ${outcomeColors[item.outcome]}55` }} /><div><strong>{item.name}</strong><small>Case {item.id} · {item.outcome}</small></div><div className="results-case-score"><strong>{item.residual}</strong><small>residual</small></div><div className="results-case-score"><strong>{item.confidence}%</strong><small>confidence</small></div></div>)}</div>
          </article>

          <article className="results-panel results-readiness">
            <div className="results-panel-head"><div><span className="results-index">05</span><h2>Evaluation readiness</h2></div><Braces size={17} /></div>
            <div className="results-readiness-body"><div className="results-ring"><div><strong>1/4</strong><span>inputs ready</span></div></div><div className="results-checks"><p className="is-ready"><Check size={13} /> Scenario fixture</p><p><span /> Held-out labels</p><p><span /> Prediction export</p><p><span /> Baseline comparison</p></div></div>
            <div className="results-benchmark-note"><strong>Performance metrics intentionally withheld</strong><span>Precision, recall, F1 and ranking quality need labelled evaluation data.</span></div>
          </article>
        </section>

        <section className="results-method"><button onClick={() => setMethodOpen((open) => !open)} aria-expanded={methodOpen}><span><Braces size={16} /><strong>Methodology &amp; provenance</strong><small>How to interpret these results</small></span><ChevronDown size={17} className={methodOpen ? 'is-open' : ''} /></button>{methodOpen && <div className="results-method-body"><p><strong>Dataset.</strong> Deterministic synthetic recording fixture with four canonical assessment scenarios.</p><p><strong>Displayed.</strong> Raw deviation, residual risk and confidence come from seeded assessment records.</p><p><strong>Not claimed.</strong> No precision, recall, F1, ranking score or false-positive rate is fabricated.</p><p><strong>Next input.</strong> Connect versioned labels and predictions before treating this as model performance.</p></div>}</section>
      </div>
    </main>
  );
}
