// src/types.ts
// Domain types aligned with FABLE Backend OpenAPI Specification & Event-Level Scoring Contract (v2.4.1)

export type RiskLevel = 'calm' | 'elevated' | 'escalated' | 'resolved';

export type CaseStatus =
  | 'Open'
  | 'Reviewing'
  | 'Cleared'
  | 'Reopened'
  | 'Containment Recommended'
  | 'Indeterminate Baseline';

export type BehaviorClassification =
  | 'explained'
  | 'partial'
  | 'unexplained'
  | 'indeterminate'
  | 'Containment Recommended'
  | 'Cleared';

export type DataQuality = 'high' | 'medium' | 'low' | 'sparse' | 'insufficient' | 'rich';

export interface ResourceTarget {
  id: string;
  name: string;
  critical: boolean;
  protectiveHold?: boolean;
}

// ----------------------------------------------------------------------------
// 1. Immutable Assessment Records (Original vs Current Reassessment)
// ----------------------------------------------------------------------------
export interface AssessmentDetail {
  id: string;
  assessment_id?: string;
  case_id: string;
  assessed_at: string;
  trigger: string; // e.g. "Initial Telemetry Ingestion", "Context Revision Approval (rev-107-01)"
  raw_deviation: number; // 0-100
  risk_weighted_coverage: number; // 0.0 - 1.0 (e.g. 0.42 or 0.96)
  residual_risk: number; // 0-100 (Fused from event-level unexplained contributions)
  priority_score: number; // 0-100 (Backend triage priority)
  confidence?: number; // 0-100 or 0.0-1.0
  assessment_confidence?: number; // 0.0 - 1.0
  data_quality: DataQuality;
  scoring_version: string; // e.g. "fable-scoring-v2.4.1"
  critical_activity_observed?: boolean;
  critical_review_required?: boolean;
  critical_review_triggered?: boolean;
  retroactive_justification_review?: boolean;
  policy_floor_applied?: boolean;
  policy_floor_reason?: string;
  unresolved_event_count?: number;
}

// ----------------------------------------------------------------------------
// 2. Event-Level Residual Contributions & Evidence
// ----------------------------------------------------------------------------
export type ContextState =
  | 'unresolved'
  | 'partially_explained'
  | 'explained'
  | 'indeterminate'
  | 'critical'
  | 'late_context_affected';

export interface EventContribution {
  id: string;
  event_id?: string;
  timestamp: string;
  action: string;
  source: string;
  resource: string;
  destination?: string;
  vector?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  event_raw_risk: number; // 0-100
  context_state: ContextState;
  context_credit: number; // 0.0 - 1.0 (Attenuates event_raw_risk)
  residual_before_policy?: number; // 0-100
  final_residual_contribution: number; // 0-100
  critical_action?: boolean;
  matched_context_id?: string;
  matched_context_title?: string;
  episode_id?: string;
  episode_name?: string;
  explanation?: string;
  details?: string;
  actor_id?: string;
  is_late_context?: boolean;
}

// Legacy-compatible alias for UI components
export interface EvidenceEvent {
  id: string;
  timestamp: string;
  source: string;
  event: string;
  vector: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  isSystemAction?: boolean;
  resource?: ResourceTarget | string;
  action?: string;
  raw_risk?: number;
  residual_contribution?: number;
  context_state?: ContextState;
  matched_context_id?: string;
  critical_action?: boolean;
}

// ----------------------------------------------------------------------------
// 3. Signal Categories (5 standard categories) & Evidence Episodes
// ----------------------------------------------------------------------------
export type SignalCategoryName =
  | 'identity'
  | 'resource_access'
  | 'privilege'
  | 'data_movement'
  | 'temporal_sequence'
  | string;

export interface SignalCategory {
  id?: string;
  category_id?: string;
  name: SignalCategoryName;
  display_name?: string;
  category_score?: number; // 0-100
  raw_risk?: number;
  residual_risk?: number;
  context_credit?: number;
  event_count?: number;
  primary_driver?: string;
  combination_method?: string; // e.g. "Max within correlated group", "Noisy-OR cross-category fusion"
  contributing_signals?: string[];
  raw_fields?: string[];
  signal_sources?: string[];
  signal_type?: 'learned' | 'rule_based';
}

export interface EvidenceEpisode {
  id?: string;
  episode_id?: string;
  name: string;
  status?: string;
  time_span?: string;
  raw_risk?: number;
  residual_risk?: number;
  event_count?: number;
  explanation?: string;
  description?: string;
  combination_method?: string; // "Max (non-inflating) within correlated group"
  event_ids?: string[];
  group_score?: number;
}

