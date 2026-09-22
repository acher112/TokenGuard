"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCost } from "@/lib/utils";

export interface DailyCostPoint {
  date: string; // e.g. "Mon", "Tue" or "Sep 5"
  cost: number;
  requests: number;
}

interface CostChartProps {
  data: DailyCostPoint[];
  height?: number;
}

export function CostChart({ data, height = 280 }: CostChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No cost data recorded in this timeframe
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatCost(val)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length && payload[0]?.payload) {
                const item = payload[0].payload as DailyCostPoint;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-primary">
                      Cost: {formatCost(item.cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requests: {item.requests.toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#costGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
