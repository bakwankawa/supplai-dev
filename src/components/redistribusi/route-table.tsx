"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { RedistributionRoute, Postur } from "@/lib/types"
import { formatRupiah, formatNumber } from "@/lib/format"
import { jelaskanStatus } from "@/lib/redistribusi/status"
import { ton, persen, angka, SKALA_PERSEN_PASAR, takaranLabel } from "@/lib/redistribusi/format"
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/info-tooltip";

/** No "distance": the distance is a sub-line of the Biaya cell now, not a
 *  column of its own, so there is nothing for a distance sort to reorder.
 *  Leaving the member in would keep an unreachable branch alive in the
 *  comparator. */
type SortKey = "from" | "to" | "volumeTon" | "cost" | "priority" | "persenPasar" | "kecukupanPersen";

const PRIORITY_ORDER: Record<RedistributionRoute["priority"], number> = { high: 0, medium: 1, low: 2 };
interface RouteTableProps {
  routes: RedistributionRoute[];
  loading: boolean;
  /** The solver's own status string, or `null` where no answer was received.
   *  It used to default to "kosong" — which is a real verdict the solver
   *  returns for konservatif/all — so a failed fetch rendered as a solver
   *  finding. There is no default any more. */
  status: string | null;
  /** Message from a failed load. Non-null means this table has no plan to
   *  describe and must not describe one. */
  gagalMuat?: string | null;
  postur: Postur;
  komoditas: string;
  commodityId: string;
  emptyState?: { title: string; reason: string };
}

