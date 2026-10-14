// src/api/client.ts
// FABLE Frontend API Client Gateway & Deterministic Simulation Engine
// Directives:
// 1. Strict separation of Live Backend mode and Deterministic Recording mode (VITE_FABLE_MODE).
// 2. Honesty Rule: In recording mode, displays DEMO SIMULATION · SYNTHETIC DATA and 'Simulated enforcement'.
// 3. NEVER silently switch modes after an API failure in live mode.
// 4. All responses adapted through the typed adapter layer without recalculating risk.
// 5. Complete state machine supporting context proposal, separation of duties, simulated enforcement, and reset.

import {
  Entity,
  Case,
  EntityCaseDetail,
  Counterfactual,
  ShiftMapData,
  ContextRevision,
  InvestigatorBrief,
  ResponseActionPlan,
} from '../types';
import {
  INITIAL_ENTITIES_RECORDING,
  INITIAL_NOTIFICATIONS_RECORDING,
  PRIYA_CASE,
  PRIYA_CASE_DETAIL,
  DEVRAJ_CASE,
  DEVRAJ_CASE_DETAIL,
  DEVRAJ_RESPONSE_ACTION,
  NEHA_CASE,
  NEHA_CASE_DETAIL,
  getArjunInitialCase,
  getArjunInitialCaseDetail,
  getArjunReassessedCase,
  getArjunReassessedCaseDetail,
  ARJUN_REVISION_SEED,
} from '../data/recordingSeed';
import { adaptCase, adaptCaseDetail } from './adapter';
import { validateAllDemoFixtures } from './contractValidator';
import { FIXED_CLOCK_DISPLAY, FIXED_CLOCK_ISO, SCORING_VERSION, SIMULATED_ENFORCEMENT_LABEL } from '../constants';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Mode Resolution: VITE_FABLE_MODE ('recording' | 'live')
const envMode = import.meta.env.VITE_FABLE_MODE;
const envDemo = import.meta.env.VITE_DEMO_MODE;

let isRecordingMode = envMode === 'live' || envDemo === 'false' ? false : true;

const modeListeners: Set<(isDemo: boolean) => void> = new Set();
const stateResetListeners: Set<() => void> = new Set();

export function isDemoMode(): boolean {
  return isRecordingMode;
}

export function isRecordingModeActive(): boolean {
  return isRecordingMode;
}

export function setDemoMode(enableDemo: boolean): void {
  isRecordingMode = enableDemo;
  modeListeners.forEach((fn) => fn(isRecordingMode));
}

export function subscribeToModeChanges(listener: (isDemo: boolean) => void): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

export function subscribeToStateReset(listener: () => void): () => void {
  stateResetListeners.add(listener);
  return () => {
    stateResetListeners.delete(listener);
  };
}

// ----------------------------------------------------------------------------
// Deterministic In-Memory State Machine for Recording Simulation
// ----------------------------------------------------------------------------
let demoEntitiesState: Entity[] = JSON.parse(JSON.stringify(INITIAL_ENTITIES_RECORDING));
let demoRevisionsStore: Record<string, ContextRevision[]> = {
  '107': [JSON.parse(JSON.stringify(ARJUN_REVISION_SEED))],
};
let devrajResponseActionState: ResponseActionPlan = JSON.parse(JSON.stringify(DEVRAJ_RESPONSE_ACTION));

/**
 * Resets all demo simulation state to pristine initial state.
 */
export function resetDemoState(): void {
  demoEntitiesState = JSON.parse(JSON.stringify(INITIAL_ENTITIES_RECORDING));
  demoRevisionsStore = {
    '107': [JSON.parse(JSON.stringify(ARJUN_REVISION_SEED))],
  };
  devrajResponseActionState = JSON.parse(JSON.stringify(DEVRAJ_RESPONSE_ACTION));
  stateResetListeners.forEach((fn) => fn());
}

// Persona / Identity for Separation of Duties
export type DemoPersona = 'analyst' | 'reviewer' | 'admin';
let currentDemoPersona: DemoPersona = 'analyst';

export function getDemoPersona(): DemoPersona {
  return currentDemoPersona;
}

export function setDemoPersona(persona: DemoPersona): void {
  currentDemoPersona = persona;
}

export function getDemoIdentityDetails() {
  if (currentDemoPersona === 'reviewer') {
    return {
      id: 'lead-approver',
      name: 'Sarah Sterling',
      role: 'VP Data Platform & Compliance Reviewer',
    };
  }
  if (currentDemoPersona === 'admin') {
    return {
      id: 'soc-admin',
      name: 'Elena Rostova',
      role: 'Director of Product & Security',
    };
  }
  return {
    id: 'analyst-proposer',
    name: 'Alex Thorne',
    role: 'SOC Tier 2 Analyst',
  };
}

