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

// World atlas TopoJSON — we filter to Indonesia (numeric 360).
// Resolusi 50m, bukan 110m: pada 110m Indonesia hanya tergambar sebagai 13
// poligon, sehingga pulau kecil seperti Bali, Lombok dan Bangka tidak ada
// sama sekali dan penandanya tampak mengambang di laut atau menempel ke
// pulau tetangga -- Bali terlihat seolah bagian dari Jawa. Pada 50m Indonesia
// tergambar sebagai 133 poligon.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"

// Province centroids [longitude, latitude], dibangkitkan langsung dari
// artifacts/centroids.parquet -- centroid yang sama yang dipakai model untuk
// menghitung jarak pengiriman, jadi titik di peta dan jarak di tabel rute
// berasal dari satu sumber.
//
// Daftar ini WAJIB memuat seluruh 34 provinsi. Rute yang salah satu ujungnya
// tidak ada di sini dibuang diam-diam oleh resolvedRoutes di bawah, tanpa
// pesan apa pun. Sebelum ini hanya ada 31 entri: Aceh, Banten, Jambi dan
// Kepulauan Bangka Belitung hilang, sehingga peta telur ayam hanya
// menggambar 3-4 dari 13 rute -- sisanya lenyap tanpa jejak. "Papua Selatan"
// juga terdaftar padahal tidak ada di data 34 provinsi, jadi dihapus.
const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Aceh":                      [  96.21,   4.96],
  "Bali":                      [ 115.15,  -8.38],
  "Banten":                    [ 106.30,  -6.11],
  "Bengkulu":                  [ 102.29,  -3.81],
  "DI Yogyakarta":             [ 110.37,  -7.79],
  "DKI Jakarta":               [ 106.86,  -6.26],
  "Gorontalo":                 [ 123.05,   0.56],
  "Jambi":                     [ 102.87,  -1.54],
  "Jawa Barat":                [ 107.62,  -6.79],
  "Jawa Tengah":               [ 110.35,  -7.41],
  "Jawa Timur":                [ 112.94,  -7.80],
  "Kalimantan Barat":          [ 109.71,   0.24],
  "Kalimantan Selatan":        [ 115.14,  -3.01],
  "Kalimantan Tengah":         [ 113.51,  -2.35],
  "Kalimantan Timur":          [ 117.14,  -0.57],
  "Kalimantan Utara":          [ 117.49,   3.08],
  "Kepulauan Bangka Belitung": [ 106.89,  -2.44],
  "Kepulauan Riau":            [ 104.18,   1.02],
  "Lampung":                   [ 105.29,  -5.27],
  "Maluku":                    [ 130.44,  -4.66],
  "Maluku Utara":              [ 127.39,   0.78],
  "Nusa Tenggara Barat":       [ 116.91,  -8.54],
  "Nusa Tenggara Timur":       [ 122.22,  -9.50],
  "Papua":                     [ 139.52,  -4.50],
  "Papua Barat":               [ 132.65,  -0.87],
  "Riau":                      [ 101.81,   0.60],
  "Sulawesi Barat":            [ 118.98,  -3.04],
  "Sulawesi Selatan":          [ 119.95,  -4.45],
  "Sulawesi Tengah":           [ 120.25,  -0.91],
  "Sulawesi Tenggara":         [ 122.56,  -4.67],
  "Sulawesi Utara":            [ 124.64,   1.20],
  "Sumatera Barat":            [ 100.37,  -0.61],
  "Sumatera Selatan":          [ 104.15,  -3.08],
  "Sumatera Utara":            [  98.73,   2.53],
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
  selectedProvince?: string | null
  onProvinceSelect?: (name: string) => void
}

export function IndonesiaMap({ provinces, routes, loading, selectedProvince, onProvinceSelect }: IndonesiaMapProps) {
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
          const isSelected = selectedProvince === name
          const fill = isSurplus ? "#22c55e" : "#ef4444"
          const r = isSurplus ? 6 : 5

          return (
            <Marker
              key={name}
              coordinates={coords}
              onClick={() => onProvinceSelect?.(name)}
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
              {(isSurplus || isSelected) && (
                <circle
                  r={isSelected ? r + 7 : r + 4}
                  fill={fill}
                  fillOpacity={isSelected ? 0.28 : 0.2}
                  stroke={isSelected ? "#0f172a" : "none"}
                  strokeWidth={isSelected ? 1 : 0}
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
