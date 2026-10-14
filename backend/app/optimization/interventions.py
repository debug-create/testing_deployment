from typing import List, Dict, Any, Optional
from app.schemas.simulations import InterventionCandidate, InterventionOptimizeResponse
from app.schemas.paths import AttackPathResponse

def optimize_interventions(
    scenario_id: str,
    budget: float,
    candidates: List[InterventionCandidate],
    current_paths: List[AttackPathResponse]
) -> InterventionOptimizeResponse:
    """
    Cost-Aware Intervention Optimizer.
    Finds the optimal set of security controls that sever the highest cumulative risk
    from attack paths while staying strictly within the assigned cost budget.
    """
    if not candidates or not current_paths:
        return InterventionOptimizeResponse(
            scenario_id=scenario_id,
            allocated_budget=budget,
            total_cost=0.0,
            selected_interventions=[],
            severed_path_count=0,
            projected_risk_reduction=0.0,
            explanation="No candidate interventions or active attack paths available."
        )

    # Try OR-Tools CP-SAT if available, else deterministic knapsack/set-cover
    try:
        from ortools.sat.python import cp_model
        return _optimize_with_cpsat(scenario_id, budget, candidates, current_paths)
    except Exception:
        return _optimize_with_knapsack_heuristic(scenario_id, budget, candidates, current_paths)

def _optimize_with_cpsat(
    scenario_id: str,
    budget: float,
    candidates: List[InterventionCandidate],
    current_paths: List[AttackPathResponse]
) -> InterventionOptimizeResponse:
    from ortools.sat.python import cp_model

    model = cp_model.CpModel()
    n_c = len(candidates)
    n_p = len(current_paths)

    # Boolean var for each intervention selected: x[i] in {0, 1}
    x = [model.NewBoolVar(f"x_{i}") for i in range(n_c)]
    # Boolean var for each path severed: y[j] in {0, 1}
    y = [model.NewBoolVar(f"y_{j}") for j in range(n_p)]

    # Budget constraint: sum(cost[i] * x[i]) <= budget
    # Scale costs to integer cents for CP-SAT
    scale = 100
    int_costs = [int(round(c.cost * scale)) for c in candidates]
    int_budget = int(round(budget * scale))
    model.Add(sum(int_costs[i] * x[i] for i in range(n_c)) <= int_budget)

    # Linking constraints: path j is severed if at least one intervention breaks an edge on path j
    # A path is broken if any of its hops' relationship_ids are severed
    for j, path in enumerate(current_paths):
        path_rel_ids = {hop.relationship_id for hop in path.hops}
        covering_interventions = [
            i for i, c in enumerate(candidates)
            if any(rel in path_rel_ids for rel in c.affected_relationship_ids)
        ]
        if covering_interventions:
            # y[j] <= sum(x[i] for i in covering_interventions)
            model.Add(y[j] <= sum(x[i] for i in covering_interventions))
        else:
            model.Add(y[j] == 0)

    # Objective: Maximize sum(risk_score[j] * y[j])
    int_risks = [int(round(p.risk_score * scale)) for p in current_paths]
    model.Maximize(sum(int_risks[j] * y[j] for j in range(n_p)))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.Solve(model)

    selected = []
    total_cost = 0.0
    severed_count = 0
    reduced_risk = 0.0

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for i, c in enumerate(candidates):
            if solver.Value(x[i]) == 1:
                selected.append(c)
                total_cost += c.cost

        for j, p in enumerate(current_paths):
            if solver.Value(y[j]) == 1:
                severed_count += 1
                reduced_risk += p.risk_score

    total_risk = sum(p.risk_score for p in current_paths) or 1.0
    risk_reduction_pct = round((reduced_risk / total_risk) * 100.0, 2)

    return InterventionOptimizeResponse(
        scenario_id=scenario_id,
        allocated_budget=budget,
        total_cost=round(total_cost, 2),
        selected_interventions=selected,
        severed_path_count=severed_count,
        projected_risk_reduction=risk_reduction_pct,
        explanation=f"CP-SAT selected {len(selected)} controls severing {severed_count}/{n_p} paths within budget {budget}."
    )

def _optimize_with_knapsack_heuristic(
    scenario_id: str,
    budget: float,
    candidates: List[InterventionCandidate],
    current_paths: List[AttackPathResponse]
) -> InterventionOptimizeResponse:
    # Greedy set-cover / knapsack by cost-efficiency (severed risk / cost)
    remaining_budget = budget
    selected: List[InterventionCandidate] = []
    severed_path_ids = set()
    total_risk = sum(p.risk_score for p in current_paths) or 1.0

    # Sort candidates by cost-benefit
    scored_candidates = []
    for c in candidates:
        if c.cost > budget:
            continue
        breaks_risk = 0.0
        for p in current_paths:
            path_rel_ids = {h.relationship_id for h in p.hops}
            if any(r in path_rel_ids for r in c.affected_relationship_ids):
                breaks_risk += p.risk_score
        efficiency = breaks_risk / max(0.1, c.cost)
        scored_candidates.append((efficiency, c))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)

    for _, c in scored_candidates:
        if c.cost <= remaining_budget:
            selected.append(c)
            remaining_budget -= c.cost
            for p in current_paths:
                path_rel_ids = {h.relationship_id for h in p.hops}
                if any(r in path_rel_ids for r in c.affected_relationship_ids):
                    severed_path_ids.add(p.path_id)

    reduced_risk = sum(p.risk_score for p in current_paths if p.path_id in severed_path_ids)
    risk_reduction_pct = round((reduced_risk / total_risk) * 100.0, 2)

    return InterventionOptimizeResponse(
        scenario_id=scenario_id,
        allocated_budget=budget,
        total_cost=round(budget - remaining_budget, 2),
        selected_interventions=selected,
        severed_path_count=len(severed_path_ids),
        projected_risk_reduction=risk_reduction_pct,
        explanation=f"Optimized selection of {len(selected)} controls severing {len(severed_path_ids)} attack paths."
    )
