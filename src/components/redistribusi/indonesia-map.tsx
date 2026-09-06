"use client"

import { useState } from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps"
import { Skeleton } from "@/components/ui/skeleton"
import type { RedistributionProvince, RedistributionRoute } from "@/lib/types"

// World atlas TopoJSON — we filter to Indonesia (numeric 360)
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Province centroids [longitude, latitude], sourced from artifacts/centroids.parquet
// (the same centroids the model uses to compute shipping distances)
const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Jawa Timur":        [112.75,  -7.5],
  "Jawa Barat":        [107.6,   -6.9],
  "Jawa Tengah":       [110.0,   -7.15],
  "Sulawesi Selatan":  [119.9,   -3.8],
  "Sumatera Selatan":  [104.5,   -3.5],
  "Lampung":           [105.3,   -4.6],
  "Kalimantan Selatan":[115.4,   -3.0],
  "Bali":              [115.2,   -8.4],
  "Papua":             [138.0,   -4.5],
  "Papua Barat":       [134.0,   -1.3],
  "Maluku":            [128.5,   -3.5],
  "Nusa Tenggara Timur": [122.23, -9.52],
  "Sulawesi Tengah":   [119.9,   -1.4],
  "Kalimantan Barat":  [110.2,    0.0],
  "Papua Selatan":     [140.2,   -8.0],
  "Maluku Utara":      [127.5,    1.5],
  "Nusa Tenggara Barat": [116.92, -8.54],
  "Sulawesi Utara":    [124.8,    1.3],
  "Bengkulu":           [102.29,  -3.81],
  "DKI Jakarta":        [106.86,  -6.26],
  "Gorontalo":          [123.05,   0.56],
  "Kalimantan Tengah":  [113.51,  -2.35],
  "Kalimantan Timur":   [117.14,  -0.56],
  "Kalimantan Utara":   [117.49,   3.09],
  "Kepulauan Riau":     [104.18,   1.02],
  "Riau":               [101.79,   0.61],
  "Sulawesi Barat":     [118.98,  -3.04],
  "Sulawesi Tenggara":  [122.56,  -4.67],
  "Sumatera Barat":     [100.37,  -0.61],
  "Sumatera Utara":      [98.74,   2.54],
}

interface TooltipState {
  name: string
  status: "surplus" | "deficit"
  stock: number
  x: number
  y: number
}

interface IndonesiaMapProps {
  provinces: RedistributionProvince[]
  routes: RedistributionRoute[]
  loading: boolean
}

export function IndonesiaMap({ provinces, routes, loading }: IndonesiaMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (loading) {
    return (
      <div className="relative">
        <Skeleton className="w-full h-72 rounded-xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Memuat peta…</div>
        </div>
      </div>
    )
  }

  // Build a lookup by province name for quick access
  const provinceMap = new Map(provinces.map((p) => [p.name, p]))

  // Resolve route endpoints to coordinates
  const resolvedRoutes = routes
    .map((r) => {
      const fromCoords = PROVINCE_COORDS[r.from]
      const toCoords = PROVINCE_COORDS[r.to]
      if (!fromCoords || !toCoords) return null
      return { ...r, fromCoords, toCoords }
    })
    .filter(Boolean) as (RedistributionRoute & {
      fromCoords: [number, number]
      toCoords: [number, number]
    })[]

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [118, -2], scale: 1050 }}
        width={800}
        height={320}
        style={{ width: "100%", height: "auto" }}
      >
        {/* Indonesia base shape from world atlas */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geo) => {
                // world-atlas numeric code for Indonesia is 360
                // geo.id can be a number (360) or string ("360")
                return (
                  String(geo.id) === "360" ||
                  geo.properties?.["iso_n3"] === "360" ||
                  geo.properties?.["ADM0_A3"] === "IDN"
                )
              })
              .map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#cbd5e1"
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
          }
        </Geographies>

        {/* Route lines — animated dashed arcs */}
        {resolvedRoutes.map((route, i) => (
          <Line
            key={i}
            from={route.fromCoords}
            to={route.toCoords}
            stroke={
              route.priority === "high"
                ? "#dc2626"
                : route.priority === "medium"
                ? "#2563eb"
                : "#94a3b8"
            }
            strokeWidth={route.priority === "high" ? 1.8 : 1.2}
            strokeDasharray="5 3"
            strokeLinecap="round"
            className="route-line"
          />
        ))}

        {/* Province markers */}
        {Object.entries(PROVINCE_COORDS).map(([name, coords]) => {
          const province = provinceMap.get(name)
          if (!province) return null

          const isSurplus = province.status === "surplus"
          const fill = isSurplus ? "#22c55e" : "#ef4444"
          const r = isSurplus ? 6 : 5

          return (
            <Marker
              key={name}
              coordinates={coords}
              onMouseEnter={(e: React.MouseEvent) => {
                const rect = (e.currentTarget as SVGElement)
                  .closest("svg")
                  ?.getBoundingClientRect()
                setTooltip({
                  name,
                  status: province.status,
                  stock: province.stock,
                  x: e.clientX - (rect?.left ?? 0),
                  y: e.clientY - (rect?.top ?? 0),
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Outer pulse ring for surplus provinces */}
              {isSurplus && (
                <circle
                  r={r + 4}
                  fill={fill}
                  fillOpacity={0.2}
                  stroke="none"
                />
              )}
              <circle
                r={r}
                fill={fill}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />
              <text
                textAnchor="middle"
                y={-10}
                style={{
                  fontFamily: "sans-serif",
                  fontSize: "5px",
                  fill: "#1e293b",
                  fontWeight: 600,
                  pointerEvents: "none",
                }}
              >
                {name.length > 14 ? name.slice(0, 13) + "…" : name}
              </text>
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-semibold text-[#1e293b]">{tooltip.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                tooltip.status === "surplus" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="capitalize text-muted-foreground">
              {tooltip.status === "surplus" ? "Surplus" : "Defisit"}
            </span>
          </div>
          <div className="text-muted-foreground">
            Stok: <span className="font-medium text-foreground">{tooltip.stock.toLocaleString("id-ID")} ton</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Surplus
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Defisit
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="8">
            <line x1="0" y1="4" x2="20" y2="4" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 2" />
          </svg>
          Prioritas Tinggi
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="8">
            <line x1="0" y1="4" x2="20" y2="4" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          Prioritas Sedang
        </div>
      </div>
    </div>
  )
}