// Generic API Fetcher for Live Mode
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const demoToken = import.meta.env.VITE_LOCAL_DEMO_BEARER_TOKEN;
  if (demoToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${demoToken}`);
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API error ${response.status} (${response.statusText}): ${errorText || 'Request failed'}`);
    }
    return (await response.json()) as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Live Backend Connection Failed for [${endpoint}]: ${message}`);
  }
}

// ----------------------------------------------------------------------------
// 1. Entities Endpoints
// ----------------------------------------------------------------------------
export async function getEntities(): Promise<Entity[]> {
  if (isRecordingMode) {
    // Check if Arjun's revision is approved, update entity representation
    const isArjunApproved = demoRevisionsStore['107']?.some((r) => r.status === 'approved');
    return demoEntitiesState.map((ent) => {
      if (ent.id === 'arjun-107' || ent.caseId === '107') {
        if (isArjunApproved) {
          const approvedRev = demoRevisionsStore['107'].find((r) => r.status === 'approved')!;
          return {
            ...ent,
            riskScore: 8.2,
            priorityScore: 14.2,
            riskLevel: 'resolved',
            caseStatus: 'Reviewing',
            classification: 'explained',
            summary: 'Dual cryptographic key rotation & finance archive export (Attenuated via FIN-AUDIT-2026).',
            response_state: 'Protective Hold Released · Retroactive Review Active',
            retroactive_justification_review: true,
            details: getArjunReassessedCaseDetail(approvedRev),
          };
        } else {
          return {
            ...ent,
            riskScore: 100,
            priorityScore: 100,
            riskLevel: 'escalated',
            caseStatus: 'Open',
            classification: 'partial',
            summary: 'Dual cryptographic key rotation & 1.2 GB Finance Parquet lake export. Scoped personal-cloud hold active, legitimate migration access unaffected.',
            response_state: 'Scoped Personal-Cloud Hold Active [Simulated]',
            details: getArjunInitialCaseDetail(),
          };
        }
      }
      if (ent.id === 'devraj-104' || ent.caseId === '104') {
        if (devrajResponseActionState.status === 'approved' || devrajResponseActionState.status === 'active') {
          return {
            ...ent,
            response_state: 'Containment Enforced [Simulated]',
          };
        }
      }
      return ent;
    });
  }
  const raw = await apiFetch<Entity[]>('/api/entities');
  return raw;
}

export async function getEntity(id: string): Promise<Entity> {
  const all = await getEntities();
  const query = id.toLowerCase();
  const found = all.find(
    (e) => e.id.toLowerCase() === query || e.caseId?.toLowerCase() === query || e.entity_ref?.toLowerCase() === query
  );
  if (!found) throw new Error(`Entity ${id} not found`);
  return found;
}

// ----------------------------------------------------------------------------
// 2. Cases Endpoints
// ----------------------------------------------------------------------------
export async function getCases(params?: Record<string, string>): Promise<Case[]> {
  if (isRecordingMode) {
    const isArjunApproved = demoRevisionsStore['107']?.some((r) => r.status === 'approved');
    const arjunCase = isArjunApproved ? getArjunReassessedCase() : getArjunInitialCase();

    const cases = [
      arjunCase,
      { ...DEVRAJ_CASE, response_action: devrajResponseActionState },
      PRIYA_CASE,
      NEHA_CASE,
    ];

    return cases.map((c) => adaptCase(c)).sort((a, b) => b.priority_score - a.priority_score);
  }

  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const rawList = await apiFetch<Case[]>(`/api/cases${query}`);
  return rawList.map((c) => adaptCase(c)).sort((a, b) => b.priority_score - a.priority_score);
}

export async function getCase(id: string): Promise<Case> {
  if (isRecordingMode) {
    const query = id.toLowerCase();
    if (query === '107' || query.includes('arjun') || query === 'usr-7823') {
      const isApproved = demoRevisionsStore['107']?.some((r) => r.status === 'approved');
      return adaptCase(isApproved ? getArjunReassessedCase() : getArjunInitialCase());
    }
    if (query === '104' || query.includes('devraj') || query === 'usr-4419') {
      return adaptCase({ ...DEVRAJ_CASE, response_action: devrajResponseActionState });
    }
    if (query === '101' || query.includes('priya') || query === 'usr-9021') {
      return adaptCase(PRIYA_CASE);
    }
    if (query === '112' || query.includes('neha') || query === 'usr-1184') {
      return adaptCase(NEHA_CASE);
    }
    
    // Look up in full master entities list
    const foundEntity = demoEntitiesState.find(
      (e) =>
        e.id.toLowerCase() === query ||
        e.caseId?.toLowerCase() === query ||
        e.entity_ref?.toLowerCase() === query ||
        e.name.toLowerCase().includes(query)
    );

    if (foundEntity) {
      return adaptCase({
        id: foundEntity.caseId || `case-${foundEntity.id}`,
        actor_id: foundEntity.id,
        entity_ref: foundEntity.entity_ref || `USR-${foundEntity.id.slice(0, 4).toUpperCase()}`,
        actor_name: foundEntity.name,
        actor_role: foundEntity.role,
        department: foundEntity.department,
        created_at: FIXED_CLOCK_ISO,
        status: foundEntity.caseStatus || (foundEntity.riskScore > 25 ? 'Reviewing' : 'Cleared'),
        raw_deviation: foundEntity.riskScore || 4.0,
        context_coverage: 1.0,
        residual_risk: foundEntity.riskScore || 2.0,
        priority_score: foundEntity.priorityScore ?? foundEntity.riskScore ?? 2.0,
        assessment_confidence: 0.99,
        data_quality: 'high',
        scoring_version: SCORING_VERSION,
        critical_activity_observed: false,
        critical_review_required: false,
        policy_floor_applied: false,
        residual_unresolved_count: 0,
        primary_cause: foundEntity.summary || `${foundEntity.name} is operating within normal baseline parameters.`,
        response_action: {
          id: `resp-${foundEntity.id}`,
          case_id: foundEntity.caseId || foundEntity.id,
          action_type: 'observe',
          title: 'Standard Baseline Observation',
          reason: 'Behavior is fully within verified baseline operational parameters.',
          policy_rule: 'RULE-POL-BASE: No containment required for baseline operations.',
          automatic_execution: true,
          requires_human_approval: false,
          affected_scope: [],
          unaffected_scope: ['All normal credentials and permissions active'],
          affected_sessions: [],
          affected_destinations: [],
          unaffected_activities: ['Full platform access', 'Development tools'],
          duration_ttl: 'Permanent',
          status: 'active',
          triggered_at: FIXED_CLOCK_ISO,
          rollback_supported: false,
          is_simulated: true,
          simulation_label: SIMULATED_ENFORCEMENT_LABEL,
        },
      });
    }

    throw new Error(`Case #${id} not found in deterministic dataset`);
  }

  const raw = await apiFetch<Case>(`/api/cases/${encodeURIComponent(id)}`);
  return adaptCase(raw);
}

