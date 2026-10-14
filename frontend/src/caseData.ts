// src/caseData.ts
// Re-exports authentic scenario models and details from demoDataset.ts
// Eliminates duplicate stale formulas and keeps one source of truth.

import {
  DEVRAJ_CASE_DETAIL,
  ARJUN_CASE_DETAIL_BEFORE,
  PRIYA_CASE_DETAIL,
  NEHA_CASE_DETAIL,
  DEMO_ENTITIES,
} from './data/demoDataset';
import { EntityCaseDetail } from './types';

export {
  SCORING_VERSION,
  DEVRAJ_CASE_DETAIL,
  DEVRAJ_CASE,
  DEVRAJ_EVENT_CONTRIBUTIONS,
  DEVRAJ_SIGNAL_CATEGORIES,
  DEVRAJ_EPISODES,
  DEVRAJ_CONTEXT,
  ARJUN_CASE_DETAIL_BEFORE,
  ARJUN_CASE_DETAIL_AFTER,
  ARJUN_CASE_BEFORE,
  ARJUN_CASE_AFTER,
  ARJUN_ORIGINAL_ASSESSMENT,
  ARJUN_CURRENT_ASSESSMENT,
  ARJUN_EVENTS_BEFORE_CONTRIBUTIONS,
  ARJUN_EVENTS_AFTER_CONTRIBUTIONS,
  ARJUN_SIGNAL_CATEGORIES,
  ARJUN_EPISODES,
  ARJUN_CONTEXT_BEFORE,
  ARJUN_CONTEXT_AFTER,
  PRIYA_CASE_DETAIL,
  PRIYA_CASE,
  PRIYA_EVENT_CONTRIBUTIONS,
  PRIYA_SIGNAL_CATEGORIES,
  PRIYA_EPISODES,
  PRIYA_CONTEXT,
  NEHA_CASE_DETAIL,
  NEHA_CASE,
  NEHA_EVENT_CONTRIBUTIONS,
  NEHA_SIGNAL_CATEGORIES,
  NEHA_EPISODES,
  NEHA_CONTEXT,
  MARCUS_CASE_NORMAL,
  MARCUS_CASE_REOPENED,
  DEMO_ENTITIES,
  DEMO_CASES,
  DEMO_COUNTERFACTUALS,
  DEMO_SHIFTMAPS,
} from './data/demoDataset';

export const DEMO_CASE_DETAILS: Record<string, EntityCaseDetail> = {
  '101': PRIYA_CASE_DETAIL,
  'priya': PRIYA_CASE_DETAIL,
  '104': DEVRAJ_CASE_DETAIL,
  'devraj': DEVRAJ_CASE_DETAIL,
  '107': ARJUN_CASE_DETAIL_BEFORE,
  'arjun': ARJUN_CASE_DETAIL_BEFORE,
  '112': NEHA_CASE_DETAIL,
  'neha': NEHA_CASE_DETAIL,
};

export function getOrCreateCaseDetail(entityIdOrCaseId: string): EntityCaseDetail {
  if (DEMO_CASE_DETAILS[entityIdOrCaseId]) {
    return DEMO_CASE_DETAILS[entityIdOrCaseId];
  }
  const entity = DEMO_ENTITIES.find(
    (e) => e.id === entityIdOrCaseId || e.caseId === entityIdOrCaseId
  );
  if (entity && entity.details) {
    return entity.details;
  }
  return DEVRAJ_CASE_DETAIL;
}
