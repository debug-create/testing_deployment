// src/components/CaseDetailPage.tsx
// Comprehensive Forensic Case Detail Dossier & Reassessment Page (Contract 2.0.0)
// Structured cleanly into 5 primary investigative tabs:
// 1. Overview (Forensic Synthesis, Key Metrics, Risk Breakdown, ShiftMap/Counterfactual preview)
// 2. Evidence (Telemetry timeline, event contributions, signal categories & episodes)
// 3. Context (Context ledger, late revisions, propose form, reviewer approval with Separation of Duties)
// 4. Response (Interactive response ladder, simulated containment approval, blast radius)
// 5. History (Audit trail, assessment versioning, delta progression, timestamped logs)

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileCheck2,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
  Lock,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Building2,
  Briefcase,
  GitCommit,
  Flame,
  FileText,
  Calendar,
  History,
  Shield,
  Eye,
  Crosshair,
  TrendingDown,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { Entity, CaseStatus } from '../types';
import {
  useCase,
  useCaseDetail,
  useContextRevisions,
  useInvestigatorBrief,
  useCounterfactual,
  useShiftMap,
  useAppMode,
} from '../caseHooks';
import { useTheme } from '../useTheme';
import { CaseRiskHeader } from './CaseRiskHeader';
import { AssessmentComparison } from './AssessmentComparison';
import { EventContributionsView } from './EventContributionsView';
import { SignalCategoriesAndEpisodes } from './SignalCategoriesAndEpisodes';
import { ContextProvenanceAndReview } from './ContextProvenanceAndReview';
import { CounterfactualWaterfall } from './CounterfactualWaterfall';
import { ShiftMapGraph } from './ShiftMapGraph';
import { InvestigatorBriefModal } from './InvestigatorBriefModal';
import { ResponseActionAndBlastRadius } from './ResponseActionAndBlastRadius';
import { recommendContainment } from '../api/client';

interface CaseDetailPageProps {
  caseId: string;
  entity: Entity;
  onBack: () => void;
  onUpdateStatus?: (status: CaseStatus) => void;
}

