"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCost } from "@/lib/utils";

export interface AgentSpendItem {
  agentName: string;
  cost: number;
  traces: number;
}

interface Props {
  data: AgentSpendItem[];
  height?: number;
}

export function AgentCostChart({ data, height = 260 }: Props) {
  if (!data || data.length === 0 || data.every((d) => d.cost === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No agent spend data recorded
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tickFormatter={(val) => formatCost(val)}
            fontSize={12}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="agentName"
            type="category"
            fontSize={12}
            stroke="hsl(var(--foreground))"
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length && payload[0]?.payload) {
                const item = payload[0].payload as AgentSpendItem;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-semibold text-xs text-muted-foreground">{item.agentName}</p>
                    <p className="text-sm font-bold text-primary">
                      Cost: {formatCost(item.cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Traces: {item.traces.toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="cost" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
