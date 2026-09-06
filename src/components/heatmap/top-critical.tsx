"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPercent } from "@/lib/format"

interface TopCriticalProps {
  data: { region: string; commodity: string; change: number }[]
  loading: boolean
}

function getChangeBadgeStyle(change: number): string {
  if (change >= 10) return "bg-red-100 text-red-700 border border-red-200"
  if (change >= 5) return "bg-orange-100 text-orange-700 border border-orange-200"
  if (change >= 2) return "bg-yellow-100 text-yellow-700 border border-yellow-200"
  return "bg-green-100 text-green-700 border border-green-200"
}

function getRankStyle(rank: number): string {
  if (rank === 1) return "bg-red-500 text-white"
  if (rank === 2) return "bg-orange-500 text-white"
  if (rank === 3) return "bg-yellow-500 text-white"
  return "bg-gray-200 text-gray-600"
}

// Convert region name to a simple slug for the URL
function toRegionId(region: string): string {
  return region
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function TopCriticalSkeleton() {
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function TopCritical({ data, loading }: TopCriticalProps) {
  const router = useRouter()

  if (loading) {
    return <TopCriticalSkeleton />
  }

  const items = data.slice(0, 5)

  return (
    <Card className="bg-white shadow-sm h-fit">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#1e293b]">
          Top 5 Wilayah Kritis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tidak ada data
          </p>
        )}
        {items.map((item, idx) => {
          const rank = idx + 1
          return (
            <button
              key={`${item.region}-${idx}`}
              onClick={() =>
                router.push(`/dashboard?region=${toRegionId(item.region)}`)
              }
              className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors text-left group"
            >
              {/* Rank number */}
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(rank)}`}
              >
                {rank}
              </div>

              {/* Region + commodity */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#1e293b] truncate group-hover:text-[#2563eb] transition-colors">
                  {item.region}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.commodity}
                </p>
              </div>

              {/* Change badge */}
              <span
                className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md ${getChangeBadgeStyle(
                  item.change
                )}`}
              >
                {formatPercent(item.change)}
              </span>
            </button>
          )
        })}

        {items.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Klik wilayah untuk melihat detail prediksi
          </p>
        )}
      </CardContent>
    </Card>
  )
}