export async function getCaseDetail(caseId: string): Promise<EntityCaseDetail> {
  if (isRecordingMode) {
    const query = caseId.toLowerCase();
    if (query === '107' || query.includes('arjun') || query === 'usr-7823') {
      const approvedRev = demoRevisionsStore['107']?.find((r) => r.status === 'approved');
      if (approvedRev) {
        return adaptCaseDetail(getArjunReassessedCaseDetail(approvedRev));
      }
      return adaptCaseDetail(getArjunInitialCaseDetail());
    }
    if (query === '104' || query.includes('devraj') || query === 'usr-4419') {
      return adaptCaseDetail({ ...DEVRAJ_CASE_DETAIL, responseAction: devrajResponseActionState });
    }
    if (query === '101' || query.includes('priya') || query === 'usr-9021') {
      return adaptCaseDetail(PRIYA_CASE_DETAIL);
    }
    if (query === '112' || query.includes('neha') || query === 'usr-1184') {
      return adaptCaseDetail(NEHA_CASE_DETAIL);
    }

    // Look up in full master entities list
    const foundEntity = demoEntitiesState.find(
      (e) =>
        e.id.toLowerCase() === query ||
        e.caseId?.toLowerCase() === query ||
        e.entity_ref?.toLowerCase() === query ||
        e.name.toLowerCase().includes(query)
    );

    if (foundEntity) {
      return adaptCaseDetail({
        id: foundEntity.caseId || `case-${foundEntity.id}`,
        entity_ref: foundEntity.entity_ref || `USR-${foundEntity.id.slice(0, 4).toUpperCase()}`,
        rawDeviationScore: foundEntity.riskScore || 4.0,
        contextCoverageScore: 100,
        residualRiskScore: foundEntity.riskScore || 2.0,
        priorityScore: foundEntity.priorityScore ?? foundEntity.riskScore ?? 2.0,
        scoringVersion: SCORING_VERSION,
        initialDriftPattern: `${foundEntity.name} (${foundEntity.role}) is operating within verified organizational baseline parameters with zero anomalous telemetry episodes.`,
        timelineEvents: [],
        eventContributions: [],
        contextLedger: [
          {
            id: `ctx-${foundEntity.id}-1`,
            type: 'Role Entitlement',
            title: `${foundEntity.role} — ${foundEntity.department} Standing Entitlement`,
            status: 'valid',
            note: `Standing access verified for ${foundEntity.department} operational systems.`,
            effective_window: 'Permanent Standing Access',
          },
        ],
        signalCategories: [
          {
            category_id: `cat-${foundEntity.id}-base`,
            name: 'baseline',
            display_name: 'Standard Operational Baseline',
            category_score: foundEntity.riskScore || 2.0,
            combination_method: 'Baseline Reference',
            contributing_signals: ['Okta SSO Authentication', 'IAM Role Entitlement'],
            raw_fields: ['auth.status', 'session.validity'],
            signal_sources: ['Okta Identity', 'CloudTrail Gateway'],
            signal_type: 'learned',
          },
        ],
        evidenceEpisodes: [],
        counterfactualWaterfall: {
          current_risk: foundEntity.riskScore || 2.0,
          deltas: [],
        },
        shiftMap: {
          nodes: [],
          edges: [],
          change_point_timestamp: FIXED_CLOCK_DISPLAY,
        },
        responseAction: {
          id: `resp-${foundEntity.id}`,
          case_id: foundEntity.caseId || foundEntity.id,
          action_type: 'observe',
          title: 'Standard Baseline Telemetry Observation',
          reason: 'Behavior is fully within verified baseline operational parameters.',
          policy_rule: 'RULE-POL-BASE: No containment required for baseline operations.',
          automatic_execution: true,
          requires_human_approval: false,
          affected_scope: [],
          unaffected_scope: ['All normal credentials and permissions active'],
          affected_sessions: [],
          affected_destinations: [],
          unaffected_activities: ['Full platform access', 'Development tools'],
          duration_ttl: 'Permanent',
          status: 'active',
          triggered_at: FIXED_CLOCK_ISO,
          rollback_supported: false,
          is_simulated: true,
          simulation_label: SIMULATED_ENFORCEMENT_LABEL,
        },
        blastRadius: {
          nodes: [],
          edges: [],
          summary: {
            affected_count: 0,
            unaffected_count: 1,
            blocked_destinations: [],
            preserved_work: ['All standing credentials and tools normal'],
          },
        },
        originalAssessment: {
          id: `asm-${foundEntity.id}-orig`,
          case_id: foundEntity.caseId || foundEntity.id,
          assessed_at: '2026-09-12 00:00 UTC',
          trigger: 'Baseline Ingestion Telemetry',
          raw_deviation: foundEntity.riskScore || 4.0,
          risk_weighted_coverage: 1.0,
          residual_risk: foundEntity.riskScore || 2.0,
          priority_score: foundEntity.priorityScore ?? foundEntity.riskScore ?? 2.0,
          confidence: 99,
          assessment_confidence: 0.99,
          data_quality: 'high',
          scoring_version: SCORING_VERSION,
          critical_activity_observed: false,
          critical_review_required: false,
          policy_floor_applied: false,
          unresolved_event_count: 0,
        },
        currentAssessment: {
          id: `asm-${foundEntity.id}-curr`,
          case_id: foundEntity.caseId || foundEntity.id,
          assessed_at: '2026-09-12 04:00 UTC',
          trigger: 'Continuous Baseline Telemetry Ingestion',
          raw_deviation: foundEntity.riskScore || 4.0,
          risk_weighted_coverage: 1.0,
          residual_risk: foundEntity.riskScore || 2.0,
          priority_score: foundEntity.priorityScore ?? foundEntity.riskScore ?? 2.0,
          confidence: 99,
          assessment_confidence: 0.99,
          data_quality: 'high',
          scoring_version: SCORING_VERSION,
          critical_activity_observed: false,
          critical_review_required: false,
          policy_floor_applied: false,
          unresolved_event_count: 0,
        },
      });
    }

    throw new Error(`Case detail #${caseId} not found in deterministic dataset`);
  }

  const raw = await apiFetch<EntityCaseDetail>(`/api/cases/${encodeURIComponent(caseId)}/detail`);
  return adaptCaseDetail(raw);
}