export interface ConstituentSignal {
  id: string;
  name: string;
  signal_source: string;
  value: number;
  weight?: number;
  category: 'rule-based' | 'learned' | 'weighted';
  category_group?: SignalCategoryName;
  description?: string;
}

// ----------------------------------------------------------------------------
// 4. Context Revision Proposal / Review & Provenance (Separation of Duties)
// ----------------------------------------------------------------------------
export type ContextRevisionStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

export interface ContextRevision {
  id: string;
  case_id: string;
  proposer_id: string;
  proposer_name: string;
  proposer_role: string;
  approver_id?: string;
  approver_name?: string;
  approver_role?: string;
  reason: string;
  effective_from: string; // e.g. "2026-09-12 04:00 UTC"
  effective_until: string; // e.g. "2026-09-12 08:00 UTC"
  created_at: string;
  approved_at?: string;
  status: ContextRevisionStatus;
  supersedes_id?: string;
  superseded_by_id?: string;
  allowed_resources: string[];
  allowed_actions: string[];
  approved_destinations?: string[];
  is_late_context: boolean; // True if approved/created after the event timestamps
  requires_retroactive_review: boolean;
  review_notes?: string;
}

export interface ContextLedgerItem {
  id: string;
  type?: 'Approved RFC' | 'On-Call Schedule' | 'Role Entitlement' | 'Manager Attestation' | 'Ticket Link' | string;
  title: string;
  source_id?: string;
  source_system?: string;
  status?: 'valid' | 'missing' | 'expired' | 'unmatched' | string;
  note?: string;
  description?: string;
  weight?: number; // 0.0 - 1.0 (coverage weight)
  resource?: ResourceTarget | string;
  is_late_context?: boolean;
  retroactive_review_required?: boolean;
  effective_window?: string;
  created_at?: string;
  approver?: string;
  is_matched?: boolean;
}

// ----------------------------------------------------------------------------
// 5. Response Action Ladder, Policy Containment & Blast Radius
// ----------------------------------------------------------------------------
export type ResponseActionLadderLevel =
  | 'observe'
  | 'step_up_mfa'
  | 'protective_hold'
  | 'human_containment';

export type ResponseActionStatus =
  | 'auto_authorized'
  | 'executing'
  | 'active'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'rolled_back';

export interface ResponseActionPlan {
  id: string;
  case_id: string;
  action_type: ResponseActionLadderLevel;
  title: string;
  reason: string;
  policy_rule: string;
  automatic_execution: boolean;
  requires_human_approval: boolean;
  affected_scope: string[];
  unaffected_scope: string[];
  affected_sessions: string[];
  affected_destinations: string[];
  unaffected_activities: string[];
  duration_ttl: string;
  status: ResponseActionStatus;
  triggered_at: string;
  approved_by?: string;
  approved_at?: string;
  rollback_supported: boolean;
  is_simulated: boolean;
  simulation_label: string; // "Simulated enforcement"
}

export interface BlastRadiusNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'entity' | 'device' | 'session' | 'resource' | 'destination' | 'context_ticket' | 'response_action';
  state: 'normal' | 'affected' | 'unaffected' | 'blocked' | 'verified';
  details?: string;
}

export interface BlastRadiusEdge {
  from: string;
  to: string;
  label?: string;
  status: 'authorized' | 'unauthorized_hold' | 'context_grant' | 'containment_boundary';
}

export interface BlastRadiusData {
  nodes: BlastRadiusNode[];
  edges: BlastRadiusEdge[];
  summary: {
    affected_count: number;
    unaffected_count: number;
    blocked_destinations: string[];
    preserved_work: string[];
  };
}

// ----------------------------------------------------------------------------
// 6. Investigator Narrative Brief & Counterfactual Attribution
// ----------------------------------------------------------------------------
export interface InvestigatorBrief {
  narrative: string;
  generated_at: string;
  model: string;
  is_live: boolean;
  executive_summary?: string;
  synthesized_narrative?: string;
  key_evidence_citations?: string[];
  context_grant_correlation?: string[];
  recommended_next_steps?: string[];
  model_version?: string;
}

export interface CounterfactualDelta {
  label: string;
  risk_without: number;
  factor_type?: string;
  impact_description?: string;
}

export interface Counterfactual {
  current_risk: number;
  deltas: CounterfactualDelta[];
}

export interface CounterfactualScenario {
  id: string;
  hypothesis: string;
  probability: number;
  verdict: 'Supported' | 'Refuted' | 'Inconclusive';
  reasoning: string;
}

// ----------------------------------------------------------------------------
// 7. Shift Map Graph & Topology
// ----------------------------------------------------------------------------
export interface ShiftMapNode {
  id: string;
  label: string;
  type: 'identity' | 'resource' | 'device' | 'destination';
  domain?: string;
  critical?: boolean;
  protectiveHold?: boolean;
}

