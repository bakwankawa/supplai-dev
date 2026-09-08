"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, MapPin, PackageCheck, Route, Truck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useApi } from "@/hooks/use-api";
import { commodities } from "@/data/commodities";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { Postur, RedistributionResponse } from "@/lib/types";
import { calculateRouteEstimate, recommendedVehicleId, redistributionVehicles, shelfLifeByCommodity } from "@/lib/redistribution/planning";
import { isPostur } from "@/lib/redistribusi/postur";
import { getBrowserReportGenerator } from "@/lib/report-generator";

function RedistributionDetail() {
  const params = useSearchParams();
  const commodity = params.get("commodity") ?? "beras";
  const posturParam = params.get("postur");
  const postur: Postur = posturParam && isPostur(posturParam) ? posturParam : "seimbang";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const [vehicleId, setVehicleId] = useState("box");
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState<{ url: string; filename: string } | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const { data, loading, error } = useApi<RedistributionResponse>(`/api/redistribution?commodity=${encodeURIComponent(commodity)}&postur=${postur}`);
  const routeList = data?.routes ?? [];
  const route = routeList.find((item) => item.from === from && item.to === to);
  const commodityName = commodities.find((item) => item.id === commodity)?.name ?? commodity;
  const shelfLife = shelfLifeByCommodity[commodity] ?? { duration: "Perlu verifikasi", handling: "Konfirmasi standar penyimpanan sebelum pengiriman." };

  useEffect(() => () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
  }, []);

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Memuat rincian redistribusi…</div>;
  if (error) return (
    <div className="rounded-xl border border-rose-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">Rincian redistribusi belum dapat dimuat</h1>
      <p className="mt-2 text-sm text-slate-500">{error.message}</p>
      <Link href={`/redistribusi?commodity=${encodeURIComponent(commodity)}&postur=${postur}`} className="mt-5 inline-flex text-sm font-bold text-[#006c4a]">Kembali ke redistribusi</Link>
    </div>
  );
  if (!route) return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">Rute tidak ditemukan</h1>
      <p className="mt-2 text-sm text-slate-500">Rute mungkin berubah setelah komoditas diperbarui.</p>
      <Link href={`/redistribusi?commodity=${encodeURIComponent(commodity)}&postur=${postur}`} className="mt-5 inline-flex text-sm font-bold text-[#006c4a]">Kembali ke redistribusi</Link>
    </div>
  );

  const routeIndex = routeList.findIndex((item) => item.from === route.from && item.to === route.to);
  const previousRoute = routeList[(routeIndex - 1 + routeList.length) % routeList.length];
  const nextRoute = routeList[(routeIndex + 1) % routeList.length];
  const routeHref = (item: typeof route) => `/redistribusi/detail?commodity=${encodeURIComponent(commodity)}&postur=${postur}&from=${encodeURIComponent(item.from)}&to=${encodeURIComponent(item.to)}`;
  const recommendedId = recommendedVehicleId(commodity, route);
  const { vehicle, volume, effectiveRate, total, adjustment: vehicleAdjustment, trips, days, costPerKg } = calculateRouteEstimate(route, vehicleId);

  const downloadReport = async (scope: "selected" | "all") => {
    setReportMenuOpen(false);
    setReportLoading(true);
    setReportError("");
    try {
      const query = new URLSearchParams({ commodity, postur, scope, vehicle: vehicleId, from: route.from, to: route.to, generatedBy: getBrowserReportGenerator() });
      const response = await fetch(`/api/redistribution-detail-report?${query}`);
      if (!response.ok) throw new Error("Laporan belum dapat dibuat. Coba lagi.");
      const url = URL.createObjectURL(await response.blob());
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const filename = `Laporan-Redistribusi-${commodity}-${scope}.pdf`;
      downloadUrlRef.current = url;
      setDownloadNotice({ url, filename });
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan gagal diunduh.");
    } finally {
      setReportLoading(false);
    }
  };

  const retryDownload = () => {
    if (!downloadNotice) return;
    const link = document.createElement("a");
    link.href = downloadNotice.url;
    link.download = downloadNotice.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const closeDownloadNotice = () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
    setDownloadNotice(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12 text-slate-800">
      <header className="border-b border-slate-200 pb-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link href={`/redistribusi?commodity=${encodeURIComponent(commodity)}&postur=${postur}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Kembali ke matriks rute</Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setReportMenuOpen((open) => !open)} disabled={reportLoading} aria-expanded={reportMenuOpen} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"><Download className="h-4 w-4" />{reportLoading ? "Menyiapkan…" : "Unduh laporan"}<ChevronDown className="h-3.5 w-3.5" /></button>
              {reportMenuOpen && <div className="absolute right-0 top-11 z-20 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                <button type="button" onClick={() => downloadReport("selected")} className="w-full rounded-md px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">Rute yang sedang dipilih</button>
                <button type="button" onClick={() => downloadReport("all")} className="w-full rounded-md px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">Semua rekomendasi ({routeList.length} rute)</button>
              </div>}
            </div>
            <nav aria-label="Navigasi rute" className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
              <Link href={routeHref(previousRoute)} aria-label="Rute sebelumnya" className="grid h-9 w-9 place-items-center border-r border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></Link>
              <span className="min-w-16 px-3 text-center font-mono text-xs font-bold text-slate-800">{routeIndex + 1} / {routeList.length}</span>
              <Link href={routeHref(nextRoute)} aria-label="Rute berikutnya" className="grid h-9 w-9 place-items-center border-l border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></Link>
            </nav>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Detail Rencana Redistribusi</h1>
        <p className="mt-1 text-sm text-slate-500">Periksa kebutuhan angkut, masa simpan, dan estimasi biaya sebelum menetapkan rute.</p>
      </header>

      {reportError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{reportError}</p>}

      <AnimatePresence>
        {downloadNotice && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} role="status" className="fixed bottom-6 right-6 z-[100] w-[min(24rem,calc(100vw-3rem))] rounded-xl border border-emerald-200 bg-white p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006c4a]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">Dokumen telah terunduh</p>
                <button type="button" onClick={retryDownload} className="mt-1 text-left text-xs font-semibold leading-5 text-[#006c4a] underline decoration-[#006c4a]/30 underline-offset-2 hover:decoration-[#006c4a]">Klik di sini jika dokumen belum terunduh otomatis.</button>
              </div>
              <button type="button" onClick={closeDownloadNotice} aria-label="Tutup notifikasi unduhan" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
        {[
          [PackageCheck, "Komoditas", commodityName],
          [MapPin, "Rute", `${route.from} → ${route.to}`],
          [Route, "Jarak", `${formatNumber(route.distance)} km`],
          [CalendarClock, "Estimasi perjalanan", `${days} hari operasional`],
        ].map(([Icon, label, value], index) => {
          const ItemIcon = Icon as typeof PackageCheck;
          return <div key={String(label)} className={`p-4 ${index ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""}`}>
            <div className="flex items-center gap-2 text-slate-500"><ItemIcon className="h-4 w-4" /><span className="font-mono text-[10px] font-bold uppercase tracking-wider">{String(label)}</span></div>
            <p className="mt-2 text-sm font-bold text-slate-900">{String(value)}</p>
          </div>;
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Pilih kendaraan</h2>
          <p className="mt-1 text-xs text-slate-500">Tarif berubah sesuai kapasitas dan kebutuhan penanganan.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {redistributionVehicles.map((item) => (
              <button key={item.id} type="button" onClick={() => setVehicleId(item.id)} aria-pressed={vehicleId === item.id} className={`rounded-lg border p-4 text-left transition-colors ${item.id === recommendedId ? "border-emerald-500 bg-emerald-50/40" : vehicleId === item.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-slate-900">{item.name}</span>
                  {item.id === recommendedId ? <span className="rounded bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-800">Direkomendasikan</span> : <Truck className="h-4 w-4 text-slate-500" />}
                </div>
                <p className="mt-2 text-xs text-slate-500">{item.capacity} ton/unit · {item.note}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">Kebutuhan armada</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(trips)} perjalanan unit</p>
            <p className="mt-1 text-xs text-slate-500">Volume {formatNumber(volume)} ton ÷ kapasitas {vehicle.capacity} ton.</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Estimasi biaya pengiriman</h2>
            <p className="mt-1 text-xs text-slate-500">Nilai Truk Boks sama dengan matriks. Pilihan kendaraan mengubah skenario.</p>
            <p className="mt-4 text-2xl font-black text-slate-900">{formatRupiah(total)}</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold text-slate-700">Estimasi acuan matriks</p><p className="mt-2 font-mono text-xs font-bold">{formatNumber(volume)} ton × {formatNumber(route.distance)} km × {formatRupiah(effectiveRate)}</p><p className="mt-2 text-sm text-slate-600">{formatRupiah(route.cost)}</p></div>
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold text-slate-700">Penyesuaian kendaraan</p><p className="mt-2 font-mono text-xs font-bold">{vehicle.name} × {vehicle.multiplier.toLocaleString("id-ID")} tarif acuan</p><p className={`mt-2 text-sm font-semibold ${vehicleAdjustment > 0 ? "text-rose-600" : vehicleAdjustment < 0 ? "text-emerald-700" : "text-slate-600"}`}>{vehicleAdjustment === 0 ? "Tidak ada penyesuaian" : formatRupiah(vehicleAdjustment)}</p></div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><span className="text-sm font-bold text-slate-700">Biaya per kilogram</span><span className="font-mono text-base font-black text-slate-900">{formatRupiah(costPerKg)}/kg</span></div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Masa simpan dan penanganan</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr] sm:items-start">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">Perkiraan masa tahan</p><p className="mt-1 text-2xl font-black text-slate-900">{shelfLife.duration}</p></div>
          <div><p className="text-sm leading-6 text-slate-600">{shelfLife.handling}</p>{commodity === "daging-ayam" && vehicleId !== "reefer" && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Gunakan truk berpendingin agar suhu produk terjaga selama pengiriman.</p>}</div>
        </div>
      </section>
    </div>
  );
}

export default function RedistributionDetailPage() {
  return <Suspense fallback={<div className="text-sm text-slate-500">Memuat rincian redistribusi…</div>}><RedistributionDetail /></Suspense>;
}
