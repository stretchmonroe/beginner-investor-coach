import { supabase } from "./supabase";

export interface ContributionGuidanceSnapshot {
  monthly_take_home_pay: number;
  monthly_bills: number;
  monthly_debt_payments: number;
  monthly_emergency_savings_contribution: number;
  emergency_fund_status: string;
  monthly_surplus: number;
  bills_percentage: number;
  debt_percentage: number;
  estimated_contribution_min: number;
  estimated_contribution_max: number;
  estimated_contribution_midpoint: number;
  caution_notes: string[];
}

export interface AllocationSnapshot {
  ticker: string;
  etf_name: string;
  allocation_percent: number;
  starting_amount_allocation: number;
  monthly_contribution_allocation: number;
  risk_level: string;
  portfolio_role: string;
}

export interface LearningPlan {
  id: string;
  anonymous_session_id: string;
  investor_profile: string | null;
  contribution_guidance_json: ContributionGuidanceSnapshot | null;
  portfolio_inputs_json: {
    starting_amount: number;
    monthly_contribution: number;
    timeline: string;
    investor_profile: string;
  };
  allocation_json: AllocationSnapshot[];
  projection_assumptions_json: {
    projection_years: number;
    annual_return_assumption: number;
    withdrawal_rate: number;
  };
  projection_results_json: {
    total_contributed: number;
    estimated_future_value: number;
    estimated_investment_growth: number;
    estimated_annual_income: number;
    estimated_monthly_income: number;
  };
  created_at: string;
}

export type LearningPlanInsert = Omit<LearningPlan, "id" | "created_at">;

export async function saveLearningPlan(plan: LearningPlanInsert): Promise<void> {
  const { error } = await supabase.from("anonymous_learning_plans").insert(plan);
  if (error) throw new Error(error.message);
}

export async function getLearningPlans(sessionId: string): Promise<LearningPlan[]> {
  const { data, error } = await supabase
    .from("anonymous_learning_plans")
    .select("*")
    .eq("anonymous_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as LearningPlan[];
}

export async function deleteLearningPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_learning_plans")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
