"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatCost } from "@/lib/utils";

export interface ModelSpendItem {
  name: string;
  value: number; // cost in USD
  tokens: number;
}

const COLORS = [
  "#6366f1", // Indigo (Primary)
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

interface Props {
  data: ModelSpendItem[];
  height?: number;
}

export function ModelBreakdownChart({ data, height = 260 }: Props) {
  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No model spend data recorded
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length && payload[0]?.payload) {
                const item = payload[0].payload as ModelSpendItem;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-semibold text-xs text-muted-foreground">{item.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCost(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.tokens.toLocaleString()} tokens
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs font-medium text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
