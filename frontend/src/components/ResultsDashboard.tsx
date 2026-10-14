import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Braces,
  Check,
  ChevronDown,
  Download,
  FlaskConical,
  Info,
  Layers3,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Entity } from '../types';
import {
  ARJUN_CURRENT_ASSESSMENT_REASSESSED,
  ARJUN_ORIGINAL_ASSESSMENT,
  DEVRAJ_ASSESSMENT,
  NEHA_ASSESSMENT,
  PRIYA_ASSESSMENT,
} from '../data/recordingSeed';
import { useTheme } from '../context/ThemeContext';
import './ResultsDashboard.css';

interface ResultsDashboardProps {
  entities: Entity[];
  onNavigateHome: () => void;
  onNavigateProduct: () => void;
}

type ScenarioKey = 'all' | 'resolved' | 'escalated' | 'sparse';

const scenarioData = [
  {
    id: '101',
    name: 'Priya',
    outcome: 'resolved',
    raw: PRIYA_ASSESSMENT.raw_deviation,
    residual: PRIYA_ASSESSMENT.residual_risk,
    confidence: Math.round((PRIYA_ASSESSMENT.assessment_confidence ?? 0) * 100),
  },
  {
    id: '104',
    name: 'Devraj',
    outcome: 'escalated',
    raw: DEVRAJ_ASSESSMENT.raw_deviation,
    residual: DEVRAJ_ASSESSMENT.residual_risk,
    confidence: Math.round((DEVRAJ_ASSESSMENT.assessment_confidence ?? 0) * 100),
  },
  {
    id: '107',
    name: 'Arjun',
    outcome: 'resolved',
    raw: ARJUN_CURRENT_ASSESSMENT_REASSESSED.raw_deviation,
    residual: ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk,
    confidence: Math.round((ARJUN_CURRENT_ASSESSMENT_REASSESSED.assessment_confidence ?? 0) * 100),
  },
  {
    id: '112',
    name: 'Neha',
    outcome: 'sparse',
    raw: NEHA_ASSESSMENT.raw_deviation,
    residual: NEHA_ASSESSMENT.residual_risk,
    confidence: Math.round((NEHA_ASSESSMENT.assessment_confidence ?? 0) * 100),
  },
] as const;

const outcomeColors: Record<string, string> = {
  resolved: '#d9d2b7',
  escalated: '#ef3340',
  sparse: '#ca7a43',
};

function EmptyBenchmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`results-empty ${compact ? 'is-compact' : ''}`}>
      <div className="results-empty-icon"><Braces size={18} /></div>
      <div>
        <strong>Evaluation artifact not connected</strong>
        <p>Precision, recall, F1, false-positive rate and ranking scores require a held-out labelled export.</p>
      </div>
    </div>
  );
}

