"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { getAlertById, getAlerts } from "@/data/alerts";
import { getRedistributionData } from "@/data/redistribution";
import { commodities } from "@/data/commodities";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Truck,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Send,
  Lightbulb,
  Info,
  Gauge,
  BarChart3,
  Target,
  Check,
  FileText,
  Navigation,
  DollarSign,
  Weight,
  Printer,
  ExternalLink,
  Hourglass,
  CheckCircle,
  PlayCircle
} from "lucide-react";

const SEVERITY = {
  kritis: { label: "KRITIS", badge: "bg-rose-500 text-white", chip: "bg-rose-50 text-rose-600 border-rose-100" },
  tinggi: { label: "WARNING", badge: "bg-amber-500 text-white", chip: "bg-amber-50 text-amber-600 border-amber-100" },
  sedang: { label: "INFO", badge: "bg-sky-500 text-white", chip: "bg-sky-50 text-sky-600 border-sky-100" },
  rendah: { label: "INFO", badge: "bg-sky-500 text-white", chip: "bg-sky-50 text-sky-600 border-sky-100" },
} as const;

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const titleCase = (id: string) =>
  id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

type WorkflowStep = "alert_masuk" | "perencanaan" | "menunggu_approval" | "proses_redistribusi" | "selesai";

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = (params?.id as string) || "";
  const alert = getAlertById(alertId);

  // ================= STATES =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("alert_masuk");
  const [isWizardVisible, setIsWizardVisible] = useState(true);
  const [note, setNote] = useState("");
  const [officer, setOfficer] = useState("Tim TPID");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);

  // STATE TOAST NOTIFIKASI PRINT
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [savedLogs, setSavedLogs] = useState<{
    officer: string;
    note: string;
    time: string;
    selectedRouteObj?: {
      from: string;
      to: string;
      volume: number;
      distance: number;
      cost: number;
    };
  } | null>(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("userEmail") || localStorage.getItem("userEmail");
    if (savedEmail) {
      const namePart = savedEmail.includes("@") ? savedEmail.split("@")[0] : savedEmail;
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      setOfficer(formattedName);
    }
  }, []);

  const routes = alert ? getRedistributionData(alert.commodity).routes.slice(0, 4) : [];

  const handleSendApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    const chosenRoute = selectedRouteIndex !== null ? routes[selectedRouteIndex] : undefined;

    setCurrentStep("menunggu_approval");
    setSavedLogs({
      officer,
      note: note.trim(),
      time: "Baru saja diajukan",
      selectedRouteObj: chosenRoute
        ? {
          from: chosenRoute.from,
          to: chosenRoute.to,
          volume: chosenRoute.volume,
          distance: chosenRoute.distance,
          cost: chosenRoute.cost,
        }
        : undefined,
    });
    setIsModalOpen(false);
  };

  // Helper Simulasi Approval oleh Atasan
  const handleApproveByManager = () => {
    setCurrentStep("proses_redistribusi");
  };

  const handleCompleteProcess = () => {
    setCurrentStep("selesai");
  };

  // ================= NATIVE BROWSER PRINT GENERATOR =================
  const handleDownloadReport = () => {
    if (!alert) return;

    setIsDownloading(true);
    setShowDownloadToast(true);

    const commodityObj = commodities.find((c) => c.id === alert.commodity);
    const commodityTitle = commodityObj?.name ?? titleCase(alert.commodity);
    const unitName = commodityObj?.unit ?? "kg";
    const d = alert.detail;
    const up = alert.change >= 0;
    const snapshotDate = new Date(alert.timestamp).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const stepLabels: Record<WorkflowStep, string> = {
      alert_masuk: "Alert Masuk",
      perencanaan: "Perencanaan Tindak Lanjut",
      menunggu_approval: "Menunggu Approval Atasan",
      proses_redistribusi: "Proses Redistribusi Berjalan",
      selesai: "Selesai",
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan_Intervensi_${alert.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { 
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background: #ffffff; 
            color: #1e293b; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          ::-webkit-scrollbar { display: none; }
        </style>
      </head>
      <body class="p-6 space-y-6 max-w-[800px] mx-auto bg-white">
        
        <!-- Header -->
        <div class="border-b border-slate-200 pb-5 flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="bg-[#047857] text-white font-mono text-[10px] font-black px-2 py-0.5 rounded uppercase">
                Status: ${stepLabels[currentStep]}
              </span>
              <span class="font-mono text-xs text-slate-500 font-bold">${alert.id}</span>
              <span class="text-xs text-slate-400">• Snapshot: ${snapshotDate}</span>
            </div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">
              ${commodityTitle} — <span class="text-[#065F46]">${alert.region}</span>
            </h1>
          </div>
          <div class="flex gap-4 border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div>
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Proyeksi 3 Bln</p>
              <p class="text-xl font-black ${up ? "text-rose-600" : "text-emerald-600"}">
                ${up ? "+" : ""}${alert.change.toFixed(1)}%
              </p>
            </div>
            <div class="w-px bg-slate-200"></div>
            <div>
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Keyakinan</p>
              <p class="text-xl font-black text-slate-800">${alert.confidence}%</p>
            </div>
          </div>
        </div>

        <!-- Workflow Status Badge info in PDF -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 flex justify-between items-center">
          <span>Tahap Workflow Saat Ini: <strong>${stepLabels[currentStep]}</strong></span>
          <span class="font-mono text-[10px] text-slate-400">ID: ${alert.id}</span>
        </div>

        <!-- Intervention Log -->
        ${savedLogs
        ? `
          <div class="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-5 space-y-2 page-break-inside-avoid">
            <div class="flex justify-between items-center text-xs font-bold text-[#065f46]">
              <span>✓ Pengajuan Intervensi Petugas</span>
              <span class="font-mono text-[10px] text-slate-500">${savedLogs.time}</span>
            </div>
            <p class="text-sm text-slate-800 font-bold mt-2">Petugas/Unit: ${savedLogs.officer}</p>
            <p class="text-sm text-slate-700 italic">"${savedLogs.note}"</p>
            ${savedLogs.selectedRouteObj
          ? `
              <div class="pt-3 mt-3 border-t border-[#a7f3d0] text-xs font-semibold text-[#064e3b]">
                <p class="font-black mb-1 text-[#065f46]">Rute Redistribusi Diajukan:</p>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <p>• Beban: ${savedLogs.selectedRouteObj.volume.toLocaleString("id-ID")} Ton</p>
                  <p>• Rute: ${savedLogs.selectedRouteObj.from} → ${savedLogs.selectedRouteObj.to}</p>
                  <p>• Jarak: ${savedLogs.selectedRouteObj.distance.toLocaleString("id-ID")} km</p>
                  <p>• Estimasi Biaya: ${rupiah(savedLogs.selectedRouteObj.cost)}</p>
                </div>
              </div>
            `
          : ""
        }
          </div>
          `
        : ""
      }

        <!-- Analysis -->
        <div class="border border-slate-200 rounded-2xl p-5 bg-white space-y-2 page-break-inside-avoid shadow-sm">
          <h3 class="text-xs font-black font-mono uppercase text-slate-400 tracking-wider">Ringkasan Analisis Model</h3>
          <p class="text-sm text-slate-700 leading-relaxed text-justify">${d.recommendation}</p>
        </div>

        <!-- Metrics -->
        <div class="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 page-break-inside-avoid shadow-sm">
          <h3 class="text-xs font-black font-mono uppercase text-slate-400 tracking-wider">Sinyal & Indikator Model</h3>
          <div class="grid grid-cols-4 gap-4 mt-2">
            <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Harga Kini</p>
              <p class="text-sm font-black text-slate-800 mt-1">${rupiah(d.hargaKini)}<span class="text-[10px] font-normal text-slate-500">/${unitName}</span></p>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Prediksi 3 Bln</p>
              <p class="text-sm font-black text-slate-800 mt-1">${rupiah(d.hargaPrediksi)}<span class="text-[10px] font-normal text-slate-500">/${unitName}</span></p>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Persentil Historis</p>
              <p class="text-sm font-black text-slate-800 mt-1">${d.persentilHistoris.toFixed(0)}%</p>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <p class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Akurasi Model</p>
              <p class="text-sm font-black text-slate-800 mt-1">${(100 - d.mapeKomoditas).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pt-8 mt-8 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
          Dokumen Laporan Resmi Sistem SupplAi • Dicetak pada ${new Date().toLocaleString("id-ID")}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!alert) {
    return (
      <div className="max-w-[1600px] mx-auto font-sans py-16 text-center space-y-4">
        <p className="text-sm font-bold text-slate-500">
          Peringatan <span className="font-mono">{alertId}</span> tidak ditemukan.
        </p>
        <button
          onClick={() => router.push("/alerts")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006c4a] hover:text-[#005238] cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Kembali ke Alert Center
        </button>
      </div>
    );
  }

  // ================= DERIVED =================
  const sev = SEVERITY[alert.severity];
  const commodity = commodities.find((c) => c.id === alert.commodity);
  const commodityName = commodity?.name ?? titleCase(alert.commodity);
  const unit = commodity?.unit ?? "kg";
  const d = alert.detail;
  const up = alert.change >= 0;
  const accuracy = (100 - d.mapeKomoditas).toFixed(1);
  const snapshotDate = new Date(alert.timestamp).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const relatedAlerts = getAlerts({ commodity: alert.commodity }).alerts
    .filter((a) => a.id !== alert.id)
    .slice(0, 5);

  const stepWizard = [
    { title: "1. Analisis Prediktif", desc: "Proyeksi Tren Harga", path: `/dashboard?commodity=${alert.commodity}&region=${encodeURIComponent(alert.region)}&trigger=alert` },
    { title: "2. Peta Risiko Nasional", desc: "Sebaran Spasial Geografis", path: `/heatmap?commodity=${alert.commodity}&trigger=alert` },
    { title: "3. Optimasi Redistribusi", desc: "Eksekusi Rute Logistik", path: `/redistribusi?commodity=${alert.commodity}&trigger=alert` },
  ];

  // Logic untuk progress step visual di atas
  const stepsList = [
    { id: "alert_masuk", label: "Alert Masuk" },
    { id: "perencanaan", label: "Perencanaan" },
    { id: "menunggu_approval", label: "Menunggu Approval" },
    { id: "proses_redistribusi", label: "Proses Redistribusi" },
    { id: "selesai", label: "Selesai" },
  ];

  const getStepIndex = (s: WorkflowStep) => {
    switch (s) {
      case "alert_masuk": return 0;
      case "perencanaan": return 1;
      case "menunggu_approval": return 2;
      case "proses_redistribusi": return 3;
      case "selesai": return 4;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 max-w-[1600px] mx-auto font-sans pb-16 text-slate-800 relative"
    >
      {/* ================= TOAST POP-UP DOWNLOAD ================= */}
      <AnimatePresence>
        {showDownloadToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-2xl p-4 max-w-sm flex items-start gap-3"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
              <Printer className={`w-4 h-4 ${isDownloading ? "animate-bounce" : ""}`} />
            </div>
            <div className="flex-1 space-y-1">
              <h5 className="text-xs font-bold text-white">
                {isDownloading ? "Menyiapkan Dokumen..." : "Dokumen Siap Dicetak / Disimpan"}
              </h5>
              <p className="text-[11px] text-slate-300 leading-snug">
                Silakan pilih opsi <strong>"Save as PDF"</strong> pada jendela browser yang terbuka.
              </p>

              {!isDownloading && (
                <button
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline pt-1 cursor-pointer"
                >
                  <span>Jendela tidak terbuka? Tekan di sini</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDownloadToast(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= HEADER & BREADCRUMB ================= */}
      <div className="flex flex-col gap-2 border-b border-slate-200/60 pb-4">
        <button
          onClick={() => router.push("/alerts")}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#006c4a] transition-colors w-fit group cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Kembali ke Alert Center
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded-md tracking-wider transition-all duration-300 ${currentStep === "selesai" ? "bg-emerald-600 text-white" : sev.badge
                }`}>
                {currentStep === "selesai" ? "SELESAI" : currentStep === "menunggu_approval" ? "MENUNGGU APPROVAL" : sev.label}
              </span>
              <span className="font-mono text-[10px] text-slate-400">{alert.id}</span>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Snapshot • {snapshotDate}
              </div>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {commodityName} — <span className="text-[#065F46]">{alert.region}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className={`border rounded-2xl px-5 py-3 flex items-center gap-4 shrink-0 shadow-2xs ${up ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
              <div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Proyeksi 3 Bulan</p>
                <p className={`text-2xl font-black tracking-tight ${up ? "text-rose-600" : "text-emerald-600"}`}>
                  {up ? "+" : ""}${alert.change.toFixed(1)}%
                </p>
              </div>
              <div className={`w-px h-8 ${up ? "bg-rose-200" : "bg-emerald-200"}`} />
              <div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Keyakinan Model</p>
                <p className="text-sm font-extrabold text-slate-700">{alert.confidence}%</p>
              </div>
            </div>

            {/* TOMBOL AKSI BERDASARKAN WORKFLOW */}
            {currentStep === "alert_masuk" || currentStep === "perencanaan" ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-4 rounded-2xl text-xs font-black shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer bg-[#006c4a] hover:bg-[#005238] text-white active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" /> Tindak Lanjuti
              </button>
            ) : (
              <button
                onClick={handleDownloadReport}
                className="px-5 py-4 rounded-2xl text-xs font-black shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer bg-[#006c4a] hover:bg-[#005238] text-white active:scale-95"
              >
                <Printer className="w-4 h-4" /> Cetak / Save PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= PROGRESS BAR / WORKFLOW INDICATOR ================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Progres Workflow Mitigasi</span>
          <span className="text-[11px] font-mono text-[#006c4a] uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            Tahap: {stepsList[currentIndex].label}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 relative">
          {stepsList.map((step, idx) => {
            const isPassed = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={step.id} className="space-y-1.5 text-center">
                <div className={`h-2 rounded-full transition-all duration-300 ${isPassed ? "bg-[#006c4a]" : "bg-slate-100"
                  }`} />
                <p className={`text-[10px] font-bold leading-tight truncate ${isCurrent ? "text-slate-900 font-black" : isPassed ? "text-slate-600" : "text-slate-400"
                  }`}>
                  {idx + 1}. {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Panel Simulasi Tindakan Atasan / Lanjutan (Opsional untuk mempermudah testing UI) */}
        {currentStep === "menunggu_approval" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800">
              <Hourglass className="w-4 h-4 shrink-0 animate-spin" />
              <span>Menunggu persetujuan rencana tindak lanjut dari atasan/manajemen.</span>
            </div>
            <button
              onClick={handleApproveByManager}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors cursor-pointer shrink-0"
            >
              Simulasi Approve (Atasan)
            </button>
          </div>
        )}

        {currentStep === "proses_redistribusi" && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-sky-800">
              <PlayCircle className="w-4 h-4 shrink-0" />
              <span>Logistik dan rute redistribusi sedang dieksekusi di lapangan.</span>
            </div>
            <button
              onClick={handleCompleteProcess}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold transition-colors cursor-pointer shrink-0"
            >
              Tandai Selesai
            </button>
          </div>
        )}
      </div>

      {/* ================= INTERVENTION LOG / SUBMISSION STATUS ================= */}
      <AnimatePresence>
        {savedLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`border rounded-2xl p-5 space-y-2 overflow-hidden shadow-2xs ${currentStep === "selesai" ? "bg-emerald-50/70 border-emerald-200" : "bg-amber-50/70 border-amber-200"
              }`}
          >
            <div className={`flex items-center justify-between text-xs font-bold ${currentStep === "selesai" ? "text-emerald-800" : "text-amber-800"}`}>
              <div className="flex items-center gap-1.5">
                {currentStep === "selesai" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Hourglass className="w-4 h-4 text-amber-600" />}
                <span>{currentStep === "selesai" ? "Mitigasi & Redistribusi Selesai" : "Pengajuan Intervensi Terkirim (Menunggu Approval)"}</span>
              </div>
              <span className="font-mono font-medium text-slate-400">{savedLogs.time}</span>
            </div>
            <div className="text-xs text-slate-600 bg-white/80 border p-3 rounded-xl leading-relaxed flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-700 mb-0.5">Petugas Pengaju: {savedLogs.officer}</p>
                <p className="font-medium">Catatan: &quot;{savedLogs.note}&quot;</p>
              </div>
              <button
                onClick={handleDownloadReport}
                className="text-[11px] font-bold text-[#006c4a] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Unduh Laporan PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= CONTENT GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* RINGKASAN MODEL */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-black font-mono uppercase tracking-wider text-slate-400 mb-2.5">Ringkasan Analisis Model</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
              {d.recommendation}
            </p>
          </div>

          {/* RUTE REDISTRIBUSI YANG DIAJUKAN (JIKA ADA) */}
          {savedLogs?.selectedRouteObj && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="w-5 h-5 text-[#006c4a]" />
                <h3 className="text-base font-bold text-slate-800">Rute Redistribusi Diajukan</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Weight className="w-4 h-4 text-[#006c4a]" />
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Beban Volume</p>
                  </div>
                  <p className="text-base font-black text-slate-800">{savedLogs.selectedRouteObj.volume.toLocaleString("id-ID")} Ton</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Navigation className="w-4 h-4 text-[#006c4a]" />
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Rute Logistik</p>
                  </div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{savedLogs.selectedRouteObj.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#006c4a] shrink-0" />
                    <span>{savedLogs.selectedRouteObj.to}</span>
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-4 h-4 text-[#006c4a]" />
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Jarak Tempuh</p>
                  </div>
                  <p className="text-base font-black text-slate-800">{savedLogs.selectedRouteObj.distance.toLocaleString("id-ID")} km</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#006c4a]" /> Estimasi Biaya Redistribusi
                </span>
                <span className="font-mono font-black text-sm text-[#006c4a]">{rupiah(savedLogs.selectedRouteObj.cost)}</span>
              </div>
            </div>
          )}

          {/* SINYAL MODEL */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-5 h-5 text-[#006c4a]" />
              <h3 className="text-base font-bold text-slate-800">Sinyal Model</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006c4a] flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase mt-1">Harga Kini</p>
                <p className="text-sm font-black text-slate-800">{rupiah(d.hargaKini)}<span className="text-[10px] font-normal text-slate-400">/{unit}</span></p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${up ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase mt-1">Prediksi 3 Bln</p>
                <p className="text-sm font-black text-slate-800">{rupiah(d.hargaPrediksi)}<span className="text-[10px] font-normal text-slate-400">/{unit}</span></p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Target className="w-4 h-4" /></div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase mt-1">Persentil Historis</p>
                <p className="text-sm font-black text-slate-800">{d.persentilHistoris.toFixed(0)}%</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><Gauge className="w-4 h-4" /></div>
                <p className="text-[10px] font-bold font-mono text-slate-400 uppercase mt-1">Akurasi Model</p>
                <p className="text-sm font-black text-slate-800">{accuracy}%<span className="text-[10px] font-normal text-slate-400"> · MAPE {d.mapeKomoditas}%</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${d.diAtasHet ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                {d.diAtasHet ? "Prediksi di atas HAP/HET" : "Prediksi di bawah HAP/HET"}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${d.anomaliTerkonfirmasi ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                {d.anomaliTerkonfirmasi ? "Anomali terkonfirmasi" : "Tanpa anomali historis"}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border bg-slate-50 text-slate-500 border-slate-100">
                Model: horizon 3 bulan
              </span>
            </div>
          </div>

          {/* REKOMENDASI REDISTRIBUSI */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Rekomendasi Redistribusi — {commodityName}</h3>
            </div>
            {routes.length > 0 ? (
              <div className="space-y-2.5">
                {routes.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-xl shadow-3xs">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Truck className="w-4 h-4" /></div>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed flex-1">
                      Kirim <span className="font-black text-slate-800">{r.volume.toLocaleString("id-ID")} ton</span> dari{" "}
                      <span className="font-bold">{r.from}</span> <ArrowRight className="inline w-3 h-3" /> <span className="font-bold">{r.to}</span>
                      <span className="text-slate-400"> · {r.distance.toLocaleString("id-ID")} km · {rupiah(r.cost)}</span>
                    </p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${r.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-100" :
                        r.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-slate-50 text-slate-500 border-slate-100"
                      }`}>{r.priority}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">Tidak ada rute redistribusi yang diusulkan untuk komoditas ini.</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-[#006c4a]" />
              <h3 className="text-base font-bold text-slate-800">Wilayah Lain — {commodityName}</h3>
            </div>
            {relatedAlerts.length > 0 ? (
              <div className="space-y-2">
                {relatedAlerts.map((a) => {
                  const s = SEVERITY[a.severity];
                  const rUp = a.change >= 0;
                  return (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/alerts/${a.id}`)}
                      className="w-full text-left p-3 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between gap-4 hover:bg-slate-100/60 transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <h5 className="text-xs font-bold text-slate-800 truncate">{a.region}</h5>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.chip}`}>{s.label}</span>
                      </div>
                      <p className={`text-xs font-mono font-black shrink-0 ${rUp ? "text-rose-600" : "text-emerald-600"}`}>
                        {rUp ? "+" : ""}{a.change.toFixed(1)}%
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">Tidak ada peringatan lain untuk komoditas ini.</p>
            )}
          </div>
        </div>

      </div>

      {/* ================= FLOW WIZARD ================= */}
      <AnimatePresence>
        {isWizardVisible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, y: 15 }}
            className="bg-sky-50/70 border border-sky-200 text-slate-700 rounded-2xl p-6 shadow-sm space-y-5 relative overflow-hidden mt-6"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between gap-4 border-b border-sky-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 rounded-xl text-sky-700"><Info className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-sky-900 tracking-tight">Alur Mitigasi SupplAi</h3>
                  <p className="text-xs text-sky-700/80 font-medium mt-0.5">Lanjutkan analisis {commodityName} lintas modul.</p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardVisible(false)}
                className="p-1.5 bg-white border border-sky-200 hover:bg-sky-100/50 rounded-xl text-sky-800 transition-colors cursor-pointer relative z-20"
                title="Sembunyikan panduan"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {stepWizard.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => router.push(step.path)}
                  className="bg-white/80 border border-sky-200/60 p-4 rounded-xl flex items-start gap-3 hover:border-sky-400 hover:bg-white cursor-pointer transition-all duration-200 group text-left w-full outline-none shadow-3xs"
                >
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-mono font-black shrink-0 border border-sky-200 transition-colors group-hover:bg-sky-600 group-hover:text-white group-hover:border-transparent">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-sky-900 truncate group-hover:text-sky-700 transition-colors">{step.title}</h4>
                      <ArrowRight className="w-3.5 h-3.5 text-sky-500 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ACTION MODAL (KIRIM PENGAJUAN) ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden text-slate-800"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#006c4a]">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Pengajuan Rencana Tindak Lanjut</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSendApproval} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Petugas Pengaju / Unit</label>
                  <input
                    type="text"
                    value={officer}
                    onChange={(e) => setOfficer(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#006c4a] focus:bg-white transition-all"
                  />
                </div>

                {/* PILIHAN REKOMENDASI REDISTRIBUSI */}
                {routes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Pilih Rekomendasi Redistribusi (Opsional)</span>
                      {selectedRouteIndex !== null && (
                        <button
                          type="button"
                          onClick={() => setSelectedRouteIndex(null)}
                          className="text-[10px] text-rose-500 hover:underline capitalize"
                        >
                          Batal Pilih
                        </button>
                      )}
                    </label>
                    <div className="space-y-2">
                      {routes.map((r, idx) => {
                        const isSelected = selectedRouteIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedRouteIndex(isSelected ? null : idx)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${isSelected
                                ? "bg-emerald-50 border-[#006c4a] ring-1 ring-[#006c4a]"
                                : "bg-slate-50 border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "bg-[#006c4a] border-[#006c4a] text-white" : "border-slate-300 bg-white"
                                  }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <p className="font-semibold text-slate-700 truncate">
                                Kirim <span className="font-bold text-slate-900">{r.volume.toLocaleString("id-ID")} ton</span> dari{" "}
                                <span className="font-bold">{r.from}</span> → <span className="font-bold">{r.to}</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{rupiah(r.cost)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Rencana Tindak Lanjut</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    required
                    placeholder={`Contoh: tinjau rute redistribusi ${commodityName} dan koordinasikan dengan TPID ${alert.region}.`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#006c4a] focus:bg-white transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-[#006c4a] hover:bg-[#005238] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-97 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}