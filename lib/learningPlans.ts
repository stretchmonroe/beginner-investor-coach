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
  // money buckets
  current_cash_savings: number;
  emergency_fund_target: number;
  short_term_savings_to_protect: number;
  starting_investment_amount: number;
  monthly_short_term_savings_contribution: number;
  monthly_lifestyle_play_buffer: number;
  protected_savings_target: number;
  cash_available_above_protected_savings: number;
  starting_investment_check_message: string;
}
