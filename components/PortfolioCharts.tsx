"use client";

import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, LabelList,
  ResponsiveContainer,
} from "recharts";
// Cell is used only for the donut chart slices
import type { Holding } from "@/types/portfolio";
import type { ExposureItem } from "@/lib/portfolioMetadata";
import Card from "@/components/ui/Card";

const DONUT_COLORS = ["#334155", "#3b82f6", "#14b8a6", "#f59e0b", "#8b5cf6"];
const DONUT_OVERFLOW = "#e2e8f0";
const BAR_COLOR = "#94a3b8";

interface Props {
  holdings: Holding[];
  totalValue: number;
  assetTypeItems: ExposureItem[];
  sectorExposure: ExposureItem[];
  geographyExposure: ExposureItem[];
  currencyExposure: ExposureItem[];
  hasUnmapped: boolean;
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

interface PieEntry {
  name: string;
  value: number;
  weight: number;
  color: string;
}

function buildPieData(holdings: Holding[], totalValue: number): PieEntry[] {
  if (totalValue === 0) return [];
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const entries: PieEntry[] = top5.map((h, i) => ({
    name: h.ticker || h.name || `Holding ${i + 1}`,
    value: h.marketValue,
    weight: (h.marketValue / totalValue) * 100,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  if (rest.length > 0) {
    const restValue = rest.reduce((s, h) => s + h.marketValue, 0);
    entries.push({
      name: "Other",
      value: restValue,
      weight: (restValue / totalValue) * 100,
      color: DONUT_OVERFLOW,
    });
  }
  return entries;
}

function HoldingWeightsChart({ holdings, totalValue }: { holdings: Holding[]; totalValue: number }) {
  const pieData = buildPieData(holdings, totalValue);
  if (pieData.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Holding weights</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={82}
            dataKey="value"
            isAnimationActive={false}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const d = props.payload[0].payload as PieEntry;
              return (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <p className="text-slate-500">{d.weight.toFixed(1)}%</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1.5">
        {pieData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="flex-1 text-slate-700 truncate">{entry.name}</span>
            <span className="text-slate-400 tabular-nums">{entry.weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

function ExposureBarChart({ title, items }: { title: string; items: ExposureItem[] }) {
  if (items.length === 0) return null;
  const data = items.slice(0, 7);
  const chartHeight = data.length * 34 + 8;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 44, top: 0, bottom: 0 }} barSize={12}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="weight" fill={BAR_COLOR} radius={[0, 3, 3, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="weight"
              position="right"
              formatter={(v: string | number | boolean | null | undefined) => typeof v === "number" ? `${v.toFixed(1)}%` : ""}
              style={{ fontSize: 11, fill: "#94a3b8" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PortfolioCharts({
  holdings,
  totalValue,
  assetTypeItems,
  sectorExposure,
  geographyExposure,
  currencyExposure,
  hasUnmapped,
}: Props) {
  if (holdings.length === 0) return null;

  return (
    <Card padding="sm">
      {hasUnmapped && (
        <p className="text-xs text-slate-400 mb-4">
          Some holdings could not be mapped — charts may not reflect the full portfolio.
        </p>
      )}
      <div className="space-y-8">
        <HoldingWeightsChart holdings={holdings} totalValue={totalValue} />
        {assetTypeItems.length > 0 && <ExposureBarChart title="Asset type" items={assetTypeItems} />}
        {sectorExposure.length > 0 && <ExposureBarChart title="Sector" items={sectorExposure} />}
        {geographyExposure.length > 0 && <ExposureBarChart title="Geography" items={geographyExposure} />}
        {currencyExposure.length > 0 && <ExposureBarChart title="Currency" items={currencyExposure} />}
      </div>
    </Card>
  );
}
