"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRupiah } from "@/lib/format"

interface RegionBarChartProps {
  data: { region: string; price: number }[]
  loading: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-[#1e293b] mb-1">{label}</p>
      <p className="text-[#64748b]">
        Harga: <span className="font-medium text-[#1e293b]">{formatRupiah(payload[0].value)}</span>
      </p>
    </div>
  )
}

function getBarColor(price: number, avg: number): string {
  const ratio = price / avg
  if (ratio < 0.97) return "#22c55e"   // below average: green
  if (ratio <= 1.03) return "#eab308"  // near average: yellow
  return "#ef4444"                      // above average: red
}

function formatXAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function RegionBarChart({ data, loading }: RegionBarChartProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />
  }

  const sorted = [...data].sort((a, b) => b.price - a.price)
  const avg = sorted.length > 0
    ? sorted.reduce((sum, d) => sum + d.price, 0) / sorted.length
    : 0

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="region"
          width={90}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar isAnimationActive={false} dataKey="price" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {sorted.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.price, avg)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
