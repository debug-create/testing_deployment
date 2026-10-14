// ContextRevisionWorkflow.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ContextRevision } from '../types';
import {
  getContextRevisions,
  proposeContextRevision,
  reviewContextRevision,
  getDemoPersona,
  setDemoPersona,
  getDemoIdentityDetails,
  isDemoMode,
  DemoPersona,
} from '../api/client';
import {
  FileCode,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  Plus,
  Sliders,
  Check,
  X,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContextRevisionWorkflowProps {
  caseId: string;
  onRevisionApproved?: (rev: ContextRevision) => void;
}

export function ContextRevisionWorkflow({
  caseId,
  onRevisionApproved,
}: ContextRevisionWorkflowProps) {
  const [revisions, setRevisions] = useState<ContextRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePersona, setActivePersonaState] = useState<DemoPersona>(getDemoPersona());
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [proposalReason, setProposalReason] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-09-12 04:00 UTC');
  const [effectiveUntil, setEffectiveUntil] = useState<string>('2026-09-12 08:00 UTC');
  const [allowedResources, setAllowedResources] = useState<string>(
    'GCS finance-archive-lake, AWS KMS eu-west-1'
  );
  const [allowedActions, setAllowedActions] = useState<string>(
    'ParquetExport, EnvelopeDecrypt'
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const identityDetails = getDemoIdentityDetails();

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContextRevisions(caseId);
      setRevisions(data);
    } catch (err: unknown) {
      console.warn('Failed to fetch context revisions:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleSwitchPersona = (newPersona: DemoPersona) => {
    setDemoPersona(newPersona);
    setActivePersonaState(newPersona);
    setActionSuccess(`Switched active persona to ${getDemoIdentityDetails().name} (${getDemoIdentityDetails().role})`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalReason.trim()) {
      setActionError('Please specify the justification reason for the context revision.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const resourcesList = allowedResources
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const actionsList = allowedActions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await proposeContextRevision(caseId, {
        reason: proposalReason.trim(),
        effective_from: effectiveFrom.trim(),
        effective_until: effectiveUntil.trim(),
        allowed_resources: resourcesList,
        allowed_actions: actionsList,
      });

      setRevisions((prev) => [created, ...prev]);
      setShowProposalModal(false);
      setProposalReason('');
      setActionSuccess(
        `Context proposal submitted successfully as ${identityDetails.name}. Awaiting peer approver review.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (revisionId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(revisionId);
    setActionError(null);
    try {
      const res = await reviewContextRevision(caseId, revisionId, {
        decision,
        review_notes: reviewNotes.trim() || undefined,
      });
      const updatedRev = res.revision;

      setRevisions((prev) =>
        prev.map((r) => (r.id === revisionId ? updatedRev : r))
      );
      setReviewNotes('');

      if (decision === 'approved') {
        setActionSuccess(
          `Context Revision ${revisionId} approved by ${identityDetails.name}. Re-scoring executed.`
        );
        if (onRevisionApproved) {
          onRevisionApproved(updatedRev);
        }
      } else {
        setActionSuccess(`Context Revision ${revisionId} rejected.`);
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Review action failed');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Action Banners */}
      {actionSuccess && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C6613F]" />
            <h3 className="text-sm font-semibold text-white">
              Two-Person Rule Context Revision Workflow
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Proposer cannot approve own submission. Review triggers automatic immutable re-scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
            <span className="text-zinc-500 pl-2">Persona:</span>
            <button
              onClick={() => handleSwitchPersona('analyst')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePersona === 'analyst'
                  ? 'bg-[#C6613F] text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Analyst
            </button>
            <button
              onClick={() => handleSwitchPersona('reviewer')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePersona === 'reviewer'
                  ? 'bg-[#C6613F] text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Reviewer
            </button>
          </div>

          <button
            onClick={() => setShowProposalModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C6613F] hover:bg-[#C6613F]/90 text-black transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Propose Context</span>
          </button>
        </div>
      </div>

      {/* Revisions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500">
            Loading context revisions...
          </div>
        ) : revisions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 bg-black/20 border border-white/5 rounded-xl">
            No context revisions proposed for Case #{caseId}.
          </div>
        ) : (
          revisions.map((rev) => {
            const isPending = rev.status === 'pending';
            const isSelfProposal = rev.proposer_id === identityDetails.id;
            const canApprove = isPending && !isSelfProposal;

            return (
              <div
                key={rev.id}
                className={`p-4 rounded-xl border transition-all ${
                  isPending
                    ? 'bg-[#0f0e13] border-amber-500/30 shadow-md shadow-amber-500/5'
                    : rev.status === 'approved'
                    ? 'bg-[#0b0f0d] border-emerald-500/30'
                    : 'bg-zinc-950/50 border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">
                        Revision #{rev.id}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
                          rev.status === 'approved'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : rev.status === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Proposed by <strong>{rev.proposer_name}</strong> ({rev.proposer_role}) • {rev.created_at}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-200 mb-3 bg-black/30 p-3 rounded-lg border border-white/5">
                  &quot;{rev.reason}&quot;
                </div>

                {rev.approver_name && (
                  <div className="text-[11px] font-mono text-emerald-300/80 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Approved by {rev.approver_name} ({rev.approver_role}) at {rev.approved_at}</span>
                  </div>
                )}

                {canApprove && (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <input
                      type="text"
                      placeholder="Optional review notes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6613F]"
                    />
                    <button
                      onClick={() => handleReview(rev.id, 'approved')}
                      disabled={reviewingId === rev.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReview(rev.id, 'rejected')}
                      disabled={reviewingId === rev.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#09090d] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="text-sm font-semibold text-white">Propose Context Revision</div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePropose} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Emergency database migration authorized under RFC-8942..."
                  value={proposalReason}
                  onChange={(e) => setProposalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#C6613F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Effective From</label>
                  <input
                    type="text"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Effective Until</label>
                  <input
                    type="text"
                    value={effectiveUntil}
                    onChange={(e) => setEffectiveUntil(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Allowed Resources</label>
                <input
                  type="text"
                  value={allowedResources}
                  onChange={(e) => setAllowedResources(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Allowed Actions</label>
                <input
                  type="text"
                  value={allowedActions}
                  onChange={(e) => setAllowedActions(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C6613F] hover:bg-[#C6613F]/90 text-black font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
