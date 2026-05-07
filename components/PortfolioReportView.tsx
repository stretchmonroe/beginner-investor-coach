"use client";

import { useRef, useState } from "react";
import type { PortfolioReportData } from "@/lib/portfolioReports";
import type { PortfolioInsight } from "@/types/portfolio";
import type { ExposureItem } from "@/lib/portfolioMetadata";
import { formatDate } from "@/lib/formatters";
import PageLayout from "@/components/ui/PageLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Disclaimer from "@/components/ui/Disclaimer";

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return "$" + value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number): string {
  return value.toFixed(1) + "%";
}

// ─── PDF filename ─────────────────────────────────────────────────────────────

function generateFileName(data: PortfolioReportData): string {
  const date = new Date(data.reportDate).toISOString().slice(0, 10);
  if (data.reportName) {
    const slug = data.reportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return `${slug}-portfolio-xray.pdf`;
  }
  return `portfolio-xray-report-${date}.pdf`;
}

// ─── Coach question ───────────────────────────────────────────────────────────

function buildCoachQuestion(data: PortfolioReportData): string {
  const parts = [
    "Explain my Portfolio X-Ray Report in plain English.",
    `Total portfolio value: ${fmt(data.totalValue)}.`,
    data.holdings.length > 0
      ? `Holdings: ${data.holdings.map((h) => `${h.ticker || h.name} (${fmt(h.marketValue)})`).join(", ")}.`
      : "",
    data.concentrationInsights.length > 0
      ? `Concentration notes: ${data.concentrationInsights.map((i) => i.title).join("; ")}.`
      : "",
    data.overlapInsights.length > 0
      ? `Overlap notes: ${data.overlapInsights.map((i) => i.title).join("; ")}.`
      : "",
    "Summarize what I own, concentration, sector and geography exposure, overlap notes, and what a beginner investor may want to understand.",
  ];
  return parts.filter(Boolean).join(" ");
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, "danger" | "caution" | "info"> = {
  warning: "danger",
  caution: "caution",
  info: "info",
};
const SEVERITY_LABEL: Record<string, string> = {
  warning: "Worth noting",
  caution: "Worth noting",
  info: "For context",
};

function InsightCard({ insight }: { insight: PortfolioInsight }) {
  return (
    <Card className="break-inside-avoid">
      <div className="mb-2">
        <Badge variant={SEVERITY_BADGE[insight.severity]}>{SEVERITY_LABEL[insight.severity]}</Badge>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{insight.title}</p>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{insight.description}</p>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Evidence</p>
        <div className="space-y-1.5">
          {insight.evidence.map((ev, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-slate-500 shrink-0">{ev.label}:</span>
              <span className="text-slate-600">{ev.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ExposureRows({ items }: { items: ExposureItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-slate-700 w-36 shrink-0">{item.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-400"
              style={{ width: `${Math.min(item.weight, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-600 w-12 text-right shrink-0">
            {pct(item.weight)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PdfState = "idle" | "loading" | "error";

interface Props {
  data: PortfolioReportData;
  onBack: () => void;
  onAskCoach?: (question: string) => void;
}

export default function PortfolioReportView({ data, onBack, onAskCoach }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfState, setPdfState] = useState<PdfState>("idle");

  const sortedHoldings = [...data.holdings].sort((a, b) => b.marketValue - a.marketValue);
  const hasMixedCurrencies =
    data.holdings.some((h) => h.currency === "USD") && data.holdings.some((h) => h.currency === "CAD");
  const top3Weight =
    sortedHoldings.length >= 3
      ? (sortedHoldings.slice(0, 3).reduce((s, h) => s + h.marketValue, 0) / data.totalValue) * 100
      : null;
  const mainAssetType = data.assetMix.length > 0
    ? data.assetMix.reduce((a, b) => (a.weight > b.weight ? a : b)).assetType
    : null;
  const mainGeography = data.geographyExposure.length > 0 ? data.geographyExposure[0] : null;
  const mainSector = data.sectorExposure.length > 0 ? data.sectorExposure[0] : null;
  const allOverlap = [...data.overlapInsights, ...data.themeInsights];

  async function handleDownloadPdf() {
    if (!reportRef.current) return;
    setPdfState("loading");
    try {
      const [{ default: JsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height / canvas.width) * imgW;
      const pageCount = Math.ceil(imgH / pageH);

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -(page * pageH), imgW, imgH);
      }

      pdf.save(generateFileName(data));
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  if (data.holdings.length === 0) {
    return (
      <PageLayout maxWidth="lg">
        <div className="print:hidden flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
        </div>
        <Card variant="muted">
          <p className="text-sm text-slate-500">Add holdings before creating a Portfolio X-Ray Report.</p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      {/* Navigation and export controls — excluded from PDF capture, hidden from print */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleDownloadPdf}
            disabled={pdfState === "loading"}
          >
            {pdfState === "loading" ? "Generating PDF…" : "Download PDF"}
          </Button>
          <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </div>

      {/* PDF error state */}
      {pdfState === "error" && (
        <div className="print:hidden mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          Could not generate the PDF right now. You can still use Print / Save as PDF.
        </div>
      )}

      {/* ── Report content (captured by html2canvas for PDF) ── */}
      <div ref={reportRef} className="bg-white">

        {/* A. Report header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Portfolio X-Ray Report</h1>
              {data.reportName && (
                <p className="text-sm text-slate-500 mt-0.5">{data.reportName}</p>
              )}
            </div>
            <p className="text-sm text-slate-400 shrink-0">{formatDate(data.reportDate)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card variant="muted" padding="sm">
              <p className="text-xs text-slate-400 mb-0.5">Total value</p>
              <p className="text-lg font-bold text-slate-800">{fmt(data.totalValue)}</p>
            </Card>
            <Card variant="muted" padding="sm">
              <p className="text-xs text-slate-400 mb-0.5">Holdings</p>
              <p className="text-lg font-bold text-slate-800">{data.holdings.length}</p>
            </Card>
            {hasMixedCurrencies && (
              <Card variant="muted" padding="sm" className="col-span-2">
                <p className="text-xs text-amber-600">
                  Mixed currencies (CAD and USD). Values appear as entered — no conversion applied.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* B. Executive summary */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            {sortedHoldings.length > 0 && (
              <Card variant="muted" padding="sm" className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Largest holding</p>
                <p className="text-sm font-bold text-slate-800">
                  {sortedHoldings[0].ticker || sortedHoldings[0].name}{" "}
                  <span className="text-slate-500 font-semibold">
                    — {pct((sortedHoldings[0].marketValue / data.totalValue) * 100)} of portfolio
                  </span>
                </p>
              </Card>
            )}
            {top3Weight !== null && (
              <Card variant="muted" padding="sm" className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Top 3 holdings combined</p>
                <p className="text-sm font-bold text-slate-800">{pct(top3Weight)} of portfolio</p>
              </Card>
            )}
            {mainAssetType && (
              <Card variant="muted" padding="sm">
                <p className="text-xs text-slate-400 mb-0.5">Main asset type</p>
                <p className="text-sm font-bold text-slate-800">{mainAssetType}</p>
              </Card>
            )}
            {mainGeography && (
              <Card variant="muted" padding="sm">
                <p className="text-xs text-slate-400 mb-0.5">Main geography</p>
                <p className="text-sm font-bold text-slate-800">
                  {mainGeography.label}{" "}
                  <span className="text-slate-500 font-semibold">({pct(mainGeography.weight)})</span>
                </p>
              </Card>
            )}
            {mainSector && (
              <Card variant="muted" padding="sm" className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Main sector</p>
                <p className="text-sm font-bold text-slate-800">
                  {mainSector.label}{" "}
                  <span className="text-slate-500 font-semibold">({pct(mainSector.weight)})</span>
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* C. Holdings table */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Holdings</h2>
          <Card padding="sm">
            <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 text-xs font-semibold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-3">
              <span>Holding</span>
              <span>Type</span>
              <span>Account</span>
              <span className="text-right">Value</span>
              <span className="text-right">Weight</span>
            </div>
            <div className="space-y-3">
              {sortedHoldings.map((h) => {
                const weight = data.totalValue > 0 ? (h.marketValue / data.totalValue) * 100 : 0;
                return (
                  <div key={h.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-1 items-start sm:items-center border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <div>
                      {h.ticker && <p className="text-sm font-semibold text-slate-800">{h.ticker}</p>}
                      {h.name && <p className="text-xs text-slate-500">{h.name}</p>}
                    </div>
                    <div className="sm:justify-self-center">
                      <Badge variant="default">{h.assetType}</Badge>
                    </div>
                    <div className="sm:justify-self-center">
                      <Badge variant="muted">{h.accountType}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{fmt(h.marketValue)}</p>
                      <p className="text-xs text-slate-400">{h.currency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-500">{pct(weight)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* D. Concentration analysis */}
        {data.concentrationInsights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Concentration</h2>
            <p className="text-sm text-slate-500 mb-3">Based on holding weights. Educational only.</p>
            <div className="space-y-4">
              {data.concentrationInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* E. Exposure breakdown */}
        {(data.assetMix.length > 0 || data.sectorExposure.length > 0 || data.geographyExposure.length > 0 || data.currencyExposure.length > 0) && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Exposure</h2>
            <p className="text-sm text-slate-500 mb-4">
              Simplified educational estimates based on static metadata.
            </p>

            {data.assetMix.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Asset type</p>
                <Card padding="sm">
                  <ExposureRows
                    items={data.assetMix.map((m) => ({ label: m.assetType, value: m.value, weight: m.weight }))}
                  />
                </Card>
              </div>
            )}

            {data.sectorExposure.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Sector</p>
                <Card padding="sm"><ExposureRows items={data.sectorExposure} /></Card>
              </div>
            )}

            {data.geographyExposure.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Geography</p>
                <Card padding="sm"><ExposureRows items={data.geographyExposure} /></Card>
              </div>
            )}

            {data.currencyExposure.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Currency</p>
                <Card padding="sm">
                  <ExposureRows items={data.currencyExposure} />
                  <p className="text-xs text-slate-400 mt-3">
                    Currency exposure is simplified. A Canadian-listed ETF may still hold foreign assets.
                  </p>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* F. Overlap notes */}
        {allOverlap.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Overlap notes</h2>
            <p className="text-sm text-slate-500 mb-3">
              Potential holding interactions based on simplified static mapping.
            </p>
            <div className="space-y-4">
              {allOverlap.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* G. Scenarios */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Scenarios</h2>
          <Card variant="muted" padding="sm">
            <p className="text-sm text-slate-400">
              No scenario results are saved with this report. Use the Contribution Scenarios section
              in Portfolio X-Ray to explore what-if projections.
            </p>
          </Card>
        </div>

        {/* I. Methodology */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Methodology</h2>
          <Card padding="sm">
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">Holdings source:</span>{" "}
                Manually entered or imported from a CSV file.
              </p>
              <p>
                <span className="font-semibold text-slate-700">Exposure estimates:</span>{" "}
                Based on simplified static educational metadata for known tickers. Some holdings may also use
                FMP company profile data enriched at the time of analysis.
              </p>
              <p>
                <span className="font-semibold text-slate-700">Limitations:</span>{" "}
                Exposure mappings are educational estimates. They may not reflect current fund holdings,
                fees, currency conversion, or market weights. Holdings without metadata appear in total
                value but may be excluded from sector, geography, and currency breakdowns.
              </p>
            </div>
          </Card>
        </div>

        {/* J. Disclaimer */}
        <Disclaimer extended="Educational only. Not financial advice. This report is based on the holdings entered and simplified exposure mappings. It may not reflect current fund holdings, fees, market prices, currency conversion, taxes, or your full financial situation." />

      </div>{/* end reportRef */}

      {/* H. AI Portfolio Coach — outside PDF capture, hidden from print */}
      {onAskCoach && (
        <div className="mt-6 print:hidden">
          <Card variant="highlighted">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">AI Portfolio Coach</p>
            <p className="text-sm text-blue-900 mb-3">
              Get a plain-English explanation of this report from the AI Portfolio Coach.
            </p>
            <Button onClick={() => onAskCoach(buildCoachQuestion(data))}>
              ✦ Explain this report
            </Button>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
