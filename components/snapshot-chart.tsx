"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SnapshotChart({ data }: { data: { label: string; rows: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={56}>
          <CartesianGrid stroke="#E6EAF2" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#5C6B8A", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#5C6B8A", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(59,107,255,0.06)" }}
            formatter={(value) => [typeof value === "number" ? value : "Unknown", "Rows"]}
          />
          <Bar dataKey="rows" name="Rows" fill="#3B6BFF" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