export function RouteTable({ routes, loading, status, gagalMuat, postur, komoditas, commodityId, emptyState }: RouteTableProps) {
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

  // A load that never arrived is not an empty plan. Every sentence below is a
  // quotation of the solver; attributing one to an answer we never received
  // would put words in its mouth.
  if (gagalMuat || status === null) {
    return (
      <div className="py-12 px-6 text-center space-y-1.5">
        <p className="text-xs font-bold text-rose-600">Rencana ini gagal dimuat.</p>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-md mx-auto">
          {gagalMuat ?? "Tidak ada jawaban dari server."} Ini kegagalan pengambilan
          data, bukan pernyataan bahwa pemecah rute tidak menghasilkan rute.
        </p>
      </div>
    );
  }

  // An empty plan is a result, not a gap — and there is more than one way to
  // get one. The solver says which; we show that rather than guessing.
  if (routes.length === 0) {
    const { judul, alasan } = emptyState
      ? { judul: emptyState.title, alasan: emptyState.reason }
      : jelaskanStatus(status, postur, komoditas);
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
    const aVal = sortKey === "priority" ? PRIORITY_ORDER[a.priority] : a[sortKey];
    const bVal = sortKey === "priority" ? PRIORITY_ORDER[b.priority] : b[sortKey];

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
    // No overflow-hidden here. <Table> already renders its own
    // `overflow-x-auto` container, and this wrapper's overflow-hidden — there
    // for the rounded corners — clipped that container instead of letting it
    // scroll, so the last columns were simply cut off. The corners survive
    // without it because the summary paragraph, not the header row, sits at
    // the top of this box. The table declares a min width so the scrollbar
    // engages rather than the columns squeezing.
    <div className="bg-white">
      {(() => {
        const terukur = routes.filter((r) => r.dasarTakaran === "terukur").length;
        return (
          <p className="mb-3 text-sm font-medium leading-6 text-slate-500">
            <span className="font-bold text-slate-700">{terukur} dari {routes.length} rute</span>{" "}
            volumenya ditetapkan dari kebutuhan terukur. Sisanya dibatasi aturan sisi asal
            yang kami tetapkan sendiri, bukan yang kami ukur — makin agresif posturnya,
            makin besar bagian yang diasumsikan.{" "}
            <span className="text-slate-400">
              Pada layar sempit tabel ini digeser ke samping untuk mencapai kolom Biaya dan Prioritas.
            </span>
          </p>
        );
      })()}
      <Table className="min-w-[860px] text-sm">
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            {(["from", "to"] as const).map((col) => (
              <TableHead
                key={col}
                onClick={() => toggleSort(col)}
                className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 capitalize">
                  {col === "from" ? "Asal" : "Tujuan"}
                  <ChevronsUpDown className={`w-3 h-3 ${sortKey === col ? "text-[#006c4a]" : "text-slate-300"}`} />
                </div>
              </TableHead>
            ))}
            <TableHead
              onClick={() => toggleSort("volumeTon")}
              className="text-right cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
            >
              <div className="flex items-center gap-1 justify-end">
                Volume
                <ChevronsUpDown className={`w-3 h-3 ${sortKey === "volumeTon" ? "text-[#006c4a]" : "text-slate-300"}`} />
              </div>
            </TableHead>
            <TableHead
              onClick={() => toggleSort("persenPasar")}
              className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
            >
              <div className="flex items-center gap-1">
                % pasar tujuan
                <ChevronsUpDown className={`w-3 h-3 ${sortKey === "persenPasar" ? "text-[#006c4a]" : "text-slate-300"}`} />
              </div>
            </TableHead>
            <TableHead
              className="text-right font-bold text-slate-700 py-3 whitespace-nowrap"
              title="Poin persen dari kenaikan harga yang diprediksi, yang ditahan rute ini di provinsi tujuan. 'Tidak diketahui' berarti provinsi tujuan tidak punya data konsumsi pendukung untuk menghitungnya — bukan nol."
            >
              Menekan harga
            </TableHead>
            <TableHead className="font-bold text-slate-700 py-3 whitespace-nowrap">Dasar takaran</TableHead>
            <TableHead
              onClick={() => toggleSort("kecukupanPersen")}
              className="text-right cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
            >
              <div className="flex items-center justify-end gap-1">
                Kecukupan GPM
                <InfoTooltip text="Kecukupan GPM menunjukkan bagian kebutuhan terukur yang sudah ditutup Gerakan Pangan Murah di provinsi tujuan, bukan cakupan rute pada baris tersebut. Nilainya melekat pada wilayah tujuan dan bersifat indikatif karena satu kegiatan GPM mencakup beberapa komoditas." />
                <ChevronsUpDown className={`w-3 h-3 ${sortKey === "kecukupanPersen" ? "text-[#006c4a]" : "text-slate-300"}`} />
              </div>
            </TableHead>
            {([["cost", "Biaya"], ["priority", "Prioritas"]] as const).map(([col, judul]) => (
              <TableHead
                key={col}
                onClick={() => toggleSort(col)}
                className="cursor-pointer select-none font-bold text-slate-700 hover:text-[#006c4a] transition-colors py-3 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  {judul}
                  <ChevronsUpDown className={`w-3 h-3 ${sortKey === col ? "text-[#006c4a]" : "text-slate-300"}`} />
                </div>
              </TableHead>
            ))}
            <TableHead className="font-bold text-slate-700 py-3 text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((route, i) => (
            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
              <TableCell className="font-bold text-slate-800">{route.from}</TableCell>
              <TableCell className="font-medium text-slate-600">{route.to}</TableCell>
              <TableCell className="text-right tabular-nums">
                <div className="font-bold text-slate-700">{ton(route.volumeTon)}</div>
                <div className="text-xs text-slate-400">
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
                    className="text-xs font-bold tabular-nums text-slate-600"
                    title={`Konsumsi bulanan ${route.to}: ${ton(route.konsumsiTujuanTonBulan)}`}
                  >
                    {persen(route.persenPasar)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {route.ditahanPp === null ? (
                  <span
                    className="text-[11px] font-medium italic text-slate-400"
                    title="Provinsi tujuan tidak punya data konsumsi pendukung, sehingga penekanan harga rute ini tidak diketahui — bukan nol."
                  >
                    tidak diketahui
                  </span>
                ) : (
                  <>
                    <div className="font-bold text-slate-700">{angka(route.ditahanPp)} pp</div>
                    <span className="block text-[10px] text-slate-400">
                      {route.dasarTakaran === "terukur" ? "terukur" : "diasumsikan"}
                    </span>
                  </>
                )}
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
              <TableCell className="tabular-nums" title={`Jarak ${route.from} ke ${route.to}: ${formatNumber(route.distance)} km`}>
                <div className="font-mono font-bold text-slate-800">{formatRupiah(route.cost)}</div>
                <div className="text-xs text-slate-400">{formatNumber(route.distance)} km</div>
              </TableCell>
              <TableCell>
                {route.priority === "high" && <Badge className="rounded-md border-none bg-rose-500 px-2 py-0.5 text-xs text-white hover:bg-rose-600">Tinggi</Badge>}
                {route.priority === "medium" && <Badge className="rounded-md border-none bg-amber-500 px-2 py-0.5 text-xs text-white hover:bg-amber-600">Sedang</Badge>}
                {route.priority === "low" && <Badge className="rounded-md border-none bg-slate-400 px-2 py-0.5 text-xs text-white hover:bg-slate-500">Rendah</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/redistribusi/detail?commodity=${encodeURIComponent(commodityId)}&postur=${postur}&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Lihat detail
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