export interface ShiftMapEdge {
  from: string;
  to: string;
  status: BehaviorClassification;
  explanation_status?: string;
  timestamp: string;
  label?: string;
  isChangePoint?: boolean;
  resource?: ResourceTarget;
}

export interface ShiftMapData {
  nodes: ShiftMapNode[];
  edges: ShiftMapEdge[];
  change_point_timestamp: string;
  change_point_description?: string;
}

// ----------------------------------------------------------------------------
// 8. Comprehensive Case Models (Case Summary & Deep Case Detail)
// ----------------------------------------------------------------------------
export interface Case {
  id: string;
  actor_id: string;
  entity_ref?: string; // e.g. "USR-7823"
  actor_name?: string;
  actor_role?: string;
  department?: string;
  created_at: string;
  status: BehaviorClassification | CaseStatus;
  case_status?: CaseStatus;
  raw_deviation: number;
  context_coverage: number; // risk_weighted_coverage (0.0 - 1.0)
  residual_risk: number;
  priority_score: number;
  confidence?: number;
  assessment_confidence?: number;
  data_quality: DataQuality;
  scoring_version: string;
  primary_cause?: string;
  evidence?: string[];
  matched_context_ids?: string[];
  unmatched_behavior?: string[];
  top_unresolved_event?: EventContribution;
  critical_activity_observed?: boolean;
  critical_review_required?: boolean;
  critical_review_triggered?: boolean;
  policy_floor_applied?: boolean;
  policy_floor_reason?: string;
  retroactive_justification_review?: boolean;
  is_indeterminate?: boolean;
  baseline_age_days?: number;
  baseline_fallback_source?: string;
  constituent_signals?: ConstituentSignal[];
  reopen_reason?: string;
  reopen_date?: string;
  previous_explanation?: string;
  protective_hold_active?: boolean;
  protective_hold_triggered_at?: string;
  hard_rule_flag?: boolean;
  residual_unresolved_count?: number;
  resolution_type?: string;
  response_action?: ResponseActionPlan;
}

export interface EntityCaseDetail {
  id?: string;
  entity_ref?: string;
  rawDeviationScore: number;
  contextCoverageScore: number; // percentage (0-100) or risk-weighted score
  residualRiskScore: number;
  priorityScore?: number;
  scoringVersion?: string;
  originalAssessment?: AssessmentDetail;
  currentAssessment?: AssessmentDetail;
  assessmentDetail?: AssessmentDetail;
  assessmentHistory?: AssessmentDetail[];
  revisionsBetweenAssessments?: ContextRevision[];
  eventContributions?: EventContribution[];
  topUnresolvedEventId?: string;
  signalCategories?: SignalCategory[];
  evidenceEpisodes?: EvidenceEpisode[];
  initialDriftPattern: string;
  timelineEvents: EvidenceEvent[];
  contextLedger: ContextLedgerItem[];
  constituentSignals?: ConstituentSignal[];
  contextRevisions?: ContextRevision[];
  counterfactuals: CounterfactualScenario[];
  counterfactualWaterfall?: Counterfactual;
  shiftMap?: ShiftMapData;
  classification?: BehaviorClassification;
  confidence?: number;
  reopenMetadata?: {
    date: string;
    contextReason: string;
    message: string;
  };
  protective_hold_active?: boolean;
  protective_hold_triggered_at?: string;
  hard_rule_flag?: boolean;
  residual_unresolved_count?: number;
  data_quality?: DataQuality;
  critical_activity_observed?: boolean;
  critical_review_required?: boolean;
  critical_review_triggered?: boolean;
  policy_floor_applied?: boolean;
  policy_floor_reason?: string;
  retroactive_justification_review?: boolean;
  is_indeterminate?: boolean;
  baseline_age_days?: number;
  baseline_fallback_source?: string;
  top_unresolved_event?: EventContribution;
  responseAction?: ResponseActionPlan;
  blastRadius?: BlastRadiusData;
}

// ----------------------------------------------------------------------------
// 9. Entity & Overview Types
// ----------------------------------------------------------------------------
export interface EntityLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Entity {
  id: string;
  entity_ref?: string; // e.g. "USR-7823"
  name: string;
  role: string;
  department: 'Core Infrastructure' | 'Data & Analytics' | 'Security Ops' | 'Frontend' | 'Product' | 'Finance & Legal';
  riskScore: number; // 0-100 (Residual risk)
  priorityScore?: number; // 0-100 (Backend priority score)
  riskLevel: RiskLevel;
  caseStatus?: CaseStatus;
  classification?: BehaviorClassification;
  caseId?: string;
  hasActiveCase: boolean;
  isSilentElevated?: boolean;
  summary: string;
  timelineSparkline: { time: string; score: number }[];
  accessVector?: string;
  lastActive: string;
  details?: EntityCaseDetail;
  reopenNotice?: string;
  location: EntityLocation;
  critical_activity_observed?: boolean;
  critical_review_required?: boolean;
  retroactive_justification_review?: boolean;
  is_indeterminate?: boolean;
  top_unresolved_event?: EventContribution;
  confidence?: number;
  response_state?: string;
  assessment_time?: string;
}

