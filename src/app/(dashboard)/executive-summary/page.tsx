"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TopCards } from "@/components/executive-summary/top-cards";
import { ShortcutCards } from "@/components/executive-summary/shortcut-cards";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import {
  Download,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Database,
  ShieldAlert,
  CheckCircle2,
  Truck
} from "lucide-react";

// IMPOR HOOK API REAL & TYPE
import { useApi } from "@/hooks/use-api";
import { AlertResponse } from "@/lib/types";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell
} from "recharts";

const transitionSmooth = { type: "spring", stiffness: 100, damping: 15 } as const;

export default function ExecutiveSummaryPage() {
  const router = useRouter();

  // 1. KONSUMSI API REAL /api/alerts
  const { data: alertResponse, loading } = useApi<AlertResponse>("/api/alerts");

  // 2. HITUNG JUMLAH ALERT KRITIS AKTIF
  const activeAlertsCount = useMemo(() => {
    if (!alertResponse?.alerts) return 0;
    return alertResponse.alerts.filter((a) => a.severity === "kritis" || a.severity === "tinggi").length;
  }, [alertResponse]);

  // The banner used to announce a national crisis unconditionally, badge and
  // all — so a month with only watch-level alerts rendered a red "Anomali
  // Pasokan Skala Nasional Terdeteksi" next to the words "0 Peringatan Aktif".
  // Let the severity that is actually present pick the wording.
  const totalAlertsCount = alertResponse?.alerts?.length ?? 0;
  const isUrgent = activeAlertsCount > 0;
  const topAlert = alertResponse?.alerts?.[0];

  // 3. OLAH DATA REAL DARI API UNTUK GRAFIK BAR CHART
  const komoditasOverviewData = useMemo(() => {
    if (!alertResponse?.alerts || alertResponse.alerts.length === 0) return [];

    // One bar per commodity, not per alert. Taking the top 5 alerts outright
    // drew the same commodity several times — four bars all labelled "Bawang
    // Putih" — because alerts are ranked by severity and one commodity can
    // hold several of the top slots. Keep each commodity's most severe alert.
    const perCommodity = new Map<string, (typeof alertResponse.alerts)[number]>();
    for (const a of alertResponse.alerts) {
      if (!perCommodity.has(a.commodity)) perCommodity.set(a.commodity, a);
    }

    return Array.from(perCommodity.values()).slice(0, 6).map((alertItem) => {
      const isCritical = alertItem.severity === "kritis";
      const isWarning = alertItem.severity === "tinggi";

      const formattedName = alertItem.commodity
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      return {
        name: formattedName,
        price: alertItem.detail.hargaKini,
        change: alertItem.change,
        status: isCritical ? "CRITICAL" : isWarning ? "WARNING" : "STABLE",
        fill: isCritical ? "#e11d48" : isWarning ? "#d97706" : "#006c4a",
      };
    });
  }, [alertResponse]);

  // Handler cetak dokumen ringkasan dashboard
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-slate-800 printable-summary">

      {/* STYLE CETAK NATIVE PADA HALAMAN RINGKASAN */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-summary, .printable-summary * { visibility: visible; }
          .printable-summary { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print-btn { display: none !important; }
        }
      `}</style>

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Executive Summary</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            National Food Security Intelligence Control Center
          </p>
        </div>

        <div className="flex items-center gap-3 no-print-btn">
          <Button
            onClick={handlePrintSummary}
            variant="outline"
            size="default"
            className="flex items-center gap-2 font-bold border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-3xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Summary
          </Button>

          <Button
            variant="default"
            size="default"
            className="flex items-center gap-2 font-bold bg-[#006c4a] hover:bg-[#005238] text-white rounded-xl shadow-sm transition-all cursor-default"
          >
            <Calendar className="w-4 h-4" />
            Juli 2026
          </Button>
        </div>
      </div>

      {/* ================= CRITICAL SYSTEM ALERT ANCHOR BANNER (REAL DATA) ================= */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionSmooth}
        onClick={() => router.push("/alerts")}
        className={`${isUrgent ? "bg-rose-50 border-rose-200 hover:bg-rose-100/60" : "bg-amber-50 border-amber-200 hover:bg-amber-100/60"} border rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs cursor-pointer transition-colors group`}
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 ${isUrgent ? "bg-rose-600 animate-pulse" : "bg-amber-500"} text-white rounded-xl shrink-0`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className={`text-sm font-black ${isUrgent ? "text-rose-900" : "text-amber-900"} tracking-tight flex items-center gap-2`}>
              {isUrgent ? "Anomali Pasokan Skala Nasional Terdeteksi" : "Pemantauan Harga Aktif"}
              <span className={`${isUrgent ? "bg-rose-600" : "bg-amber-500"} text-white text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md uppercase`}>
                {loading ? "..." : isUrgent ? `${activeAlertsCount} Peringatan Aktif` : `${totalAlertsCount} Wilayah Dipantau`}
              </span>
            </h4>
            <p className={`text-xs font-semibold ${isUrgent ? "text-rose-700/90" : "text-amber-800/90"} mt-0.5 leading-relaxed`}>
              {loading ? (
                "Memuat data peringatan dini..."
              ) : topAlert ? (
                <>
                  {isUrgent ? "Krisis harga komoditas " : "Kenaikan harga komoditas "}
                  <span className="underline font-bold">
                    {topAlert.commodity.split("-").join(" ")} ({topAlert.change >= 0 ? "+" : ""}{topAlert.change.toFixed(1)}%)
                  </span>{" "}
                  di wilayah {topAlert.region}{" "}
                  {isUrgent
                    ? "memerlukan intervensi pasar segera."
                    : "berada di atas ambang pantau, belum mencapai tingkat kritis."}{" "}
                  Klik untuk membuka Alert Center.
                </>
              ) : (
                "Tidak ada wilayah yang melewati ambang pantau."
              )}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${isUrgent ? "text-rose-700" : "text-amber-800"} group-hover:translate-x-1 transition-transform shrink-0`}>
          {isUrgent ? "Tindak Lanjuti Krisis" : "Lihat Alert Center"}
          <ArrowRight className="w-4 h-4" />
        </div>
      </motion.div>

      {/* ================= TOP METRICS CARDS INTEGRATION ================= */}
      <TopCards />

      {/* ================= CENTER MONITORING GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL A: MACRO COMMODITY TRACKER (GRAFIK REAL) */}
        <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 flex flex-col justify-between shadow-xs min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#006c4a]" />
                Peta Indeks Harga Baseline Strategis
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Rangkuman harga pasar komoditas utama nasional (Data Realtime API).</p>
            </div>
            <div className="flex gap-1.5 text-[10px] font-mono font-bold shrink-0">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">Kritis</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">Waspada</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Aman</span>
            </div>
          </div>

          {/* Visualisasi Grafik Komparasi Komoditas Real API */}
          <div className="flex-1 w-full h-[300px] pt-3 flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full animate-pulse bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400 font-mono">
                Memuat Grafik Realtime...
              </div>
            ) : komoditasOverviewData.length === 0 ? (
              <div className="text-xs text-slate-400 font-medium">Data komoditas tidak ditemukan.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={komoditasOverviewData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#94a3b8" style={{ fontSize: "11px", fontWeight: "600" }} />
                  <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `Rp ${v.toLocaleString()}`} style={{ fontSize: "10px", fontFamily: "monospace" }} />
                  <RechartsTooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString("id-ID")}/kg`, "Harga Pasar"]} contentStyle={{ borderRadius: "var(--radius-lg)" }} />
                  <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={38}>
                    {komoditasOverviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PANEL B: INTEGRATED REALTIME INCIDENT LOGS */}
        <div className="border border-slate-200 bg-white rounded-2xl p-6 flex flex-col shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#006c4a]" />
                Log Aktivitas Rantai Suplai
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Sinkronisasi anomali logistik & warkat pasar.</p>
            </div>
            <span
              onClick={() => router.push("/alerts")}
              className="text-xs font-bold text-[#006c4a] hover:text-[#005238] cursor-pointer transition-colors shrink-0"
            >
              Lihat Semua
            </span>
          </div>

          {/* Rentetan Log Operasional Terintegrasi Ringkasan API */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {[
              { time: "Snapshot", type: "WARNING", msg: `${alertResponse?.summary?.thisMonth ?? 182} wilayah berstatus pantauan aktif`, icon: ShieldAlert, bg: "bg-amber-50 text-amber-600 border-amber-100" },
              { time: "Snapshot", type: "INFO", msg: `${alertResponse?.summary?.resolved ?? 168} isu distribusi berhasil diselesaikan`, icon: AlertTriangle, bg: "bg-sky-50 text-sky-600 border-sky-100" },
              { time: "Snapshot", type: "MODEL", msg: "204 seri komoditas-provinsi dimodelkan bulanan", icon: Truck, bg: "bg-slate-50 text-slate-600 border-slate-100" },
              { time: "Snapshot", type: "AKURASI", msg: `Rata-rata respons sistem: ${alertResponse?.summary?.avgResponseTime ?? 14} menit`, icon: CheckCircle2, bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
            ].map((log, idx) => {
              const LogIcon = log.icon;
              return (
                <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex items-start gap-3 hover:bg-slate-100/50 transition-colors">
                  <div className={`p-2 rounded-lg border shrink-0 ${log.bg}`}>
                    <LogIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">{log.type}</span>
                      <span className="text-[9px] font-mono text-slate-400">{log.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-tight truncate">{log.msg}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION: SMART NAVIGATION LINKS ================= */}
      <ShortcutCards />

    </div>
  );
}