export function ResultsDashboard({ entities, onNavigateHome, onNavigateProduct }: ResultsDashboardProps) {
  const { theme, setTheme } = useTheme();
  const [scenario, setScenario] = useState<ScenarioKey>('all');
  const [methodOpen, setMethodOpen] = useState(false);
  const [metric, setMetric] = useState<'risk' | 'confidence'>('risk');

  const filteredData = useMemo(
    () => scenario === 'all' ? scenarioData : scenarioData.filter((item) => item.outcome === scenario),
    [scenario],
  );

  const activeCases = entities.filter((entity) => entity.hasActiveCase).length;
  const unresolvedCases = entities.filter((entity) => entity.details?.currentAssessment?.unresolved_event_count).length;
  const reassessmentDrop = ARJUN_ORIGINAL_ASSESSMENT.residual_risk - ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk;

  const exportReport = () => {
    const payload = {
      report: 'IKORI Results & Evaluation',
      source: 'Deterministic recording fixture — synthetic data',
      generatedAt: new Date().toISOString(),
      benchmarkMetrics: null,
      reason: 'No held-out labelled evaluation artifact is connected.',
      scenarioAssessments: scenarioData,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ikori-results-recording-fixture.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="results-page">
      <header className="results-nav">
        <button className="results-brand" onClick={onNavigateHome} aria-label="Go to IKORI home">
          <span className="results-brand-mark">✣</span>
          <span>IKORI</span>
        </button>
        <nav aria-label="Product navigation" className="results-nav-links">
          <button onClick={onNavigateProduct}>Command Center</button>
          <button onClick={onNavigateProduct}>Attack Graph</button>
          <button onClick={onNavigateProduct}>Evidence</button>
          <button className="is-active">Results</button>
        </nav>
        <div className="results-nav-actions">
          <div className="results-theme-switch" aria-label="Theme selector">
            <button className={theme === 'royal-red' ? 'is-active' : ''} onClick={() => setTheme('royal-red')}><MoonStar size={13} /> Royal</button>
            <button className={theme === 'professional' ? 'is-active' : ''} onClick={() => setTheme('professional')}><Sun size={13} /> Professional</button>
          </div>
          <button className="results-back" onClick={onNavigateProduct}><ArrowLeft size={15} /> Console</button>
        </div>
      </header>

      <div className="results-shell">
        <section className="results-heading">
          <div>
            <p className="results-eyebrow"><Sparkles size={13} /> Evaluation workspace / recording fixture</p>
            <h1>Results <span>&amp; Evaluation</span></h1>
            <p className="results-subtitle">Model readiness, scenario behaviour and decision evidence — with provenance kept visible.</p>
          </div>
          <div className="results-heading-actions">
            <label className="results-filter">
              <span>Scenario</span>
              <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioKey)}>
                <option value="all">All canonical cases</option>
                <option value="resolved">Context resolved</option>
                <option value="escalated">Escalated</option>
                <option value="sparse">Sparse baseline</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button className="results-export" onClick={exportReport}><Download size={15} /> Export fixture report</button>
          </div>
        </section>

        <div className="results-provenance">
          <Info size={15} />
          <span><strong>Synthetic recording data.</strong> Scenario figures below are read from the deterministic in-app fixture. They are not held-out benchmark claims.</span>
        </div>

        <section className="results-kpis" aria-label="Evaluation summary">
          <article><span>Evaluation set</span><strong>{scenarioData.length}</strong><small>Canonical scenarios</small></article>
          <article><span>Observed entities</span><strong>{entities.length}</strong><small>Current fixture graph</small></article>
          <article><span>Active cases</span><strong>{activeCases}</strong><small>Seeded case records</small></article>
          <article className="is-accent"><span>Largest reassessment</span><strong>−{reassessmentDrop.toFixed(1)}</strong><small>Residual-risk points · Case 107</small></article>
        </section>

        <section className="results-grid">
          <article className="results-panel results-panel-wide">
            <div className="results-panel-head">
              <div><span className="results-index">01</span><h2>Scenario assessment profile</h2></div>
              <div className="results-segmented">
                <button className={metric === 'risk' ? 'is-active' : ''} onClick={() => setMetric('risk')}>Risk</button>
                <button className={metric === 'confidence' ? 'is-active' : ''} onClick={() => setMetric('confidence')}>Confidence</button>
              </div>
            </div>
            <p className="results-panel-copy">A direct view of the recorded assessments. Switch dimensions or filter the scenario cohort above.</p>
            <div className="results-chart" role="img" aria-label="Scenario assessment bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData} margin={{ top: 12, right: 10, left: -24, bottom: 0 }} barGap={6}>
                  <CartesianGrid vertical={false} stroke="var(--results-grid)" strokeDasharray="2 6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'var(--results-hover)' }} contentStyle={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-theme)', color: 'var(--text-main)', borderRadius: 2, fontSize: 12 }} />
                  {metric === 'risk' ? (
                    <>
                      <Bar dataKey="raw" name="Raw deviation" fill="#6f6870" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="residual" name="Residual risk" radius={[2, 2, 0, 0]}>
                        {filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}
                      </Bar>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    </>
                  ) : (
                    <Bar dataKey="confidence" name="Assessment confidence" radius={[2, 2, 0, 0]}>
                      {filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="results-panel results-readiness">
            <div className="results-panel-head"><div><span className="results-index">02</span><h2>Evaluation readiness</h2></div></div>
            <div className="results-ring-wrap">
              <div className="results-ring" aria-label="One of four benchmark inputs connected"><div><strong>1/4</strong><span>inputs ready</span></div></div>
              <ul>
                <li className="is-ready"><Check size={13} /> Deterministic scenario fixture</li>
                <li><span /> Held-out labels</li>
                <li><span /> Prediction export</li>
                <li><span /> Baseline comparison</li>
              </ul>
            </div>
          </article>

          <article className="results-panel">
            <div className="results-panel-head"><div><span className="results-index">03</span><h2>Primary model comparison</h2></div><BarChart3 size={17} /></div>
            <div className="results-table-head"><span>Model</span><span>Precision</span><span>Recall</span><span>F1</span></div>
            <div className="results-table-row"><strong>IKORI scoring</strong><span>—</span><span>—</span><span>—</span></div>
            <div className="results-table-row"><strong>Baseline</strong><span>—</span><span>—</span><span>—</span></div>
            <EmptyBenchmark compact />
          </article>

          <article className="results-panel">
            <div className="results-panel-head"><div><span className="results-index">04</span><h2>Context intervention</h2></div><ShieldCheck size={17} /></div>
            <p className="results-panel-copy">Case 107 · approved context revision, preserved before/after assessments.</p>
            <div className="results-duel">
              <div><span>Before</span><strong>{ARJUN_ORIGINAL_ASSESSMENT.residual_risk}</strong><small>Residual risk</small></div>
              <div className="results-duel-arrow"><ArrowUpRight size={21} /></div>
              <div className="is-after"><span>After</span><strong>{ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}</strong><small>Residual risk</small></div>
            </div>
            <div className="results-delta"><span style={{ width: `${ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}%` }} /><strong>−{reassessmentDrop.toFixed(1)} points</strong></div>
          </article>

          <article className="results-panel results-panel-wide">
            <div className="results-panel-head"><div><span className="results-index">05</span><h2>Attack-path &amp; ranking evaluation</h2></div><Layers3 size={17} /></div>
            <p className="results-panel-copy">The product visualises graph paths, but this repository contains no labelled path-ranking benchmark or NDCG output.</p>
            <EmptyBenchmark />
          </article>

          <article className="results-panel results-findings">
            <div className="results-panel-head"><div><span className="results-index">06</span><h2>Key findings</h2></div><FlaskConical size={17} /></div>
            <ol>
              <li><span>01</span><p><strong>Context can materially change triage.</strong> The recorded Case 107 reassessment preserves a {reassessmentDrop.toFixed(1)}-point residual-risk reduction.</p></li>
              <li><span>02</span><p><strong>Uncertainty remains explicit.</strong> The sparse-baseline scenario retains {NEHA_ASSESSMENT.unresolved_event_count} unresolved events and 24% assessment confidence.</p></li>
              <li><span>03</span><p><strong>Performance remains unclaimed.</strong> {unresolvedCases} current fixture cases contain unresolved evidence; held-out labels are still required for benchmark metrics.</p></li>
            </ol>
          </article>
        </section>

        <section className="results-method">
          <button onClick={() => setMethodOpen((open) => !open)} aria-expanded={methodOpen}>
            <span><Braces size={16} /><strong>Methodology &amp; provenance</strong><small>How to interpret this page</small></span>
            <ChevronDown size={17} className={methodOpen ? 'is-open' : ''} />
          </button>
          {methodOpen && (
            <div className="results-method-body">
              <p><strong>Dataset.</strong> Deterministic synthetic recording fixture containing four canonical assessment scenarios and the current organisation roster.</p>
              <p><strong>Displayed measures.</strong> Raw deviation, residual risk, coverage and confidence come directly from immutable seeded assessment records.</p>
              <p><strong>Not available.</strong> No train/test split, ground-truth labels, per-model predictions, inference latency log, confusion matrix, precision-recall curve, calibration curve, path-ranking labels or baseline run are present.</p>
              <p><strong>Required next input.</strong> Connect a versioned evaluation artifact before interpreting this page as model-performance evidence.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