export interface NotificationItem {
  id: string;
  caseId: string;
  targetId: string;
  targetName: string;
  riskScore: number;
  message: string;
  timestamp: string;
  read: boolean;
  type?: 'access_request' | 'containment' | 'system';
  accessRequestId?: string;
}

// ----------------------------------------------------------------------------
// 10. Context-Aware Just-in-Time Access (JIT) Engine Types
// ----------------------------------------------------------------------------

export type AccessRequestStatus =
  | 'PAUSED'
  | 'AI_REVIEWED'
  | 'AWAITING_APPROVAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'MORE_CONTEXT_REQUIRED'
  | 'DENIED'
  | 'REVOKED';

export type EnforcementCategory =
  | 'access_request_paused' // The user never had access
  | 'protective_hold'       // An existing risky action was interrupted
  | 'session_revoked';      // An active session was terminated after human approval

export type AIAccessRecommendation =
  | 'APPROVE_SCOPED'
  | 'REQUEST_MORE_CONTEXT'
  | 'DENY_AND_ESCALATE';

export interface StructuredAccessEvidence {
  employeeRoleAndDept: string;
  requestedResourceAndSensitivity: string;
  requestedAction: string;
  requestedDuration: string;
  activeIncidentOrChangeTicket: string;
  managerOrOwnerSponsorship: string;
  deviceAndLocationTrust: string;
  behaviouralDeviation: string;
  contextCoverage: string;
  missingEvidenceSummary: string;
  potentialBlastRadius: string;
}

export interface AIAccessReview {
  recommendation: AIAccessRecommendation;
  recommendedDuration: string; // e.g. "15 minutes"
  recommendedPermissionLevel: string; // e.g. "Scoped Bastion Session (Non-Root)"
  requiredControls: string[];
  humanReadableReason: string;
  missingEvidence: string[];
  confidenceLevel: number; // 0-100 (e.g. 98%)
  confidenceDecimal: number; // 0.0 - 1.0 (e.g. 0.98)
  structuredEvidence: StructuredAccessEvidence;
  policyValidationPassed: boolean;
  mandatoryDisclosure: string;
}

export interface ContextEvidenceItem {
  id: string;
  title: string;
  source: string;
  category: 'incident' | 'schedule' | 'ticket' | 'scope' | 'telemetry';
  status: 'verified' | 'unverified' | 'missing' | 'warning';
  detail: string;
  referenceId?: string;
  timestamp?: string;
}

export interface ScopeBlastRadiusPreview {
  allowedResource: string;
  allowedPermission: string;
  sessionTtl: string;
  stepUpAuthRequired: boolean;
  prohibitedActions: string[];
  unaffectedSystems: {
    name: string;
    category: string;
    status: 'INACCESSIBLE' | 'BLOCKED' | 'UNAFFECTED';
    reason: string;
  }[];
}

export interface AccessAuditLogEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  actorPersona: 'analyst' | 'reviewer' | 'admin' | 'system';
  action: string;
  details: string;
  statusAfter: AccessRequestStatus;
  policyRuleApplied: string;
  immutableHash: string;
  stepUpVerified?: boolean;
}

export interface AccessRequestItem {
  id: string; // e.g. "AR-203"
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  avatarSeed?: string;
  resource: string;
  resourceCategory: string;
  sensitivity: 'Critical' | 'High' | 'Medium' | 'Low';
  requestedAction: string;
  requestedDurationMinutes: number;
  initialStatus: AccessRequestStatus;
  currentStatus: AccessRequestStatus;
  enforcementCategory: EnforcementCategory;
  trigger: string;
  requestedAt: string;
  remainingSeconds: number; // For active session countdown (e.g. 900 for 15:00)
  totalTtlSeconds: number;
  aiReview: AIAccessReview;
  contextEvidence: ContextEvidenceItem[];
  scopePreview: ScopeBlastRadiusPreview;
  decisionNotes?: string;
  decisionBy?: string;
  decisionByRole?: string;
  decisionAt?: string;
  auditTimeline: AccessAuditLogEvent[];
  proposedBy?: string;
  deviationAlert?: {
    triggered: boolean;
    timestamp?: string;
    reason?: string;
    pausedSessionId?: string;
  };
}