export function CaseDetailPage({
  caseId,
  entity,
  onBack,
  onUpdateStatus,
}: CaseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'context' | 'response' | 'history'>('overview');

  const [showBriefModal, setShowBriefModal] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExecutingContainment, setIsExecutingContainment] = useState(false);

  const { isDemoMode, identity, persona, setPersona, resetSimulation } = useAppMode();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Load data via typed hooks
  const { caseItem, refetch: refetchCase } = useCase(caseId);
  const { detail, loading: detailLoading, refetch: refetchDetail } = useCaseDetail(caseId);
  const { revisions, proposeRevision, reviewRevision, refetch: refetchRevisions } = useContextRevisions(caseId);
  const { counterfactual } = useCounterfactual(caseId);
  const { shiftMap } = useShiftMap(caseId);
  const { brief, loading: briefLoading, generateBrief } = useInvestigatorBrief(caseId, entity?.name);

  const currentAssessment = detail?.currentAssessment || detail?.assessmentDetail;
  const originalAssessment = detail?.originalAssessment;

  const handleRecommendContainment = async () => {
    setIsExecutingContainment(true);
    setActionError(null);
    try {
      await recommendContainment(caseId, `Containment recommended by analyst ${identity.name}`);
      if (onUpdateStatus) {
        onUpdateStatus('Containment Recommended');
      }
      setActionNotice('Containment recommendation logged. (Simulated enforcement)');
      setTimeout(() => setActionNotice(null), 4500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecutingContainment(false);
    }
  };

  const handleProposeContextRevision = async (payload: {
    reason: string;
    effective_from: string;
    effective_until: string;
    allowed_resources: string[];
    allowed_actions: string[];
    approved_destinations?: string[];
  }) => {
    const created = await proposeRevision(payload);
    await refetchDetail();
    await refetchCase();
    return created;
  };

  const handleReviewContextRevision = async (
    revisionId: string,
    actionOrPayload: 'approve' | 'reject' | { decision: 'approved' | 'rejected'; review_notes?: string },
    notes?: string
  ) => {
    const result = await reviewRevision(revisionId, actionOrPayload, notes);
    await refetchDetail();
    await refetchCase();
    return result;
  };

  const handleOpenBriefModal = () => {
    if (!brief) {
      generateBrief();
    }
    setShowBriefModal(true);
  };

  return (
    <div className={`min-h-screen font-sans pb-16 transition-colors duration-200 ${
      resolvedTheme === 'dark' ? 'bg-[#050508] text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* Top Header & Breadcrumb Bar */}
      <header className={`border-b px-4 sm:px-8 py-3.5 sticky top-0 z-30 backdrop-blur-md transition-colors ${
        resolvedTheme === 'dark' ? 'border-white/10 bg-[#08080c]/90' : 'border-zinc-200 bg-white/90 shadow-xs'
      }`}>
        <div className="w-full max-w-[1760px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`flex items-center gap-1.5 text-xs font-mono transition-colors px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                resolvedTheme === 'dark'
                  ? 'text-zinc-300 hover:text-white bg-white/5 border-white/10'
                  : 'text-zinc-700 hover:text-zinc-900 bg-zinc-100 border-zinc-200'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>SOC Queue</span>
            </button>
            <span className="text-zinc-500 font-mono text-xs">/</span>
            <span className="text-xs font-mono font-bold text-[#C6613F]">Dossier #{caseId}</span>
            <span className="text-zinc-500 font-mono text-xs">•</span>
            <span className="text-xs font-semibold">{entity.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-400">
              {entity.department}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Simulation Banner */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>SIMULATION · SYNTHETIC DATA</span>
            </div>

            {/* Persona Switcher */}
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as any)}
              className={`border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#C6613F] cursor-pointer ${
                resolvedTheme === 'dark' ? 'bg-zinc-900 border-white/10 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
              }`}
            >
              <option value="analyst">Analyst: Alex Thorne</option>
              <option value="reviewer">Reviewer: Sarah Sterling</option>
              <option value="admin">Admin: Elena Rostova</option>
            </select>

            {/* Theme Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              resolvedTheme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <button
                onClick={() => setTheme('dark')}
                title="Dark mode"
                className={`p-1 rounded cursor-pointer ${theme === 'dark' ? 'bg-[#C6613F] text-black' : 'text-zinc-400'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('light')}
                title="Light mode"
                className={`p-1 rounded cursor-pointer ${theme === 'light' ? 'bg-[#C6613F] text-black' : 'text-zinc-400'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                title="System preference"
                className={`p-1 rounded cursor-pointer ${theme === 'system' ? 'bg-[#C6613F] text-black' : 'text-zinc-400'}`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Generate Brief Button */}
            <button
              onClick={handleOpenBriefModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C6613F]/20 hover:bg-[#C6613F]/30 text-[#E07B57] border border-[#C6613F]/40 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#E07B57]" />
              <span>Forensic Brief</span>
            </button>

            {entity.caseStatus !== 'Containment Recommended' && entity.caseStatus !== 'Cleared' && (
              <button
                onClick={handleRecommendContainment}
                disabled={isExecutingContainment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5" />
                <span>{isExecutingContainment ? 'Transmitting...' : 'Recommend Containment'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Action Banners */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 5-Metric Case Risk Header */}
        <CaseRiskHeader
          caseData={caseItem}
          detail={detail}
          currentAssessment={currentAssessment}
        />

        {/* 5 Primary Dossier Tabs */}
        <div className={`flex items-center gap-1 border-b overflow-x-auto ${
          resolvedTheme === 'dark' ? 'border-white/10' : 'border-zinc-200'
        }`}>
          {[
            { id: 'overview', label: '1. Overview & Synthesis', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'evidence', label: `2. Evidence & Events (${detail?.eventContributions?.length || 0})`, icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'context', label: `3. Context Ledger & Review (${detail?.contextLedger?.length || 0})`, icon: <FileCheck2 className="w-3.5 h-3.5" /> },
            { id: 'response', label: '4. Response & Ladder', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'history', label: '5. Assessment History & Audit', icon: <History className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#C6613F] text-[#C6613F]'
                  : resolvedTheme === 'dark'
                  ? 'border-transparent text-zinc-400 hover:text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Plain-Language Forensic Assessment Statement */}
            <div className={`p-5 rounded-xl border ${
              resolvedTheme === 'dark' ? 'bg-[#0a0a0e] border-white/10' : 'bg-white border-zinc-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[#C6613F]" />
                <h3 className={`text-xs font-mono font-semibold uppercase tracking-wider ${
                  resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  Deterministic Forensic Synthesis (Contract 2.0.0)
                </h3>
              </div>
              <p className={`text-xs font-mono leading-relaxed ${
                resolvedTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                {detail?.initialDriftPattern ||
                  "Observed activity evaluated against organizational change records and credential permissions."}
              </p>
            </div>

            {/* Quick ShiftMap Feature Preview */}
            {shiftMap && (
              <div className={`p-5 rounded-xl border ${
                resolvedTheme === 'dark' ? 'bg-[#0a0a0e] border-white/10' : 'bg-white border-zinc-200 shadow-xs'
              }`}>
                <h3 className={`text-xs font-mono font-semibold uppercase tracking-wider mb-2 ${
                  resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  ShiftMap Behavioral Vectors
                </h3>
                <ShiftMapGraph data={shiftMap} actorName={entity.name} />
              </div>
            )}

            {/* Counterfactual Decomposition Waterfall Preview */}
            {counterfactual && (
              <div className={`p-5 rounded-xl border ${
                resolvedTheme === 'dark' ? 'bg-[#0a0a0e] border-white/10' : 'bg-white border-zinc-200 shadow-xs'
              }`}>
                <h3 className={`text-xs font-mono font-semibold uppercase tracking-wider mb-2 ${
                  resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  Counterfactual Risk Attribution Decomposition
                </h3>
                <CounterfactualWaterfall counterfactual={counterfactual} />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EVIDENCE */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <EventContributionsView
              events={detail?.eventContributions || []}
              topUnresolvedEventId={detail?.topUnresolvedEventId}
            />

            <SignalCategoriesAndEpisodes
              categories={detail?.signalCategories || []}
              episodes={detail?.evidenceEpisodes || []}
            />
          </div>
        )}

        {/* TAB 3: CONTEXT */}
        {activeTab === 'context' && (
          <div className="space-y-6">
            <ContextProvenanceAndReview
              caseId={caseId}
              contextLedger={detail?.contextLedger || []}
              revisions={revisions}
              onProposeRevision={handleProposeContextRevision}
              onReviewRevision={handleReviewContextRevision}
            />
          </div>
        )}

        {/* TAB 4: RESPONSE */}
        {activeTab === 'response' && (
          <div className="space-y-6">
            <ResponseActionAndBlastRadius
              caseId={caseId}
              responseAction={detail?.responseAction}
              blastRadius={detail?.blastRadius}
              onRefresh={async () => {
                await refetchDetail();
                await refetchCase();
              }}
            />
          </div>
        )}

        {/* TAB 5: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <AssessmentComparison
              originalAssessment={originalAssessment}
              currentAssessment={currentAssessment}
              revisionsBetween={revisions.filter((r) => r.status === 'approved')}
              retroactiveReviewRequired={currentAssessment?.retroactive_justification_review}
            />

            {/* Chronological Audit Progression */}
            <div className={`p-5 rounded-xl border ${
              resolvedTheme === 'dark' ? 'bg-[#0a0a0e] border-white/10' : 'bg-white border-zinc-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-[#C6613F]" />
                <h3 className={`text-xs font-mono font-semibold uppercase tracking-wider ${
                  resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  Immutable Audit Ledger & Revision Trail
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5 font-mono text-xs">
                  <span className="text-zinc-500 shrink-0">08:00 UTC</span>
                  <div>
                    <span className="font-semibold text-zinc-200">Baseline Assessment Initialized:</span>
                    <span className="text-zinc-400 ml-1">
                      Raw deviation score computed at {detail?.rawDeviationScore ?? 100}.
                    </span>
                  </div>
                </div>

                {revisions.map((rev) => (
                  <div key={rev.id} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5 font-mono text-xs">
                    <span className="text-zinc-500 shrink-0">14:22 UTC</span>
                    <div>
                      <span className="font-semibold text-zinc-200">Context Revision ({rev.status}):</span>
                      <span className="text-zinc-400 ml-1">{rev.reason} (by {rev.proposer_name})</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5 font-mono text-xs">
                  <span className="text-zinc-500 shrink-0">16:45 UTC</span>
                  <div>
                    <span className="font-semibold text-zinc-200">Active State:</span>
                    <span className="text-zinc-400 ml-1">
                      Residual score evaluated at {detail?.residualRiskScore ?? entity.riskScore}/100. (Simulated enforcement)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Investigator Forensic Brief Modal */}
      {showBriefModal && (
        <InvestigatorBriefModal
          isOpen={showBriefModal}
          onClose={() => setShowBriefModal(false)}
          brief={brief}
          loading={briefLoading}
          onRegenerate={generateBrief}
          caseId={caseId}
          actorName={entity.name}
        />
      )}
    </div>
  );
}
