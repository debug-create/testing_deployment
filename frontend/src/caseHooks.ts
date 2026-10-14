// src/caseHooks.ts
// React hooks for FABLE Entities, Cases, Assessments, and Reassessment Workflows

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Entity,
  CaseStatus,
  Case,
  Counterfactual,
  ShiftMapData,
  EntityCaseDetail,
  ContextRevision,
  InvestigatorBrief,
} from './types';
import {
  getEntities,
  getCase,
  getCases,
  getCaseDetail,
  getCounterfactual,
  getShiftMapData,
  getContextRevisions,
  proposeContextRevision as apiProposeRevision,
  reviewContextRevision as apiReviewRevision,
  recommendContainment as apiRecommendContainment,
  getInvestigatorBrief as apiGetInvestigatorBrief,
  executeResponseActionSimulated as apiExecuteResponseAction,
  resetDemoState,
  isDemoMode,
  setDemoMode,
  subscribeToModeChanges,
  subscribeToStateReset,
  getDemoPersona,
  setDemoPersona,
  getDemoIdentityDetails,
  DemoPersona,
} from './api/client';
import {
  DEMO_ENTITIES,
  ARJUN_CASE_DETAIL_BEFORE,
  ARJUN_CASE_DETAIL_AFTER,
  ARJUN_CASE_BEFORE,
  ARJUN_CASE_AFTER,
} from './data/demoDataset';

// ----------------------------------------------------------------------------
// Mode & Persona Hook
// ----------------------------------------------------------------------------
export function useAppMode() {
  const [isDemo, setIsDemo] = useState<boolean>(isDemoMode());
  const [persona, setPersonaState] = useState<DemoPersona>(getDemoPersona());

  useEffect(() => {
    const unsub = subscribeToModeChanges((newMode) => {
      setIsDemo(newMode);
    });
    return unsub;
  }, []);

  const toggleMode = useCallback((demo: boolean) => {
    setDemoMode(demo);
    setIsDemo(demo);
  }, []);

  const setPersona = useCallback((newPersona: DemoPersona) => {
    setDemoPersona(newPersona);
    setPersonaState(newPersona);
  }, []);

  const identity = useMemo(() => getDemoIdentityDetails(), [persona]);

  const resetSimulation = useCallback(() => {
    resetDemoState();
  }, []);

  return {
    isDemoMode: isDemo,
    setDemoMode: toggleMode,
    persona,
    setPersona,
    identity,
    resetSimulation,
  };
}

// ----------------------------------------------------------------------------
// 1. useEntities: Entities list with reactive updates
// ----------------------------------------------------------------------------
export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>(DEMO_ENTITIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntities();
      setEntities(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('FABLE Entities fetch error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
    const unsubMode = subscribeToModeChanges(() => {
      fetchEntities();
    });
    const unsubReset = subscribeToStateReset(() => {
      fetchEntities();
    });
    return () => {
      unsubMode();
      unsubReset();
    };
  }, [fetchEntities]);

  const getEntityById = useCallback(
    (id: string) => {
      const query = id.toLowerCase();
      return entities.find(
        (e) => e.id.toLowerCase() === query || e.caseId?.toLowerCase() === query
      );
    },
    [entities]
  );

  const updateEntityCaseStatus = useCallback(
    (id: string, status: CaseStatus) => {
      setEntities((prev) =>
        prev.map((item) => {
          if (item.id.toLowerCase() === id.toLowerCase() || item.caseId === id) {
            return {
              ...item,
              caseStatus: status,
              riskLevel:
                status === 'Cleared'
                  ? 'resolved'
                  : status === 'Reviewing' || status === 'Reopened'
                  ? 'elevated'
                  : status === 'Containment Recommended'
                  ? 'escalated'
                  : item.riskLevel,
            };
          }
          return item;
        })
      );
    },
    []
  );

  return {
    entities,
    loading,
    error,
    refetch: fetchEntities,
    getEntityById,
    updateEntityCaseStatus,
  };
}

// ----------------------------------------------------------------------------
// 2. useCases: Ranked Investigation Queue
// ----------------------------------------------------------------------------
export function useCases(params?: Record<string, string>) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCases(params);
      setCases(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCases();
    const unsubMode = subscribeToModeChanges(() => {
      fetchCases();
    });
    const unsubReset = subscribeToStateReset(() => {
      fetchCases();
    });
    return () => {
      unsubMode();
      unsubReset();
    };
  }, [fetchCases]);

  return {
    cases,
    loading,
    error,
    refetch: fetchCases,
  };
}

