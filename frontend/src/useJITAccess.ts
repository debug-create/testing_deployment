// src/useJITAccess.ts
// Context-Aware Just-in-Time Access (JIT) State Machine & React Hook
// Implements deterministic state transitions:
// PAUSED -> AI_REVIEWED -> AWAITING_APPROVAL -> ACTIVE -> EXPIRED
// Also supports: MORE_CONTEXT_REQUIRED, DENIED, REVOKED, and Scope Deviation Alerts.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccessRequestItem,
  AccessRequestStatus,
  AccessAuditLogEvent,
} from './types';
import { SEED_PRIYA_JIT_REQUEST, SEED_DEVRAJ_JIT_REQUEST } from './data/jitSeedData';

// Generate simulated immutable SHA-256 hash
function generateAuditHash(actor: string, action: string, timestamp: string): string {
  const pseudoSeed = (actor.length * 31 + action.length * 17 + timestamp.length * 13) % 9999999;
  return `sha256:${pseudoSeed.toString(16).padStart(8, '0')}7b49a16f2890c2e391bfa98e${(pseudoSeed * 3).toString(16).padStart(8, '0')}`;
}

export function useJITAccess() {
  const [requests, setRequests] = useState<Record<string, AccessRequestItem>>(() => ({
    'AR-203': JSON.parse(JSON.stringify(SEED_PRIYA_JIT_REQUEST)),
    'AR-104': JSON.parse(JSON.stringify(SEED_DEVRAJ_JIT_REQUEST)),
  }));

  const [activeRequestId, setActiveRequestId] = useState<string>('AR-203');
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isToastDismissed, setIsToastDismissed] = useState<boolean>(false);

  // Active session countdown timer
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if any request is active and running countdown
    const hasActive = Object.values(requests).some(
      (r) => r.currentStatus === 'ACTIVE' && r.remainingSeconds > 0
    );

    if (hasActive) {
      timerRef.current = window.setInterval(() => {
        setRequests((prev) => {
          let updated = false;
          const next = { ...prev };

          Object.keys(next).forEach((key) => {
            const req = next[key];
            if (req.currentStatus === 'ACTIVE') {
              if (req.remainingSeconds > 1) {
                next[key] = {
                  ...req,
                  remainingSeconds: req.remainingSeconds - 1,
                };
                updated = true;
              } else if (req.remainingSeconds <= 1) {
                // Automatic expiry reached!
                const expiryTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
                const expiryAudit: AccessAuditLogEvent = {
                  id: `aud-${req.id}-exp`,
                  timestamp: expiryTimestamp,
                  actor: 'FABLE JIT Policy Engine',
                  actorRole: 'Autonomous LifeCycle Controller',
                  actorPersona: 'system',
                  action: 'Session Automatically Expired',
                  details: `15-minute TTL reached zero. Temporary scoped access to ${req.resource} automatically terminated. Zero residual permissions retained.`,
                  statusAfter: 'EXPIRED',
                  policyRuleApplied: 'POL-JIT-TTL-002: Strict TTL auto-revocation upon countdown expiry.',
                  immutableHash: generateAuditHash('FABLE JIT Policy Engine', 'Session Automatically Expired', expiryTimestamp),
                };

                next[key] = {
                  ...req,
                  currentStatus: 'EXPIRED',
                  enforcementCategory: 'session_revoked',
                  remainingSeconds: 0,
                  auditTimeline: [expiryAudit, ...req.auditTimeline],
                };
                updated = true;
              }
            }
          });

          return updated ? next : prev;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [requests]);

  const activeRequest = requests[activeRequestId] || requests['AR-203'];

  // Helper to format remaining seconds as MM:SS
  const formatCountdown = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 1. Generate AI Review
  const generateAIReview = useCallback((requestId: string) => {
    setRequests((prev) => {
      const target = prev[requestId];
      if (!target) return prev;

      const now = '2026-09-12 01:15:10 UTC';
      const auditItem: AccessAuditLogEvent = {
        id: `aud-${requestId}-ai`,
        timestamp: now,
        actor: 'FABLE AI Access Copilot',
        actorRole: 'Sanitized Evidence Evaluation Engine',
        actorPersona: 'system',
        action: 'AI Access Review Generated',
        details: `Structured sanitized evidence synthesized. Recommendation: ${target.aiReview.recommendation}. Confidence: ${target.aiReview.confidenceLevel}%. Policy validation passed. Human approval required.`,
        statusAfter: 'AI_REVIEWED',
        policyRuleApplied: 'POL-AI-VAL-001: AI recommendations require deterministic policy compliance validation.',
        immutableHash: generateAuditHash('FABLE AI Access Copilot', 'AI Access Review Generated', now),
      };

      return {
        ...prev,
        [requestId]: {
          ...target,
          currentStatus: 'AI_REVIEWED',
          auditTimeline: [auditItem, ...target.auditTimeline],
        },
      };
    });
  }, []);

  // 2. Analyst Proposes Decision (Separation of duties)
  const proposeAccessDecision = useCallback(
    (requestId: string, proposerName: string, proposerRole: string, notes: string) => {
      setRequests((prev) => {
        const target = prev[requestId];
        if (!target) return prev;

        const now = '2026-09-12 01:16:04 UTC';
        const auditItem: AccessAuditLogEvent = {
          id: `aud-${requestId}-prop`,
          timestamp: now,
          actor: proposerName,
          actorRole: proposerRole,
          actorPersona: 'analyst',
          action: 'Access Decision Proposed',
          details: `Analyst proposed scoped 15-minute access based on active Sev-1 outage context. Note: "${notes}". Forwarded to Authorized Reviewer.`,
          statusAfter: 'AWAITING_APPROVAL',
          policyRuleApplied: 'POL-SOD-003: SOC Analyst proposes recommendation; independent reviewer authorization required.',
          immutableHash: generateAuditHash(proposerName, 'Access Decision Proposed', now),
        };

        return {
          ...prev,
          [requestId]: {
            ...target,
            currentStatus: 'AWAITING_APPROVAL',
            proposedBy: `${proposerName} (${proposerRole})`,
            decisionNotes: notes,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 3. Reviewer Approves Scoped Access
  const approveScopedAccess = useCallback(
    (
      requestId: string,
      params: {
        reviewerName: string;
        reviewerRole: string;
        reason: string;
        durationMinutes: number;
        stepUpVerified: boolean;
      }
    ) => {
      setRequests((prev) => {
        const target = prev[requestId];
        if (!target) return prev;

        const now = '2026-09-12 01:17:00 UTC';
        const totalSecs = (params.durationMinutes || 15) * 60;
        // Start from 14:59 for authentic UX immediately
        const initialRemaining = totalSecs - 1;

        const auditItem: AccessAuditLogEvent = {
          id: `aud-${requestId}-appr`,
          timestamp: now,
          actor: params.reviewerName,
          actorRole: params.reviewerRole,
          actorPersona: 'reviewer',
          action: 'Scoped Access Approved & Activated',
          details: `Approved 15-minute scoped session to ${target.resource}. Step-up WebAuthn MFA verified. Justification: "${params.reason}". Unrelated systems remained locked.`,
          statusAfter: 'ACTIVE',
          policyRuleApplied: 'POL-JIT-APPR-001: Authorized Reviewer temporary scoped grant with mandatory MFA step-up.',
          immutableHash: generateAuditHash(params.reviewerName, 'Scoped Access Approved', now),
          stepUpVerified: params.stepUpVerified,
        };

        return {
          ...prev,
          [requestId]: {
            ...target,
            currentStatus: 'ACTIVE',
            remainingSeconds: initialRemaining,
            totalTtlSeconds: totalSecs,
            decisionBy: params.reviewerName,
            decisionByRole: params.reviewerRole,
            decisionAt: now,
            decisionNotes: params.reason,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 4. Request More Context
  const requestMoreContext = useCallback(
    (
      requestId: string,
      params: {
        reviewerName: string;
        reviewerRole: string;
        notes: string;
      }
    ) => {
      setRequests((prev) => {
        const target = prev[requestId];
        if (!target) return prev;

        const now = '2026-09-12 01:16:40 UTC';
        const auditItem: AccessAuditLogEvent = {
          id: `aud-${requestId}-ctx-req`,
          timestamp: now,
          actor: params.reviewerName,
          actorRole: params.reviewerRole,
          actorPersona: 'reviewer',
          action: 'Additional Context Requested',
          details: `Reviewer requested supplementary verification from manager / ticket issuer. Note: "${params.notes}". Access remains paused before exposure.`,
          statusAfter: 'MORE_CONTEXT_REQUIRED',
          policyRuleApplied: 'POL-JIT-CTX-002: Access request remains paused when additional context is requested.',
          immutableHash: generateAuditHash(params.reviewerName, 'Additional Context Requested', now),
        };

        return {
          ...prev,
          [requestId]: {
            ...target,
            currentStatus: 'MORE_CONTEXT_REQUIRED',
            decisionBy: params.reviewerName,
            decisionByRole: params.reviewerRole,
            decisionAt: now,
            decisionNotes: params.notes,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 5. Deny Request
  const denyRequest = useCallback(
    (
      requestId: string,
      params: {
        reviewerName: string;
        reviewerRole: string;
        reason: string;
      }
    ) => {
      setRequests((prev) => {
        const target = prev[requestId];
        if (!target) return prev;

        const now = '2026-09-12 01:17:15 UTC';
        const auditItem: AccessAuditLogEvent = {
          id: `aud-${requestId}-denied`,
          timestamp: now,
          actor: params.reviewerName,
          actorRole: params.reviewerRole,
          actorPersona: 'reviewer',
          action: 'Access Request Denied',
          details: `Access request formally denied. Reason: "${params.reason}". Zero resource access granted; incident escalated to Security Ops.`,
          statusAfter: 'DENIED',
          policyRuleApplied: 'POL-JIT-DENY-001: Denied requests terminate immediately with zero exposure.',
          immutableHash: generateAuditHash(params.reviewerName, 'Access Request Denied', now),
        };

        return {
          ...prev,
          [requestId]: {
            ...target,
            currentStatus: 'DENIED',
            decisionBy: params.reviewerName,
            decisionByRole: params.reviewerRole,
            decisionAt: now,
            decisionNotes: params.reason,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 6. Revoke Early
  const revokeEarly = useCallback(
    (
      requestId: string,
      params: {
        actorName: string;
        actorRole: string;
        actorPersona: 'reviewer' | 'admin';
        reason: string;
      }
    ) => {
      setRequests((prev) => {
        const target = prev[requestId];
        if (!target) return prev;

        const now = '2026-09-12 01:21:05 UTC';
        const auditItem: AccessAuditLogEvent = {
          id: `aud-${requestId}-revoked`,
          timestamp: now,
          actor: params.actorName,
          actorRole: params.actorRole,
          actorPersona: params.actorPersona,
          action: 'Session Early Revoked',
          details: `Active session terminated early by ${params.actorName}. Reason: "${params.reason}". Credentials invalidated immediately.`,
          statusAfter: 'REVOKED',
          policyRuleApplied: 'POL-JIT-REV-005: Early session rollback and credential invalidation.',
          immutableHash: generateAuditHash(params.actorName, 'Session Early Revoked', now),
        };

        return {
          ...prev,
          [requestId]: {
            ...target,
            currentStatus: 'REVOKED',
            enforcementCategory: 'session_revoked',
            remainingSeconds: 0,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 7. Simulate Scope Deviation:
  // "If the employee deviates from the approved scope during the session, immediately pause the session and create a new alert."
  const simulateScopeDeviation = useCallback((requestId: string) => {
    setRequests((prev) => {
      const target = prev[requestId];
      if (!target) return prev;

      const now = '2026-09-12 01:22:45 UTC';
      const alertReason =
        'Unauthorized Scope Deviation: Process attempted privilege escalation (sudo -i) and outbound network connect to unapproved subnet. Session paused immediately.';

      const auditItem: AccessAuditLogEvent = {
        id: `aud-${requestId}-dev`,
        timestamp: now,
        actor: 'FABLE Real-Time Continuous Monitor',
        actorRole: 'In-Session EBPF Telemetry Agent',
        actorPersona: 'system',
        action: 'Session Paused (Scope Deviation Alert)',
        details: `${alertReason} Session held before privileged command execution. Alert dispatched to SOC.`,
        statusAfter: 'PAUSED',
        policyRuleApplied: 'POL-SCOPE-MON-007: Continuous session monitoring automatically pauses sessions on scope deviation.',
        immutableHash: generateAuditHash('FABLE Continuous Monitor', 'Scope Deviation Paused', now),
      };

      return {
        ...prev,
        [requestId]: {
          ...target,
          currentStatus: 'PAUSED',
          enforcementCategory: 'protective_hold',
          remainingSeconds: 0,
          deviationAlert: {
            triggered: true,
            timestamp: now,
            reason: alertReason,
            pausedSessionId: 'teleport-sess-4109-ap',
          },
          auditTimeline: [auditItem, ...target.auditTimeline],
        },
      };
    });
  }, []);

  // 8. Devraj Session Revocation Approval
  const approveDevrajRevocation = useCallback(
    (params: { reviewerName: string; reviewerRole: string; reason: string }) => {
      setRequests((prev) => {
        const target = prev['AR-104'];
        if (!target) return prev;

        const now = '2026-09-12 03:26:10 UTC';
        const auditItem: AccessAuditLogEvent = {
          id: `aud-104-rev-appr`,
          timestamp: now,
          actor: params.reviewerName,
          actorRole: params.reviewerRole,
          actorPersona: 'reviewer',
          action: 'Session Revocation Approved',
          details: `Reviewer approved full session termination and IAM credential freeze for Devraj Malhotra. 4.8 GB upload completely aborted under protective hold. Justification: "${params.reason}".`,
          statusAfter: 'REVOKED',
          policyRuleApplied: 'POL-CONT-009: Human-authorized destructive session revocation and credential freeze.',
          immutableHash: generateAuditHash(params.reviewerName, 'Session Revocation Approved', now),
        };

        return {
          ...prev,
          'AR-104': {
            ...target,
            currentStatus: 'REVOKED',
            enforcementCategory: 'session_revoked',
            decisionBy: params.reviewerName,
            decisionByRole: params.reviewerRole,
            decisionAt: now,
            decisionNotes: params.reason,
            auditTimeline: [auditItem, ...target.auditTimeline],
          },
        };
      });
    },
    []
  );

  // 9. Fast forward / simulate TTL expiry
  const expireNow = useCallback((requestId: string) => {
    setRequests((prev) => {
      const target = prev[requestId];
      if (!target) return prev;

      const now = '2026-09-12 01:29:00 UTC';
      const auditItem: AccessAuditLogEvent = {
        id: `aud-${requestId}-exp-sim`,
        timestamp: now,
        actor: 'FABLE JIT Policy Engine',
        actorRole: 'Simulated TTL Controller',
        actorPersona: 'system',
        action: 'Session Automatically Expired',
        details: `15-minute TTL elapsed. Temporary scoped access to ${target.resource} expired. Session cleanly closed with zero residual access.`,
        statusAfter: 'EXPIRED',
        policyRuleApplied: 'POL-JIT-TTL-002: Strict TTL auto-revocation upon countdown expiry.',
        immutableHash: generateAuditHash('FABLE JIT Policy Engine', 'Session Expired', now),
      };

      return {
        ...prev,
        [requestId]: {
          ...target,
          currentStatus: 'EXPIRED',
          enforcementCategory: 'session_revoked',
          remainingSeconds: 0,
          auditTimeline: [auditItem, ...target.auditTimeline],
        },
      };
    });
  }, []);

  // 10. Reset Simulation
  const resetSimulation = useCallback(() => {
    setRequests({
      'AR-203': JSON.parse(JSON.stringify(SEED_PRIYA_JIT_REQUEST)),
      'AR-104': JSON.parse(JSON.stringify(SEED_DEVRAJ_JIT_REQUEST)),
    });
    setActiveRequestId('AR-203');
    setIsToastDismissed(false);
  }, []);

  return {
    requests,
    activeRequestId,
    activeRequest,
    setActiveRequestId,
    isDetailDrawerOpen,
    setIsDetailDrawerOpen,
    isToastDismissed,
    setIsToastDismissed,
    formatCountdown,
    generateAIReview,
    proposeAccessDecision,
    approveScopedAccess,
    requestMoreContext,
    denyRequest,
    revokeEarly,
    simulateScopeDeviation,
    approveDevrajRevocation,
    expireNow,
    resetSimulation,
  };
}

export type JITAccessHook = ReturnType<typeof useJITAccess>;
