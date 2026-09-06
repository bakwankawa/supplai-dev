"use client"

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRupiah, formatShortDate } from "@/lib/format"
import type { PricePoint } from "@/lib/types"

interface PriceLineChartProps {
  data: PricePoint[]
  loading: boolean
}

interface TooltipPayloadItem {
  name: string
  value: number | null
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const actual = payload.find((p) => p.dataKey === "actual")
  const predicted = payload.find((p) => p.dataKey === "predicted")

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-[#1e293b] mb-2">{label}</p>
      {actual && actual.value != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block size-2.5 rounded-full bg-[#2563eb]" />
          <span className="text-[#64748b]">Aktual:</span>
          <span className="font-medium text-[#1e293b]">{formatRupiah(actual.value)}</span>
        </div>
      )}
      {predicted && predicted.value != null && (
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-[#f97316]" />
          <span className="text-[#64748b]">Prediksi:</span>
          <span className="font-medium text-[#1e293b]">{formatRupiah(predicted.value)}</span>
        </div>
      )}
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function PriceLineChart({ data, loading }: PriceLineChartProps) {
  if (loading) {
    return <Skeleton className="h-[350px] w-full" />
  }

  const chartData = data.map((d) => ({
    ...d,
    date: formatShortDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="line"
          formatter={(value) => {
            if (value === "actual") return "Harga Aktual"
            if (value === "predicted") return "Harga Prediksi"
            if (value === "upper") return "Rentang Prediksi"
            return value
          }}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />

        {/* Confidence interval area */}
        <Area isAnimationActive={false}
          dataKey="upper"
          stroke="none"
          fill="#2563eb"
          fillOpacity={0.1}
          legendType="none"
          dot={false}
          connectNulls={false}
          name="upper"
        />
        <Area isAnimationActive={false}
          dataKey="lower"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          legendType="none"
          dot={false}
          connectNulls={false}
          name="lower"
        />

        {/* Actual prices */}
        <Line isAnimationActive={false}
          type="monotone"
          dataKey="actual"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          name="actual"
        />

        {/* Predicted prices */}
        <Line isAnimationActive={false}
          type="monotone"
          dataKey="predicted"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          connectNulls={false}
          name="predicted"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