// ----------------------------------------------------------------------------
// 3. useCase: Single Case Summary Hook
// ----------------------------------------------------------------------------
export function useCase(id: string | undefined) {
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!id) {
      setCaseItem(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCase(id);
      setCaseItem(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
    const unsubMode = subscribeToModeChanges(() => {
      fetchCase();
    });
    const unsubReset = subscribeToStateReset(() => {
      fetchCase();
    });
    return () => {
      unsubMode();
      unsubReset();
    };
  }, [fetchCase]);

  return {
    caseItem,
    loading,
    error,
    refetch: fetchCase,
  };
}

// ----------------------------------------------------------------------------
// 4. useCaseDetail: Deep Forensic Dossier & Reassessment Hook
// ----------------------------------------------------------------------------
export function useCaseDetail(caseId: string | undefined) {
  const [detail, setDetail] = useState<EntityCaseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!caseId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseDetail(caseId);
      setDetail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchDetail();
    const unsubMode = subscribeToModeChanges(() => {
      fetchDetail();
    });
    const unsubReset = subscribeToStateReset(() => {
      fetchDetail();
    });
    return () => {
      unsubMode();
      unsubReset();
    };
  }, [fetchDetail]);

  return {
    detail,
    loading,
    error,
    refetch: fetchDetail,
  };
}

// ----------------------------------------------------------------------------
// 5. useContextRevisions: Proposal, Review, & Separation of Duties Hook
// ----------------------------------------------------------------------------
export function useContextRevisions(caseId: string | undefined) {
  const [revisions, setRevisions] = useState<ContextRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchRevisions = useCallback(async () => {
    if (!caseId) {
      setRevisions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getContextRevisions(caseId);
      setRevisions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchRevisions();
    const unsubMode = subscribeToModeChanges(() => {
      fetchRevisions();
    });
    const unsubReset = subscribeToStateReset(() => {
      fetchRevisions();
    });
    return () => {
      unsubMode();
      unsubReset();
    };
  }, [fetchRevisions]);

  const proposeRevision = useCallback(
    async (payload: {
      reason: string;
      effective_from: string;
      effective_until: string;
      allowed_resources: string[];
      allowed_actions: string[];
      approved_destinations?: string[];
    }) => {
      if (!caseId) throw new Error('No active case ID');
      setActionLoading(true);
      try {
        const created = await apiProposeRevision(caseId, payload);
        await fetchRevisions();
        return created;
      } finally {
        setActionLoading(false);
      }
    },
    [caseId, fetchRevisions]
  );

  const reviewRevision = useCallback(
    async (
      revisionId: string,
      actionOrPayload: 'approve' | 'reject' | { decision: 'approved' | 'rejected'; review_notes?: string },
      notes?: string
    ) => {
      if (!caseId) throw new Error('No active case ID');
      setActionLoading(true);
      try {
        const result = await apiReviewRevision(caseId, revisionId, actionOrPayload, notes);
        await fetchRevisions();
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    [caseId, fetchRevisions]
  );

  return {
    revisions,
    loading,
    error,
    actionLoading,
    refetch: fetchRevisions,
    proposeRevision,
    reviewRevision,
  };
}

// ----------------------------------------------------------------------------
// 6. useInvestigatorBrief: Evidence-Anchored Prose Synthesis Hook
// ----------------------------------------------------------------------------
export function useInvestigatorBrief(caseId: string | undefined, actorName?: string) {
  const [brief, setBrief] = useState<InvestigatorBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateBrief = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetInvestigatorBrief(caseId, actorName);
      setBrief(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [caseId, actorName]);

  return {
    brief,
    loading,
    error,
    generateBrief,
  };
}

// ----------------------------------------------------------------------------
// 7. useCounterfactual & useShiftMap
// ----------------------------------------------------------------------------
export function useCounterfactual(caseId: string | undefined) {
  const [counterfactual, setCounterfactual] = useState<Counterfactual | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);

  const fetchCf = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const data = await getCounterfactual(caseId);
      setCounterfactual(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCf();
  }, [fetchCf]);

  return { counterfactual, loading, error, refetch: fetchCf };
}

export function useShiftMap(caseId: string | undefined) {
  const [shiftMap, setShiftMap] = useState<ShiftMapData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);

  const fetchShiftMap = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const data = await getShiftMapData(caseId);
      setShiftMap(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchShiftMap();
  }, [fetchShiftMap]);

  return { shiftMap, loading, error, refetch: fetchShiftMap };
}
