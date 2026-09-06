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
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  MessageSquare,
  Calendar,
  ChevronDown,
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const liveTransmissionLogs = [
  { time: "22:30:14", text: "Delivered: Email to Gov. Office (Surabaya)" },
  { time: "22:30:09", text: "Price Spike Alert (Chili) to TPID Jabar" },
  { time: "22:30:04", text: "System Broadcast to 542 Officers" },
  { time: "22:29:59", text: "Delivered: Email to Gov. Office (Surabaya)" },
  { time: "22:29:55", text: "System Broadcast to 542 Officers" },
];

const tpidPerformance = [
  { rank: "#1", name: "TPID Special Region of Yogyakarta", lead: "Regional Lead: Sri Sultan HB X", alerts: 42, response: "14m 22s", rate: 99, status: "EXEMPLARY" },
  { rank: "#2", name: "TPID East Java", lead: "Regional Lead: Khofifah I.P.", alerts: 88, response: "18m 05s", rate: 94, status: "EXEMPLARY" },
  { rank: "#3", name: "TPID DKI Jakarta", lead: "Regional Lead: Heru Budi Hartono", alerts: 112, response: "22m 45s", rate: 91, status: "STANDARD" },
  { rank: "#542", name: "TPID North Maluku", lead: "Regional Lead: Abdul Ghani Kasuba", alerts: 14, response: "4h 12m 30s", rate: 42, status: "CRITICAL LAG" },
];

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

  // State Dropdown Filter Tanggal TPID
  const [isTpidRangeOpen, setIsTpidRangeOpen] = useState(false);
  const [tpidSelectedRange, setTpidSelectedRange] = useState("7");
  const tpidRanges = [
    { id: "7", label: "7 Hari Terakhir" },
    { id: "14", label: "14 Hari Terakhir" },
    { id: "30", label: "30 Hari Terakhir" },
    { id: "90", label: "Triwulan Berjalan (3 Bulan)" }
  ];

  const query = commodity ? `?commodity=${commodity}` : "";
  const { data, loading, refetch } = useApi<AlertResponse>(`/api/alerts${query}`) as {
    data: AlertResponse | null;
    loading: boolean;
    refetch: () => void;
  };

  useEffect(() => {
    const handleGlobalRefresh = () => refetch?.();
    window.addEventListener("global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("global-refresh", handleGlobalRefresh);
  }, [refetch]);

  const [alertsList, setAlertsList] = useState<AlertData[]>([]);

  useEffect(() => {
    if (!data?.alerts) return;
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
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Real-time early warning system monitoring strategic food commodities across regions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#E6F4EA] border border-emerald-200 rounded-md px-4 py-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-800 font-mono uppercase">
              LIVE MONITORING ACTIVE
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= SUMMARY STATS ROW ================= */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Alert Aktif", value: displayedAlerts.length, color: "text-rose-600", icon: Bell },
          { label: "Alert Bulan Ini", value: data?.summary.thisMonth ?? 182, color: "text-slate-800", icon: AlertTriangle },
          { label: "Rata-rata Respons", value: data?.summary.avgResponseTime ?? 14, color: "text-slate-800", icon: Clock, suffix: "m" },
          { label: "Terselesaikan", value: data?.summary.resolved ?? 168, color: "text-emerald-600", icon: CheckCircle2 },
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
                ) : (
                  <>
                    <AnimatedNumber value={card.value} />
                    {card.suffix && <span className="text-sm font-normal text-slate-400 ml-0.5">{card.suffix}</span>}
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

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

      {/* ================= MAIN GRID ================= */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* SISI KIRI: LIST EMERGENCY CARDS WITH PAGINATION */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[520px] flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800">Active Emergency Alerts</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Total: {displayedAlerts.length} Item
                </span>
              </div>

              {paginatedAlerts.length === 0 ? (
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
        </div>

        {/* SISI KANAN: CONSOLE LOG */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-full flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-700">Sender Console</h3>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono">LIVE</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 block font-mono">TOTAL OFFICERS</span>
                  <span className="text-xl font-black text-slate-700">542</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 block font-mono">ACTIVE QUEUE</span>
                  <span className="text-xl font-black text-emerald-600">18</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-100 rounded-xl p-3 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold leading-tight">WhatsApp Direct</h5>
                      <p className="text-[10px] text-slate-400">98.2% Delivery Rate</p>
                    </div>
                  </div>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-[#006c4a] h-full" style={{ width: "98%" }} />
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold leading-tight">Priority Email</h5>
                      <p className="text-[10px] text-slate-400">99.5% Delivery Rate</p>
                    </div>
                  </div>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: "99%" }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="text-[9px] font-black tracking-wider text-slate-400 font-mono uppercase block mb-3">
                  LIVE TRANSMISSION LOG
                </span>
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {liveTransmissionLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2.5 text-[10px] font-mono leading-relaxed">
                      <span className="text-slate-400 font-medium">{log.time}</span>
                      <span className="text-slate-600 font-bold">{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full text-xs font-bold border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer">
              Detailed Delivery Report
            </Button>
          </div>
        </div>

      </motion.div>

      {/* ================= BOTTOM SECTION: PERFORMANCE PANEL ================= */}
      <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">TPID Response Performance</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Time from system notification to market operation confirmation.
            </p>
          </div>

          <div className="relative">
            <div
              onClick={() => setIsTpidRangeOpen(!isTpidRangeOpen)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:border-slate-300 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{tpidRanges.find(r => r.id === tpidSelectedRange)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <AnimatePresence>
              {isTpidRangeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-64 p-1 z-50 space-y-0.5"
                >
                  {tpidRanges.map(range => (
                    <div
                      key={range.id}
                      onClick={() => { setTpidSelectedRange(range.id); setIsTpidRangeOpen(false); }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${tpidSelectedRange === range.id ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {range.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 font-mono uppercase">
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">REGION / TPID UNIT</th>
                <th className="py-3 px-4 text-center">ALERTS (MTD)</th>
                <th className="py-3 px-4 text-center">AVG RESPONSE TIME</th>
                <th className="py-3 px-4">EXECUTION RATE</th>
                <th className="py-3 px-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {tpidPerformance.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className={`py-4 px-4 font-black font-mono text-base ${row.rank.startsWith("#1") ? "text-[#006c4a]" : "text-red-700"}`}>
                    {row.rank}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${row.rank.startsWith("#1") ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800">{row.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{row.lead}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-bold">{row.alerts}</td>
                  <td className={`py-4 px-4 text-center font-mono font-bold ${row.status === "EXEMPLARY" ? "text-[#006c4a]" : "text-red-600"}`}>
                    {row.response}
                  </td>
                  <td className="py-4 px-4 w-[200px]">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] block font-bold text-slate-400">{row.rate}%</span>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.rate >= 90 ? "bg-[#006c4a]" : "bg-red-600"}`}
                          style={{ width: `${row.rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black font-mono tracking-wider ${row.status === "EXEMPLARY"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : row.status === "STANDARD"
                        ? "bg-slate-50 text-slate-700 border border-slate-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}