// ----------------------------------------------------------------------------
// 3. Counterfactual & ShiftMap Endpoints
// ----------------------------------------------------------------------------
export async function getCounterfactual(caseId: string): Promise<Counterfactual> {
  const detail = await getCaseDetail(caseId);
  return (
    detail.counterfactualWaterfall || {
      current_risk: detail.residualRiskScore,
      deltas: [],
    }
  );
}

export async function getShiftMapData(caseId: string): Promise<ShiftMapData> {
  const detail = await getCaseDetail(caseId);
  return (
    detail.shiftMap || {
      nodes: [],
      edges: [],
      change_point_timestamp: FIXED_CLOCK_DISPLAY,
    }
  );
}

// ----------------------------------------------------------------------------
// 4. Context Revision Proposal & Review Workflow (Separation of Duties)
// ----------------------------------------------------------------------------
export async function getContextRevisions(caseId: string): Promise<ContextRevision[]> {
  if (isRecordingMode) {
    return demoRevisionsStore[caseId] || demoRevisionsStore['107'] || [];
  }
  return apiFetch<ContextRevision[]>(`/api/cases/${encodeURIComponent(caseId)}/context-revisions`);
}

export async function proposeContextRevision(
  caseId: string,
  revision: {
    reason: string;
    effective_from: string;
    effective_until: string;
    allowed_resources: string[];
    allowed_actions: string[];
    approved_destinations?: string[];
  }
): Promise<ContextRevision> {
  const proposer = getDemoIdentityDetails();
  if (isRecordingMode) {
    const newRevision: ContextRevision = {
      id: `rev-${caseId}-${(demoRevisionsStore[caseId]?.length || 0) + 1}`,
      case_id: caseId,
      proposer_id: proposer.id,
      proposer_name: proposer.name,
      proposer_role: proposer.role,
      reason: revision.reason,
      effective_from: revision.effective_from,
      effective_until: revision.effective_until,
      allowed_resources: revision.allowed_resources,
      allowed_actions: revision.allowed_actions,
      approved_destinations: revision.approved_destinations,
      status: 'pending',
      created_at: '2026-09-12 04:45 UTC',
      is_late_context: true,
      requires_retroactive_review: true,
    };
    if (!demoRevisionsStore[caseId]) {
      demoRevisionsStore[caseId] = [];
    }
    demoRevisionsStore[caseId] = [newRevision, ...demoRevisionsStore[caseId]];
    return newRevision;
  }

  return apiFetch<ContextRevision>(`/api/cases/${encodeURIComponent(caseId)}/context-revisions`, {
    method: 'POST',
    body: JSON.stringify(revision),
  });
}

