"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { calculateFutureValue } from "@/lib/readinessCalculations";
import { formatAxisValue } from "@/lib/formatters";

interface DataPoint {
  year: number;
  portfolioValue: number;
  totalContributed: number;
}

function generateProjectionData(
  starting: number,
  monthly: number,
  years: number,
  annualReturnPct: number
): DataPoint[] {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    portfolioValue: Math.round(calculateFutureValue(starting, monthly, year, annualReturnPct)),
    totalContributed: Math.round(starting + monthly * year * 12),
  }));
}

const fmtFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface TooltipItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: number | string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 text-xs space-y-1">
      <p className="font-semibold text-slate-700">Year {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtFull.format(p.value)}
        </p>
      ))}
    </div>
  );
}

interface Props {
  starting: number;
  monthly: number;
  years: number;
  annualReturnPct: number;
}

export default function ProjectionChart({ starting, monthly, years, annualReturnPct }: Props) {
  const data = generateProjectionData(starting, monthly, years, annualReturnPct);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Projected growth over time
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Based on the assumptions entered above. Real investment returns are not smooth and can be negative in some years.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Years", position: "insideBottomRight", offset: -8, fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis
            tickFormatter={formatAxisValue}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
          <Line
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio value"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="totalContributed"
            name="Total contributed"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
