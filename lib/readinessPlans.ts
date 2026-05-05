import { supabase } from "./supabase";
import type {
  MoneySnapshot,
  ContributionGuidanceResult,
  GoalPlan,
  SampleAllocationItem,
  ProjectionResult,
} from "@/types/readinessPlan";

// projection_assumptions_json stores extra display fields beyond the core type
export interface StoredProjectionAssumptions {
  projectionYears: number;
  annualReturnAssumption: number;
  withdrawalRate: number;
  startingAmount: number;
  monthlyContribution: number;
  timeline: string;
}

export interface ReadinessPlanRow {
  id: string;
  anonymous_session_id: string;
  investor_profile: string | null;
  money_snapshot_json: MoneySnapshot | null;
  contribution_guidance_json: ContributionGuidanceResult | null;
  goal_plan_json: GoalPlan | null;
  sample_allocation_json: SampleAllocationItem[] | null;
  projection_assumptions_json: StoredProjectionAssumptions | null;
  projection_result_json: ProjectionResult | null;
  schema_version: number;
  created_at: string;
}

export type ReadinessPlanInsert = Omit<ReadinessPlanRow, "id" | "created_at" | "schema_version">;

export async function saveReadinessPlan(plan: ReadinessPlanInsert): Promise<void> {
  const { error } = await supabase.from("anonymous_readiness_plans").insert(plan);
  if (error) throw new Error(error.message);
}

export async function getReadinessPlans(sessionId: string): Promise<ReadinessPlanRow[]> {
  const { data, error } = await supabase
    .from("anonymous_readiness_plans")
    .select("*")
    .eq("anonymous_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReadinessPlanRow[];
}

export async function deleteReadinessPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_readiness_plans")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
