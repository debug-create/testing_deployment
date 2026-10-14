// src/api/contractValidator.ts
// Runtime OpenAPI Scoring Contract (v2.4.1) Validator for FABLE
// Ensures all fixtures and API responses conform strictly to the contract before rendering.

import { Case, AssessmentDetail, EventContribution, ContextRevision, ResponseActionPlan } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCaseContract(c: unknown): ValidationResult {
  const errors: string[] = [];
  if (!c || typeof c !== 'object') {
    return { valid: false, errors: ['Case payload is not an object'] };
  }
  const item = c as Partial<Case>;

  if (!item.id) errors.push('Missing case.id');
  if (!item.actor_id) errors.push('Missing case.actor_id');
  if (typeof item.raw_deviation !== 'number' || isNaN(item.raw_deviation)) {
    errors.push(`Invalid raw_deviation: ${item.raw_deviation}`);
  }
  if (typeof item.context_coverage !== 'number' || isNaN(item.context_coverage)) {
    errors.push(`Invalid context_coverage: ${item.context_coverage}`);
  }
  if (typeof item.residual_risk !== 'number' || isNaN(item.residual_risk)) {
    errors.push(`Invalid residual_risk: ${item.residual_risk}`);
  }
  if (typeof item.priority_score !== 'number' || isNaN(item.priority_score)) {
    errors.push(`Invalid priority_score: ${item.priority_score}`);
  }
  if (!item.scoring_version) {
    errors.push('Missing scoring_version');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAssessmentContract(a: unknown): ValidationResult {
  const errors: string[] = [];
  if (!a || typeof a !== 'object') {
    return { valid: false, errors: ['Assessment payload is not an object'] };
  }
  const item = a as Partial<AssessmentDetail>;

  if (!item.id && !item.assessment_id) errors.push('Missing assessment.id');
  if (!item.case_id) errors.push('Missing assessment.case_id');
  if (!item.assessed_at) errors.push('Missing assessment.assessed_at');
  if (typeof item.raw_deviation !== 'number' || isNaN(item.raw_deviation)) {
    errors.push(`Invalid raw_deviation: ${item.raw_deviation}`);
  }
  if (typeof item.residual_risk !== 'number' || isNaN(item.residual_risk)) {
    errors.push(`Invalid residual_risk: ${item.residual_risk}`);
  }
  if (typeof item.priority_score !== 'number' || isNaN(item.priority_score)) {
    errors.push(`Invalid priority_score: ${item.priority_score}`);
  }
  if (!item.data_quality) {
    errors.push('Missing data_quality');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEventContributionContract(e: unknown): ValidationResult {
  const errors: string[] = [];
  if (!e || typeof e !== 'object') {
    return { valid: false, errors: ['EventContribution payload is not an object'] };
  }
  const item = e as Partial<EventContribution>;

  if (!item.id && !item.event_id) errors.push('Missing event contribution id');
  if (!item.timestamp) errors.push('Missing event contribution timestamp');
  if (!item.action) errors.push('Missing event contribution action');
  if (typeof item.event_raw_risk !== 'number' || isNaN(item.event_raw_risk)) {
    errors.push(`Invalid event_raw_risk: ${item.event_raw_risk}`);
  }
  if (!item.context_state) {
    errors.push('Missing context_state');
  }
  if (typeof item.context_credit !== 'number' || isNaN(item.context_credit)) {
    errors.push(`Invalid context_credit: ${item.context_credit}`);
  }
  if (typeof item.final_residual_contribution !== 'number' || isNaN(item.final_residual_contribution)) {
    errors.push(`Invalid final_residual_contribution: ${item.final_residual_contribution}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAllDemoFixtures(cases: Case[], assessments: AssessmentDetail[], events: EventContribution[]): ValidationResult {
  const allErrors: string[] = [];

  cases.forEach((c) => {
    const res = validateCaseContract(c);
    if (!res.valid) {
      allErrors.push(`Case #${c.id || 'unknown'}: ${res.errors.join(', ')}`);
    }
  });

  assessments.forEach((a) => {
    const res = validateAssessmentContract(a);
    if (!res.valid) {
      allErrors.push(`Assessment #${a.id || 'unknown'}: ${res.errors.join(', ')}`);
    }
  });

  events.forEach((e) => {
    const res = validateEventContributionContract(e);
    if (!res.valid) {
      allErrors.push(`Event #${e.id || 'unknown'}: ${res.errors.join(', ')}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
