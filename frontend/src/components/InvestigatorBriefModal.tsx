// InvestigatorBriefModal.tsx
import React, { useState } from 'react';
import { InvestigatorBrief } from '../types';
import { getInvestigatorBrief } from '../api/client';
import {
  FileText,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvestigatorBriefModalProps {
  caseId: string;
  actorName: string;
  isOpen: boolean;
  onClose: () => void;
  brief?: InvestigatorBrief | null;
  loading?: boolean;
  onRegenerate?: () => void;
}

export function InvestigatorBriefModal({
  caseId,
  actorName,
  isOpen,
  onClose,
  brief: externalBrief,
  loading: externalLoading,
  onRegenerate,
}: InvestigatorBriefModalProps) {
  const [internalBrief, setInternalBrief] = useState<InvestigatorBrief | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const brief = externalBrief !== undefined ? externalBrief : internalBrief;
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleGenerate = async () => {
    if (onRegenerate) {
      onRegenerate();
      return;
    }
    setInternalLoading(true);
    setError(null);
    try {
      const result = await getInvestigatorBrief(caseId);
      setInternalBrief(result);
    } catch (err: unknown) {
      console.warn('Failed to generate investigator brief:', err);
      setError(err instanceof Error ? err.message : 'Could not generate investigator brief');
    } finally {
      setInternalLoading(false);
    }
  };

  // Automatically trigger generation on open if not already generated
  React.useEffect(() => {
    if (isOpen && !brief && !loading && !externalBrief) {
      handleGenerate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#09090d] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0c0c12]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C6613F]/10 border border-[#C6613F]/20 text-[#C6613F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Forensic Narrative Brief</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                  Case #{caseId}
                </span>
              </div>
              <p className="text-xs text-white/50">
                AI-Assisted Grounded Evidence Synthesis • Subject: {actorName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              title="Regenerate brief"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C6613F]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#C6613F] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-mono text-white/70">Synthesizing evidence episodes and context grants...</div>
              <div className="text-[11px] text-white/40 max-w-sm mx-auto">
                Grounded citations ensure statements link to event identifiers without speculative intent claims.
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-semibold mb-1">Brief Generation Failed</div>
                <div>{error}</div>
              </div>
            </div>
          ) : brief ? (
            <>
              {/* Executive Summary Box */}
              {brief.executive_summary && (
                <div className="p-4 rounded-xl border border-[#C6613F]/30 bg-[#C6613F]/5 space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#C6613F] font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Executive Summary</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">
                    {brief.executive_summary}
                  </p>
                </div>
              )}

              {/* Synthesized Narrative */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-white/50">
                  Forensic Assessment Narrative
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-white/80 leading-relaxed font-mono whitespace-pre-wrap">
                  {brief.synthesized_narrative || brief.narrative}
                </div>
              </div>

              {/* Key Evidence Citations */}
              {brief.key_evidence_citations && brief.key_evidence_citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Key Evidence Citations</span>
                    <span className="text-[10px] text-white/40">Linked telemetry records</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {brief.key_evidence_citations.map((citation, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-white/5 bg-white/[0.01] text-xs text-white/70 font-mono flex items-start gap-2"
                      >
                        <span className="text-[#C6613F] font-semibold">{idx + 1}.</span>
                        <span>{citation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Context Grant Correlations */}
              {brief.context_grant_correlation && brief.context_grant_correlation.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/50">
                    Context Grant Correlation
                  </div>
                  <div className="space-y-1.5">
                    {brief.context_grant_correlation.map((grant, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-200 font-mono flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>{grant}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Steps */}
              {brief.recommended_next_steps && brief.recommended_next_steps.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/50">
                    Investigative Recommendations
                  </div>
                  <div className="space-y-1.5">
                    {brief.recommended_next_steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs text-white/80 font-mono flex items-center gap-2"
                      >
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#C6613F]" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-white/40">
                <div>Model: {brief.model_version || brief.model || 'Gemini 2.5 Flash'}</div>
                <div>Generated: {brief.generated_at}</div>
                <div>Provenance: {brief.is_live ? 'Live Backend Synthesizer' : 'Verified Deterministic Snapshot'}</div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-white/40 font-mono">
              Click regenerate to synthesize a forensic brief for Case #{caseId}.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0c0c12] flex items-center justify-between">
          <div className="text-[11px] text-white/40 font-mono">
            Immutable Audit Trail Active
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
          >
            Close Brief
          </button>
        </div>
      </motion.div>
    </div>
  );
}
