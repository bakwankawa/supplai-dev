"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { AlertResponse } from "@/lib/types";
import { AlertFilters } from "@/components/alerts/alert-filters";
import { AlertCard, AlertData } from "@/components/alerts/alert-card";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
} as const;

const ITEMS_PER_PAGE = 5; // Jumlah alert per halaman

export default function AlertsPage() {
  const [severity, setSeverity] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [commodity, setCommodity] = useState<string | null>(null);

  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  const query = commodity ? `?commodity=${commodity}` : "";
  const { data, loading, error, refetch } = useApi<AlertResponse>(`/api/alerts${query}`);

  // A failed load has no alert list in it. The cards below describe alerts
  // that are current right now — rendering yesterday's fetch under a header
  // that just failed to refresh would say "still true" about data that was
  // never confirmed. See /redistribusi's `gagalMuat` for the same reasoning.
  const gagalMuat = error ? error.message : null;

  useEffect(() => {
    const handleGlobalRefresh = () => refetch?.();
    window.addEventListener("global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("global-refresh", handleGlobalRefresh);
  }, [refetch]);

  const [alertsList, setAlertsList] = useState<AlertData[]>([]);

  useEffect(() => {
    // No payload — either nothing has arrived yet, or a refetch just failed
    // and cleared it. Either way, stale cards from a previous successful
    // load must not keep sitting on screen looking current.
    if (!data?.alerts) {
      setAlertsList([]);
      return;
    }
    const sevMap: Record<string, AlertData["severity"]> = {
      kritis: "CRITICAL", tinggi: "WARNING", sedang: "INFO", rendah: "INFO",
    };
    setAlertsList(
      data.alerts.map((a) => ({
        id: a.id,
        severity: sevMap[a.severity] ?? "INFO",
        type: a.change >= 0 ? "PRICE SURGE" : "SUPPLY DROP",
        title: a.commodity
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        location: a.region,
        delta: `${a.change >= 0 ? "+" : ""}${a.change.toFixed(1)}%`,
        updated: "Snapshot",
      }))
    );
  }, [data]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [severity, status, commodity]);

  // Filter client-side berdasarkan severity
  const displayedAlerts = useMemo(
    () => alertsList.filter((item) => !severity || item.severity === severity),
    [alertsList, severity]
  );

  // Kalkulasi Pagination
  const totalPages = Math.ceil(displayedAlerts.length / ITEMS_PER_PAGE) || 1;
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedAlerts.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedAlerts, currentPage]);

  const handleDismissAlert = (id: string | number) => {
    setAlertsList(prev => prev.filter(alert => alert.id !== id));
    toast.info(`Peringatan #${id} berhasil disembunyikan dari antrean.`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-[1600px] mx-auto font-sans text-slate-800 pb-12"
    >
      {/* ================= HEADER SECTION ================= */}
      <motion.div variants={itemVariants} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-200/50 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#065F46]">Alerts</h1>
          {/* Panel harganya bulanan, bukan aliran realtime. Subjudul menyebut
              cadence dan cakupan yang benar-benar dimiliki data ini. */}
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Pembacaan peringatan dini bulanan atas enam komoditas strategis di 34 provinsi.
          </p>
        </div>
      </motion.div>

      {/* ================= LOAD FAILURE (NOT ZERO ALERTS) ================= */}
      {gagalMuat ? (
        <motion.div
          variants={itemVariants}
          className="bg-white border border-rose-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-2 border-b border-rose-100 pb-4 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-lg font-bold text-slate-800">Daftar alert gagal dimuat</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Permintaan ke <span className="font-mono">/api/alerts</span> untuk filter komoditas{" "}
            <span className="font-bold">{commodity ?? "Semua Komoditas"}</span> tidak berhasil:{" "}
            <span className="font-bold text-rose-700">{gagalMuat}</span>
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            Halaman ini sengaja tidak menampilkan statistik atau kartu alert sampai jawaban
            diterima. Nol alert di sini bukan berarti tidak ada alert — artinya jawaban dari
            server belum sampai.
          </p>
        </motion.div>
      ) : (
        /* ================= SUMMARY STATS ROW ================= */
        /* Hanya dua kartu yang punya sumber data. "Rata-rata Respons" dan
           "Terselesaikan" dihapus: produk ini tidak mengukur waktu respons
           dan tidak menutup kasus distribusi, jadi tidak ada versi jujurnya. */
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Alert Aktif", value: displayedAlerts.length, color: "text-rose-600", icon: Bell },
            { label: "Alert Bulan Ini", value: data?.summary.thisMonth, color: "text-slate-800", icon: AlertTriangle },
          ].map((card, idx) => (
            <Card key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs">
              <CardContent className="p-0 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <card.icon className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold tracking-wider uppercase font-mono">{card.label}</span>
                </div>
                <p className={`text-3xl font-black tracking-tight ${card.color}`}>
                  {loading ? (
                    <span className="h-8 w-16 bg-slate-100 animate-pulse rounded inline-block" />
                  ) : card.value === undefined ? (
                    /* Tanpa angka dari server, tampilkan tanda hubung — bukan
                       angka bawaan yang terlihat masuk akal tapi dikarang. */
                    <span className="text-slate-300">&mdash;</span>
                  ) : (
                    <AnimatedNumber value={card.value} />
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* ================= FILTERS SECTION ================= */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 font-mono uppercase">Filter Peringatan</h2>
        <AlertFilters
          severity={severity}
          status={status}
          commodity={commodity}
          onSeverityChange={setSeverity}
          onStatusChange={setStatus}
          onCommodityChange={setCommodity}
        />
      </motion.div>

      {/* ================= LIST EMERGENCY CARDS WITH PAGINATION ================= */}
      <motion.div variants={itemVariants}>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[520px] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
                <h3 className="text-lg font-bold text-slate-800">Active Emergency Alerts</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {gagalMuat ? "Total: — " : `Total: ${displayedAlerts.length} Item`}
              </span>
            </div>

            {gagalMuat ? (
              <div className="text-center py-16 space-y-1.5">
                <p className="text-xs font-bold text-rose-600">Kartu alert gagal dimuat.</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-md mx-auto">
                  {gagalMuat} Ini kegagalan pengambilan data, bukan pernyataan bahwa tidak
                  ada alert darurat aktif.
                </p>
              </div>
            ) : paginatedAlerts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-medium text-xs">
                Tidak ada alert darurat aktif untuk filter ini.
              </div>
            ) : (
              /* KUNCI SMOOTH: Gunakan mode="wait" agar halaman lama selesai slide-out dulu baru halaman baru slide-in */
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage} // Menggunakan currentPage sebagai key agar animasi ter-trigger saat ganti page
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex flex-col gap-3"
                >
                  {paginatedAlerts.map((alertItem) => (
                    <AlertCard
                      key={alertItem.id}
                      alert={alertItem}
                      onDismiss={handleDismissAlert}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* BARIS KONTROL PAGINATION */}
          {displayedAlerts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500 font-mono">
                Menampilkan <span className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, displayedAlerts.length)}</span> dari <span className="font-bold text-slate-800">{displayedAlerts.length}</span> alert
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-xl border-slate-200 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${currentPage === pageNum
                      ? "bg-[#006c4a] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-xl border-slate-200 cursor-pointer disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}