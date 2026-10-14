// src/components/ContextProvenanceAndReview.tsx
// Phase 7: Context Provenance, Late-Context Markers, and Separation of Duties Workflow
// Displays active organizational context grants, late-context indicators, and revision approval tools.

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  GitBranch,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ContextLedgerItem, ContextRevision } from '../types';
import { useAppMode } from '../caseHooks';

interface ContextProvenanceAndReviewProps {
  caseId: string;
  contextLedger?: ContextLedgerItem[];
  revisions?: ContextRevision[];
  onProposeRevision?: (revision: {
    reason: string;
    effective_from: string;
    effective_until: string;
    allowed_resources: string[];
    allowed_actions: string[];
    approved_destinations?: string[];
  }) => Promise<any>;
  onReviewRevision?: (
    revisionId: string,
    actionOrPayload: 'approve' | 'reject' | { decision: 'approved' | 'rejected'; review_notes?: string },
    notes?: string
  ) => Promise<any>;
}

export const ContextProvenanceAndReview: React.FC<ContextProvenanceAndReviewProps> = ({
  caseId,
  contextLedger = [],
  revisions = [],
  onProposeRevision,
  onReviewRevision,
}) => {
  const { persona, identity, setPersona } = useAppMode();
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Propose Revision
  const [formData, setFormData] = useState({
    reason: '',
    effective_from: '2026-09-15T04:00:00Z',
    effective_until: '2026-09-15T08:00:00Z',
    allowed_resources: '',
    allowed_actions: '',
    approved_destinations: '',
  });

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onProposeRevision) return;
    if (!formData.reason.trim()) {
      setActionError('Please provide a legitimate business reason for the revision.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onProposeRevision({
        reason: formData.reason,
        effective_from: formData.effective_from,
        effective_until: formData.effective_until,
        allowed_resources: formData.allowed_resources.split(',').map((s) => s.trim()).filter(Boolean),
        allowed_actions: formData.allowed_actions.split(',').map((s) => s.trim()).filter(Boolean),
        approved_destinations: formData.approved_destinations.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowProposeModal(false);
      setFormData({
        reason: '',
        effective_from: '2026-09-15T04:00:00Z',
        effective_until: '2026-09-15T08:00:00Z',
        allowed_resources: '',
        allowed_actions: '',
        approved_destinations: '',
      });
      setActionSuccess('Context revision proposal successfully recorded.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAction = async (revision: ContextRevision, action: 'approve' | 'reject') => {
    if (!onReviewRevision) return;
    setActionError(null);
    setActionSuccess(null);

    // Separation of duties enforcement check in UI
    if (revision.proposer_id === identity.id) {
      setActionError(
        `Separation of Duties Violation: You are currently acting as ${identity.name} (${identity.role}), who proposed this revision. The proposer cannot approve their own context revision. Please switch to "Reviewer (Sarah Sterling)" above to approve.`
      );
      return;
    }

    try {
      const notes = reviewNotes[revision.id] || '';
      await onReviewRevision(revision.id, action, notes);
      setActionSuccess(`Revision ${revision.id} was ${action}d successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0e] p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Context Provenance & Revision Ledger</h3>
            <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
              {contextLedger.length + revisions.length} Records
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Cryptographic change tickets, on-call paging records, and authorized contextual grants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProposeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C6613F] text-white hover:bg-[#b05232] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Propose Context Revision</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alerts */}
      {actionError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-rose-200 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong className="font-semibold block mb-0.5 text-rose-300">Action Restricted</strong>
            {actionError}
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Active Context Grants List */}
      <div className="mt-4 space-y-3">
        {contextLedger.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-4 transition-colors ${
              item.is_late_context
                ? 'border-amber-500/30 bg-amber-950/10'
                : item.is_matched
                ? 'border-emerald-500/20 bg-emerald-950/5'
                : 'border-white/10 bg-black/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-white bg-white/5 px-2 py-0.5 rounded">
                    {item.source_id}
                  </span>
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                    {item.source_system}
                  </span>
                  {item.is_late_context && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Clock className="h-3 w-3" /> Late Context (Post-Activity)
                    </span>
                  )}
                  {item.retroactive_review_required && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="h-3 w-3" /> Requires Retroactive Review
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{item.description}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-white/40 block font-mono">Weight / Credit</span>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {Math.round(item.weight * 100)}% Coverage
                </span>
              </div>
            </div>

            {/* Provenance Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] font-mono text-white/50">
              <div>
                <span className="text-white/30 block text-[10px] uppercase">Effective Window</span>
                <span className="text-white/80">{item.effective_window || 'Permanent grant'}</span>
              </div>
              <div>
                <span className="text-white/30 block text-[10px] uppercase">Created At</span>
                <span className="text-white/80">{item.created_at}</span>
              </div>
              <div>
                <span className="text-white/30 block text-[10px] uppercase">Approver / Signer</span>
                <span className="text-white/80">{item.approver || 'Automated Sync'}</span>
              </div>
              <div>
                <span className="text-white/30 block text-[10px] uppercase">Matching Status</span>
                <span className={item.is_matched ? 'text-emerald-400' : 'text-white/40'}>
                  {item.is_matched ? 'Matched to Telemetry' : 'Unreferenced'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Pending / Historical Revisions */}
        {revisions.map((rev) => {
          const isPending = rev.status === 'pending';
          const isApproved = rev.status === 'approved';
          const isProposer = rev.proposer_id === identity.id;

          return (
            <div
              key={rev.id}
              className={`rounded-lg border p-4 transition-colors ${
                isPending
                  ? 'border-[#C6613F]/50 bg-[#C6613F]/10'
                  : isApproved
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : 'border-white/10 bg-black/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-[#C6613F] bg-[#C6613F]/20 px-2 py-0.5 rounded border border-[#C6613F]/30">
                      {rev.id}
                    </span>
                    <span className="text-xs font-semibold text-white">Context Revision Proposal</span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300'
                          : isApproved
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {rev.status}
                    </span>
                    {rev.is_late_context && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="h-3 w-3" /> Late Context
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/80 mt-1.5 leading-relaxed">{rev.reason}</p>
                </div>

                {isPending && (
                  <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReviewAction(rev, 'approve')}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Revision</span>
                      </button>
                      <button
                        onClick={() => handleReviewAction(rev, 'reject')}
                        className="px-2.5 py-1.5 rounded text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                      >
                        Reject
                      </button>
                    </div>

                    {isProposer && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        (You proposed this — switch persona to approve)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Revision Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] font-mono text-white/50">
                <div>
                  <span className="text-white/30 block text-[10px] uppercase">Proposer</span>
                  <span className="text-white/80">{rev.proposer_name}</span>
                </div>
                <div>
                  <span className="text-white/30 block text-[10px] uppercase">Effective Window</span>
                  <span className="text-white/80">{rev.effective_from.split('T')[1] || rev.effective_from} to {rev.effective_until.split('T')[1] || rev.effective_until}</span>
                </div>
                <div>
                  <span className="text-white/30 block text-[10px] uppercase">Allowed Resources</span>
                  <span className="text-white/80">{rev.allowed_resources?.join(', ') || 'All standard'}</span>
                </div>
                <div>
                  <span className="text-white/30 block text-[10px] uppercase">Approver</span>
                  <span className="text-white/80">{rev.approver_name || 'Pending Review'}</span>
                </div>
              </div>

              {rev.review_notes && (
                <div className="mt-2.5 p-2 rounded bg-black/40 border border-white/5 text-xs text-white/70">
                  <span className="text-white/40 font-mono text-[10px] uppercase block">Reviewer Notes:</span>
                  {rev.review_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Propose Revision Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#121218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white">Propose Context Revision</h4>
              <button
                onClick={() => setShowProposeModal(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-white/70 mb-1 font-medium">Business Reason / Justification</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Q3 Finance audit data verification sampling per compliance ticket FIN-AUDIT-2026."
                  className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-2.5 text-white placeholder:text-white/30 focus:border-[#C6613F] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1 font-medium">Effective From (UTC)</label>
                  <input
                    type="text"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1 font-medium">Effective Until (UTC)</label>
                  <input
                    type="text"
                    value={formData.effective_until}
                    onChange={(e) => setFormData({ ...formData, effective_until: e.target.value })}
                    className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-medium">Allowed Resources (comma separated)</label>
                <input
                  type="text"
                  value={formData.allowed_resources}
                  onChange={(e) => setFormData({ ...formData, allowed_resources: e.target.value })}
                  placeholder="e.g. gcs://acme-finance-archive, kms://eu-west-1"
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-medium">Approved Destinations (optional)</label>
                <input
                  type="text"
                  value={formData.approved_destinations}
                  onChange={(e) => setFormData({ ...formData, approved_destinations: e.target.value })}
                  placeholder="e.g. s3://compliance-audit-internal"
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/40">
                  Proposing as: <strong className="text-white/80">{identity.name}</strong>
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#C6613F] text-white font-semibold hover:bg-[#b05232] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