export async function reviewContextRevision(
  caseId: string,
  revisionId: string,
  actionOrPayload: 'approve' | 'reject' | { decision: 'approved' | 'rejected'; review_notes?: string },
  notes?: string
): Promise<{ success: boolean; revision: ContextRevision }> {
  const reviewer = getDemoIdentityDetails();
  const action =
    typeof actionOrPayload === 'string'
      ? actionOrPayload
    : actionOrPayload.decision === 'approved'
    ? 'approve'
    : 'reject';
  const effectiveNotes = typeof actionOrPayload === 'object' ? actionOrPayload.review_notes : notes;

  if (isRecordingMode) {
    const list = demoRevisionsStore[caseId] || demoRevisionsStore['107'] || [];
    const target = list.find((r) => r.id === revisionId);
    if (!target) throw new Error(`Revision ${revisionId} not found`);

    // Strict Separation of Duties Enforcement: Proposer cannot approve their own revision!
    if (target.proposer_id === reviewer.id) {
      throw new Error(
        'Separation of Duties Violation: The proposer of a context revision cannot approve or reject it. Switch persona to Sarah Sterling (Reviewer) or Elena Rostova (Admin) in the top bar to approve.'
      );
    }

    if (action === 'approve') {
      list.forEach((r) => {
        if (r.id !== revisionId && r.status === 'approved') {
          r.status = 'superseded';
          r.superseded_by_id = revisionId;
        }
      });
      target.status = 'approved';
      const prevApproved = list.find((r) => r.status === 'superseded');
      if (prevApproved) {
        target.supersedes_id = prevApproved.id;
      }
    } else {
      target.status = 'rejected';
    }

    target.approver_id = reviewer.id;
    target.approver_name = reviewer.name;
    target.approver_role = reviewer.role;
    target.review_notes =
      effectiveNotes ||
      (action === 'approve'
        ? 'Verified against compliance schedule FIN-AUDIT-2026. Approved full attenuation with retroactive audit flag.'
        : 'Rejected after security operations review.');
    target.approved_at = '2026-09-12 04:50 UTC';

    return { success: true, revision: target };
  }

  return apiFetch<{ success: boolean; revision: ContextRevision }>(
    `/api/cases/${encodeURIComponent(caseId)}/context-revisions/${encodeURIComponent(revisionId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ action, notes: effectiveNotes }),
    }
  );
}

// ----------------------------------------------------------------------------
// 5. Response Actions & Simulated Enforcement
// ----------------------------------------------------------------------------
export async function executeResponseActionSimulated(
  caseId: string,
  actionType: 'approve_containment' | 'release_hold' | 'rollback',
  notes?: string
): Promise<{ success: boolean; response_action: ResponseActionPlan }> {
  const actor = getDemoIdentityDetails();
  if (isRecordingMode) {
    if (caseId === '104' || caseId.includes('devraj')) {
      if (actionType === 'approve_containment') {
        if (actor.id === 'analyst-proposer') {
          throw new Error(
            'Human Authority Rule: Broad containment requires Reviewer or Admin approval. Switch persona to Sarah Sterling or Elena Rostova.'
          );
        }
        devrajResponseActionState = {
          ...devrajResponseActionState,
          status: 'approved',
          approved_by: `${actor.name} (${actor.role})`,
          approved_at: '2026-09-12 03:15 UTC',
          reason: notes || 'Approved broad session isolation and Vault credential revocation via sandbox enforcement adapter.',
        };
      } else if (actionType === 'rollback') {
        devrajResponseActionState = {
          ...devrajResponseActionState,
          status: 'rolled_back',
          reason: 'Rollback initiated by incident commander.',
        };
      }
      return { success: true, response_action: devrajResponseActionState };
    }

    return {
      success: true,
      response_action: {
        id: `resp-${caseId}`,
        case_id: caseId,
        action_type: 'protective_hold',
        title: 'Targeted Protective Hold',
        reason: notes || 'Sandbox simulated protective hold executed.',
        policy_rule: 'RULE-POL-884',
        automatic_execution: true,
        requires_human_approval: false,
        affected_scope: ['Targeted destination only'],
        unaffected_scope: ['Core development tools unaffected'],
        affected_sessions: [],
        affected_destinations: [],
        unaffected_activities: [],
        duration_ttl: '4 hours',
        status: 'active',
        triggered_at: FIXED_CLOCK_DISPLAY,
        rollback_supported: true,
        is_simulated: true,
        simulation_label: SIMULATED_ENFORCEMENT_LABEL,
      },
    };
  }

  return apiFetch<{ success: boolean; response_action: ResponseActionPlan }>(
    `/api/cases/${encodeURIComponent(caseId)}/response-actions/execute`,
    {
      method: 'POST',
      body: JSON.stringify({ action: actionType, notes }),
    }
  );
}

// ----------------------------------------------------------------------------
// 6. Forensic Evidence Summary & Narrative Synthesis (Grounded in Contract)
// ----------------------------------------------------------------------------
export async function getInvestigatorBrief(caseId: string, actorName?: string): Promise<InvestigatorBrief> {
  const timeStr = '04:35 UTC';

  if (isRecordingMode) {
    if (caseId.includes('107') || (actorName && actorName.toLowerCase().includes('arjun'))) {
      const isApproved = demoRevisionsStore['107']?.some((r) => r.status === 'approved');
      if (isApproved) {
        return {
          narrative: `Forensic synthesis for Case #107 (Arjun Patel) [Current Assessment - Reassessed]: Dual cryptographic activity observed starting at 04:10 UTC. Event [arjun-ev-1] (KMS Key Rotation) is fully covered by change record [ctx-a-1 / RFC-3982]. Event [arjun-ev-2] (1.2 GB Finance Archive Export) has been validated via approved context revision [rev-107-01] referencing [FIN-AUDIT-2026] and signed off by Sarah Sterling (VP Data Platform). Because context was approved after the observed operation, a retroactive-justification review flag has been recorded. Current residual risk is attenuated to 3.4/100 (Priority 14.2). The original assessment of 48.6 residual risk remains immutably preserved side-by-side.`,
          executive_summary: `Dual-key KMS envelope migration with GCS finance archive export. Validated under change record RFC-3982 and approved late context FIN-AUDIT-2026.`,
          synthesized_narrative: `Evidence citations confirm authorized maintenance window and compliance sampling. The case remains preserved in Reviewing status pending retroactive justification audit.`,
          key_evidence_citations: [
            '[arjun-ev-1] 04:10 UTC — KMS Key rotation eu-west-1 (Validated under RFC-3982)',
            '[arjun-ev-2] 04:32 UTC — 1.2 GB Parquet export to analytics lake (Attenuated via FIN-AUDIT-2026 [rev-107-01])',
          ],
          context_grant_correlation: [
            '[ctx-a-1] RFC-3982: Q3 Multi-Region Key Envelope Rotation (Valid)',
            '[ctx-a-2] FIN-AUDIT-2026: Finance Archive Data Verification (Verified Late Context)',
            '[ctx-a-3] VP Sign-off: S. Sterling (VP Data Platform) (Approved)',
          ],
          recommended_next_steps: [
            'Preserve dual assessment records in immutable audit history',
            'Log compliance reviewer confirmation to immutable ledger',
          ],
          generated_at: `2026-09-12 at ${timeStr}`,
          model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4',
          model_version: 'v2.4.1 (Contract Grounded)',
          is_live: false,
        };
      }

      return {
        narrative: `Forensic synthesis for Case #107 (Arjun Patel) [Original Assessment]: Observed dual cryptographic activity starting at 04:10 UTC. Event [arjun-ev-1] (KMS Key Rotation in eu-west-1) is explained by approved change record [ctx-a-1 / RFC-3982]. However, Event [arjun-ev-2] (1.2 GB GCS Finance Parquet Export at 04:32 UTC) currently lacks an approved contextual grant, resulting in an unresolved event contribution of 84.0 and overall residual risk of 48.6/100 (Priority 86.0). A targeted protective hold is active on destination gcs://external-analytics-share-2026 (Simulated enforcement). A context revision proposal [rev-107-01] has been filed for compliance ticket FIN-AUDIT-2026 and is awaiting independent reviewer approval.`,
        executive_summary: `Dual-key KMS migration explained; high-volume finance archive export remains unresolved pending context review.`,
        synthesized_narrative: `Partial context coverage (42%). Cryptographic envelope rotation is authenticated, but finance dataset download requires attestation.`,
        key_evidence_citations: [
          '[arjun-ev-1] 04:10 UTC — KMS Key rotation in eu-west-1 (Explained by RFC-3982)',
          '[arjun-ev-2] 04:32 UTC — 1.2 GB Parquet export (Unresolved contribution: 84.0, Scoped Protective Hold Active)',
        ],
        context_grant_correlation: ['[ctx-a-1] RFC-3982: Approved KMS Maintenance Window'],
        recommended_next_steps: [
          'Review pending context proposal [rev-107-01] with authorized reviewer role',
          'Verify scoped protective hold containment boundary on external bucket',
        ],
        generated_at: `2026-09-12 at ${timeStr}`,
        model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4',
        model_version: 'v2.4.1 (Contract Grounded)',
        is_live: false,
      };
    }

    if (caseId.includes('104') || (actorName && actorName.toLowerCase().includes('devraj'))) {
      return {
        narrative: `Forensic synthesis for Case #104 (Devraj Malhotra): Severe anomalous telemetry observed at 02:48 UTC originating from unregistered Singapore residential ASN 4657 (Event [devraj-ev-1]). At 02:59 UTC, actor performed unapproved HashiCorp Vault read on customer-pii-master-key (Event [devraj-ev-2]) without active on-call ticket or RFC grant. This was followed at 03:05 UTC by a 4.8 GB compressed database dump directly to non-corporate endpoint s3://archive-sync-sg-991 (Event [devraj-ev-3]). With 0.0% context coverage, residual risk is 98.4/100. Critical review is mandatory and policy floor is enforced. Scoped protective hold active on destination; broad containment awaits human authorization.`,
        executive_summary: `Unapproved master secret read from foreign ASN ingress followed by direct 4.8 GB database export to external S3 destination.`,
        synthesized_narrative: `Potentially dangerous account activity detected. Ingress bypassed corporate VPN and accessed production secrets without matching incident authorization.`,
        key_evidence_citations: [
          '[devraj-ev-1] 02:48 UTC — Ingress from unregistered Singapore ASN 4657 (Raw Risk 64.0)',
          '[devraj-ev-2] 02:59 UTC — Vault customer-pii-master-key read without active on-call ticket (Raw Risk 92.5)',
          '[devraj-ev-3] 03:05 UTC — 4.8 GB database export to external bucket s3://archive-sync-sg-991 (Raw Risk 98.4)',
        ],
        context_grant_correlation: [],
        recommended_next_steps: [
          'Review and authorize containment action with authorized security reviewer persona',
          'Preserve immutable forensic audit logs for legal and compliance review',
        ],
        generated_at: `2026-09-12 at ${timeStr}`,
        model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4',
        model_version: 'v2.4.1 (Contract Grounded)',
        is_live: false,
      };
    }

    if (caseId.includes('101') || (actorName && actorName.toLowerCase().includes('priya'))) {
      return {
        narrative: `Forensic synthesis for Case #101 (Priya Ramesh): Off-hours bastion access at 01:14 UTC was executed during an active Sev-1 payment outage. Correlation with PagerDuty Shift #88219 [ctx-p-1] and hotfix change record RFC-4109 [ctx-p-2] provides 98% context coverage, attenuating raw event deviation to a baseline residual risk of 0.8/100 (Priority 4.2). Activity is verified as legitimate emergency incident triage.`,
        executive_summary: `Off-hours emergency bastion session verified against active Sev-1 incident on-call paging schedule.`,
        synthesized_narrative: `Priya engaged SSH bastion tunnel to restore payment webhook queue. Activity was fully covered by PagerDuty incident schedule and emergency change authorization.`,
        key_evidence_citations: [
          '[priya-ev-1] 01:14 UTC — Step-up authentication from authorized home subnet',
          '[priya-ev-2] 01:22 UTC — Emergency bastion SSH certificate minting (PagerDuty Incident #88219)',
          '[priya-ev-3] 02:05 UTC — Payment gateway worker pod restarts (RFC-4109)',
        ],
        context_grant_correlation: [
          '[ctx-p-1] PagerDuty Shift #88219 (Primary Incident Commander)',
          '[ctx-p-2] RFC-4109 (Emergency Payment Worker Restart Hotfix)',
          '[ctx-p-3] Standing SRE Production Entitlement',
        ],
        recommended_next_steps: ['Maintain case disposition as Cleared (Residual risk 0.8/100)'],
        generated_at: `2026-09-12 at ${timeStr}`,
        model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4',
        model_version: 'v2.4.1 (Contract Grounded)',
        is_live: false,
      };
    }

    if (caseId.includes('112') || (actorName && actorName.toLowerCase().includes('neha'))) {
      return {
        narrative: `Forensic synthesis for Case #112 (Neha Sharma): Telemetry indicates standard developer onboarding activity (SSO login, passkey enrollment, git clone). Because employee tenure is 3 days (< 14 days baseline window), statistical covariance calculation is deferred. Data quality is categorized as Sparse and assessment confidence is 24%. The case entered the triage queue purely due to baseline uncertainty, not policy violation. Policy strictly forbids containment from uncertainty alone.`,
        executive_summary: `Developer onboarding telemetry with sparse baseline history (Tenure: 3 days < 14 days threshold).`,
        synthesized_narrative: `Observed actions conform to standard developer workstation provisioning. Statistical model deferred covariance calculations pending 14-day history accumulation.`,
        key_evidence_citations: [
          '[neha-ev-1] 03:50 UTC — First SSO login and hardware security key enrollment',
          '[neha-ev-2] 04:15 UTC — Git clone of frontend-platform repository',
          '[neha-ev-3] 04:50 UTC — Developer sandbox SSH certificate request',
        ],
        context_grant_correlation: [
          '[ctx-n-1] New Hire Engineering Onboarding (Day 3)',
          '[ctx-n-2] Manager Welcome Sign-off: D. Vance',
        ],
        recommended_next_steps: ['Allow telemetry baseline to accumulate over standard 14-day training window'],
        generated_at: `2026-09-12 at ${timeStr}`,
        model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4',
        model_version: 'v2.4.1 (Contract Grounded)',
        is_live: false,
      };
    }
  }

  try {
    return await apiFetch<InvestigatorBrief>(`/api/cases/${encodeURIComponent(caseId)}/narrative`);
  } catch {
    return {
      narrative: `Forensic synthesis for Case #${caseId}: Telemetry evaluation conducted across identity and resource access layers.`,
      executive_summary: `Case #${caseId} baseline synthesis.`,
      synthesized_narrative: `Deterministic evidence correlated with active organizational grants.`,
      generated_at: FIXED_CLOCK_DISPLAY,
      model: 'FABLE-Forensic-Evidence-Synthesizer-v2.4 (Deterministic Fallback)',
      model_version: 'v2.4.1 (Contract Grounded)',
      is_live: false,
    };
  }
}

// ----------------------------------------------------------------------------
// 10. Recommend Containment
// ----------------------------------------------------------------------------
export async function recommendContainment(
  caseId: string,
  rationale: string
): Promise<{ status: string; caseId: string; timestamp: string }> {
  if (isRecordingMode) {
    if (caseId.includes('104') || caseId.includes('devraj')) {
      devrajResponseActionState = {
        ...devrajResponseActionState,
        status: 'awaiting_approval',
        reason: rationale,
      };
    }
    return {
      status: 'Containment Recommended (Simulated enforcement)',
      caseId,
      timestamp: FIXED_CLOCK_DISPLAY,
    };
  }

  return await apiFetch<{ status: string; caseId: string; timestamp: string }>(
    `/api/cases/${encodeURIComponent(caseId)}/containment-recommendation`,
    {
      method: 'POST',
      body: JSON.stringify({ rationale }),
    }
  );
}

