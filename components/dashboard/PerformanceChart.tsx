"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { microsToDollar } from "@/lib/google-ads/utils";
import type { CampaignReportPoint } from "@/lib/types";

interface PerformanceChartProps {
  data: CampaignReportPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    spend: point.spendMicros / 1_000_000,
  }));

  if (chartData.length === 0) {
    return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">No reporting rows returned for this date range.</div>;
  }

  return (
    <div className="h-80 w-full rounded-xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C55A11" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#C55A11" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} width={48} />
          <Tooltip formatter={(value, name) => (name === "spend" ? microsToDollar(Number(value) * 1_000_000) : Number(value).toLocaleString())} />
          <Area type="monotone" dataKey="clicks" stroke="#1F3864" strokeWidth={2} fill="url(#scoreClicks)" />
          <Area type="monotone" dataKey="impressions" stroke="#C55A11" strokeWidth={2} fill="transparent" />
          <Area type="monotone" dataKey="spend" stroke="#16A34A" strokeWidth={2} fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
