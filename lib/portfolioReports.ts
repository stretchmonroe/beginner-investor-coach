import { supabase } from "./supabase";
import type { Holding, PortfolioInsight } from "@/types/portfolio";
import type { ExposureItem } from "@/lib/portfolioMetadata";

// ─── Stored JSON shapes ───────────────────────────────────────────────────────

export interface ReportAssetMixItem {
  assetType: string;
  value: number;
  weight: number;
}

export interface ConcentrationJson {
  concentrationInsights: PortfolioInsight[];
  assetMix: ReportAssetMixItem[];
  // Snapshot metadata — optional, populated from schema v2+ saves
  notes?: string;
  unknownHoldingCount?: number;
  mappedHoldingCount?: number;
  hasMixedCurrencies?: boolean;
}

export interface ExposureJson {
  sectorExposure: ExposureItem[];
  geographyExposure: ExposureItem[];
  currencyExposure: ExposureItem[];
}

export interface OverlapJson {
  overlapInsights: PortfolioInsight[];
  themeInsights: PortfolioInsight[];
}

// ─── Row type ─────────────────────────────────────────────────────────────────

export interface PortfolioReportRow {
  id: string;
  anonymous_session_id: string;
  user_id?: string | null;
  report_name: string | null;
  total_value: number | null;
  currency: string | null;
  holdings_json: Holding[] | null;
  concentration_json: ConcentrationJson | null;
  exposure_json: ExposureJson | null;
  overlap_insights_json: OverlapJson | null;
  schema_version: number;
  created_at: string;
}

export type PortfolioReportInsert = Omit<
  PortfolioReportRow,
  "id" | "created_at" | "schema_version"
>;

// ─── Report view data (live or reconstructed from a saved row) ────────────────

export interface PortfolioReportData {
  reportName?: string | null;
  reportDate: string;
  totalValue: number;
  holdings: Holding[];
  assetMix: ReportAssetMixItem[];
  concentrationInsights: PortfolioInsight[];
  sectorExposure: ExposureItem[];
  geographyExposure: ExposureItem[];
  currencyExposure: ExposureItem[];
  overlapInsights: PortfolioInsight[];
  themeInsights: PortfolioInsight[];
  // Snapshot metadata
  notes?: string;
  unknownHoldingCount?: number;
  mappedHoldingCount?: number;
  hasMixedCurrencies?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function savePortfolioReport(
  report: PortfolioReportInsert,
  userId?: string
): Promise<void> {
  const row = userId ? { ...report, user_id: userId } : report;
  const { error } = await supabase.from("anonymous_portfolio_reports").insert(row);
  if (error) throw new Error(error.message);
}

export async function getPortfolioReports(
  sessionId: string,
  userId?: string
): Promise<PortfolioReportRow[]> {
  const query = supabase
    .from("anonymous_portfolio_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data, error } = userId
    ? await query.eq("user_id", userId)
    : await query.eq("anonymous_session_id", sessionId);

  if (error) throw new Error(error.message);
  return (data ?? []) as PortfolioReportRow[];
}

export async function deletePortfolioReport(id: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_portfolio_reports")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function rowToReportData(row: PortfolioReportRow): PortfolioReportData {
  return {
    reportName: row.report_name,
    reportDate: row.created_at,
    totalValue: row.total_value ?? 0,
    holdings: row.holdings_json ?? [],
    assetMix: row.concentration_json?.assetMix ?? [],
    concentrationInsights: row.concentration_json?.concentrationInsights ?? [],
    sectorExposure: row.exposure_json?.sectorExposure ?? [],
    geographyExposure: row.exposure_json?.geographyExposure ?? [],
    currencyExposure: row.exposure_json?.currencyExposure ?? [],
    overlapInsights: row.overlap_insights_json?.overlapInsights ?? [],
    themeInsights: row.overlap_insights_json?.themeInsights ?? [],
    notes: row.concentration_json?.notes,
    unknownHoldingCount: row.concentration_json?.unknownHoldingCount,
    mappedHoldingCount: row.concentration_json?.mappedHoldingCount,
    hasMixedCurrencies: row.concentration_json?.hasMixedCurrencies,
  };
}

export async function deleteAllPortfolioReports(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_portfolio_reports")
    .delete()
    .eq("anonymous_session_id", sessionId);
  if (error) throw new Error(error.message);
}
