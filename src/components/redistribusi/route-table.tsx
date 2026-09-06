"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { RedistributionRoute, Postur } from "@/lib/types"
import { formatRupiah, formatNumber } from "@/lib/format"
import { jelaskanStatus } from "@/lib/redistribusi/status"
import { ton, persen, SKALA_PERSEN_PASAR, takaranLabel } from "@/lib/redistribusi/format"
import { ChevronsUpDown } from "lucide-react";

type SortKey = "from" | "to" | "volume" | "distance" | "cost" | "priority" | "persenPasar" | "kecukupanPersen";

const PRIORITY_ORDER: Record<RedistributionRoute["priority"], number> = { high: 0, medium: 1, low: 2 };
const COMMODITY_LABELS: Record<string, string> = { beras: "Beras", "bawang-merah": "Bawang Merah", "cabai-rawit": "Cabai Rawit", "minyak-goreng": "Minyak Goreng" };

interface RouteTableProps {
  routes: RedistributionRoute[];
  loading: boolean;
  status: string;
  postur: Postur;
  komoditas: string;
}

export function RouteTable({ routes, loading, status, postur, komoditas }: RouteTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // An empty plan is a result, not a gap — and there is more than one way to
  // get one. The solver says which; we show that rather than guessing.
  if (routes.length === 0) {
    const { judul, alasan } = jelaskanStatus(status, postur, komoditas);
    return (
      <div className="py-12 px-6 text-center space-y-1.5">
        <p className="text-xs font-bold text-slate-500">{judul}</p>
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-md mx-auto">
          {alasan}
        </p>
      </div>
    );
  }

  const sorted = [...routes].sort((a, b) => {
    let aVal = sortKey === "priority" ? PRIORITY_ORDER[a.priority] : a[sortKey];
    let bVal = sortKey === "priority" ? PRIORITY_ORDER[b.priority] : b[sortKey];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const toggleSort = (key: SortKey) => {
    setSortAsc(sortKey === key ? !sortAsc : true);
    setSortKey(key);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {(() => {
        const terukur = routes.filter((r) => r.dasarTakaran === "terukur").length;
        return (
          <p className="text-[11px] font-medium text-slate-500 mb-3 leading-relaxed">
            <span className="font-bold text-slate-700">{terukur} dari {routes.length} rute</span>{" "}
            volumenya ditetapkan dari kebutuhan terukur. Sisanya dibatasi aturan sisi asal
            yang kami tetapkan sendiri, bukan yang kami ukur — makin agresif posturnya,
            makin besar bagian yang diasumsikan.
          </p>
        );
      })()}
      <Table className="text-xs">
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            {(["from", "to", "volume"] as const).map((col) => (
              <TableHead
                key={col}
                onClick={() => toggleSort(col)}
                className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 capitalize">
                  {col === "from" ? "Asal" : col === "to" ? "Tujuan" : col}
                  {/* Mengubah nama komponen di bawah ini */}
                  <ChevronsUpDown className={`w-3 h-3 ${sortKey === col ? "text-[#006c4a]" : "text-slate-300"}`} />
                </div>
              </TableHead>
            ))}
            <TableHead className="text-right font-bold text-slate-700 py-3 whitespace-nowrap">Volume</TableHead>
            <TableHead
              onClick={() => toggleSort("persenPasar")}
              className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
            >
              <div className="flex items-center gap-1">
                % pasar tujuan <span className="font-normal text-slate-400">(skala 0–5%)</span>
                <ChevronsUpDown className={`w-3 h-3 ${sortKey === "persenPasar" ? "text-[#006c4a]" : "text-slate-300"}`} />
              </div>
            </TableHead>
            <TableHead className="font-bold text-slate-700 py-3 whitespace-nowrap">Dasar takaran</TableHead>
            <TableHead
              onClick={() => toggleSort("kecukupanPersen")}
              className="text-right cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
            >
              <div className="flex items-center gap-1 justify-end">
                Kecukupan
                <ChevronsUpDown className={`w-3 h-3 ${sortKey === "kecukupanPersen" ? "text-[#006c4a]" : "text-slate-300"}`} />
              </div>
            </TableHead>
            {(["distance", "cost", "priority"] as const).map((col) => (
              <TableHead
                key={col}
                onClick={() => toggleSort(col)}
                className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 capitalize">
                  {col === "cost" ? "Est. Biaya" : col}
                  {/* Mengubah nama komponen di bawah ini */}
                  <ChevronsUpDown className={`w-3 h-3 ${sortKey === col ? "text-[#006c4a]" : "text-slate-300"}`} />
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((route, i) => (
            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
              <TableCell className="font-bold text-slate-800">{route.from}</TableCell>
              <TableCell className="font-medium text-slate-600">{route.to}</TableCell>
              <TableCell className="font-mono font-semibold text-slate-700">{formatNumber(route.volume)} t</TableCell>
              <TableCell className="text-right tabular-nums">
                <div className="font-bold text-slate-700">{ton(route.volumeTon)}</div>
                <div className="text-[10px] text-slate-400">
                  {ton(route.volumeCiBawah).replace(" t", "")}–{ton(route.volumeCiAtas)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#006c4a]"
                      style={{ width: `${Math.min(100, (route.persenPasar / SKALA_PERSEN_PASAR) * 100)}%` }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums text-slate-600"
                    title={`Konsumsi bulanan ${route.to}: ${ton(route.konsumsiTujuanTonBulan)}`}
                  >
                    {persen(route.persenPasar)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={route.dasarTakaran === "terukur" ? "default" : "outline"}
                  title={takaranLabel(route.dasarTakaran).keterangan}
                >
                  {takaranLabel(route.dasarTakaran).teks}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-slate-600 font-bold">
                {persen(route.kecukupanPersen, 1)}
              </TableCell>
              <TableCell className="font-medium text-slate-500">{formatNumber(route.distance)} km</TableCell>
              <TableCell className="font-mono font-bold text-slate-800">{formatRupiah(route.cost)}</TableCell>
              <TableCell>
                {route.priority === "high" && <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none rounded-md px-2 py-0.5 text-[10px]">Tinggi</Badge>}
                {route.priority === "medium" && <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none rounded-md px-2 py-0.5 text-[10px]">Sedang</Badge>}
                {route.priority === "low" && <Badge className="bg-slate-400 hover:bg-slate-500 text-white border-none rounded-md px-2 py-0.5 text-[10px]">Rendah</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}