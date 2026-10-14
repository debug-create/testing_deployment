// src/components/RequestMoreContextModal.tsx
// Modal for requesting additional context from employee or manager before granting access

import React, { useState } from 'react';
import { HelpCircle, X, Info, AlertTriangle } from 'lucide-react';
import { AccessRequestItem } from '../types';
import { SIMULATED_ENFORCEMENT_LABEL } from '../constants';

interface RequestMoreContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AccessRequestItem;
  reviewerName: string;
  reviewerRole: string;
  onConfirm: (params: {
    reviewerName: string;
    reviewerRole: string;
    notes: string;
  }) => void;
}

export function RequestMoreContextModal({
  isOpen,
  onClose,
  request,
  reviewerName,
  reviewerRole,
  onConfirm,
}: RequestMoreContextModalProps) {
  const [notes, setNotes] = useState<string>(
    'Requesting confirmation from SRE Manager regarding runbook step scope and confirming whether bastion access without root privileges suffices.'
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide specific questions or missing evidence required.');
      return;
    }
    onConfirm({
      reviewerName,
      reviewerRole,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0b0f19] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-[#0b0f19] to-[#0b0f19] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Request Additional Context
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Access remains paused before exposure until evidence is supplied
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-xs">
              Context Inquiries for Requester & Manager <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              placeholder="State what tickets, runbook approvals, or evidence are missing..."
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>{SIMULATED_ENFORCEMENT_LABEL}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Submit Context Request</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
