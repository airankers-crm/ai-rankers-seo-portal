"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { label: string; value: number };

export function TrendChart({ data, metricLabel = "Organic traffic" }: { data: TrendPoint[]; metricLabel?: string }) {
  return (
    <div className="chart-wrap" aria-label="Organic traffic trend chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f26b38" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#f26b38" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef0f4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9aa3b1", fontSize: 10 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9aa3b1", fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} />
          <Tooltip contentStyle={{ border: "1px solid #e7eaf0", borderRadius: 9, fontSize: 11, boxShadow: "0 8px 22px rgba(24,34,53,.1)" }} formatter={(value) => [Number(value).toLocaleString(), metricLabel]} />
          <Area type="monotone" dataKey="value" stroke="#f26b38" strokeWidth={3} fill="url(#trafficFill)" activeDot={{ r: 5, fill: "#f26b38", stroke: "#fff", strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
