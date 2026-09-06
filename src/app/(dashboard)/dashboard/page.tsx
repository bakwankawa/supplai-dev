"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { motion, AnimatePresence } from "motion/react";
import { Popover } from "@base-ui/react/popover";

import { commodities } from "@/data/commodities";
import { regionalComparisonMaster } from "@/data/regional-data";
import { generatedTimeSeriesMaster } from "@/data/prediction-chart";
import { analyzePrediction, monthLabel } from "@/lib/prediction/analysis";
import { PredictionNarrative } from "@/components/dashboard/prediction-narrative";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine
} from "recharts";
import {
  Download,
  Sliders,
  AlertTriangle,
  Calendar,
  MapPin,
  X,
  Plus,
  Search,
  Info
} from "lucide-react";

const ThinChevron = () => (
  <svg
    className="w-3.5 h-3.5 text-slate-400 opacity-80"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const cardContainerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 14 } }
} as const;


// Date bounds derived from the real monthly data so the default window and the
// range shortcuts stay correct across re-exports (data is a snapshot).
const ALL_POINTS = Object.values(generatedTimeSeriesMaster).flatMap((regMap) =>
  Object.values(regMap).flat()
);
const DATA_DATES = Array.from(new Set(ALL_POINTS.map((p) => p.date))).sort();
const DATA_MIN = DATA_DATES[0] ?? "2025-03-01";
const DATA_MAX = DATA_DATES[DATA_DATES.length - 1] ?? "2026-09-01";
const TODAY_DATE = ALL_POINTS.find((p) => p.isToday)?.date ?? DATA_MAX;

function monthsBefore(iso: string, n: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const transitionSmooth = { type: "spring", stiffness: 100, damping: 15 } as const;

export default function PricePredictionEnginePage() {
  const searchParams = useSearchParams();
  const [exportError, setExportError] = useState("");
  
  const [isExporting, setIsExporting] = useState(false);
  const [searchComm, setSearchComm] = useState("");
  const [isCommOpen, setIsCommOpen] = useState(false);
  const [searchCity, setSearchCity] = useState("");
  const [isCityOpen, setIsCityOpen] = useState(false);
  const commDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const queryCommodity = searchParams.get("commodity");
  const hasTrigger = searchParams.get("trigger") === "alert";
  const queryRegion = searchParams.get("region");

  const [commodityId, setCommodityId] = useState(() =>
    commodities.some((c) => c.id === queryCommodity) ? (queryCommodity as string) : "beras"
  );

  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => {
    const names = regionalComparisonMaster.map((r) => r.region);
    const requested = names.find((name) => name === queryRegion || name.toLowerCase().replace(/\s+/g, "-") === queryRegion);
    if (requested) return [requested];
    return [names[0] ?? "Aceh"];
  });

  // Default view: last 12 months of history through the 3 forecast months.
  const [startDate, setStartDate] = useState(monthsBefore(TODAY_DATE, 12));
  const [endDate, setEndDate] = useState(DATA_MAX);

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkMediaQuery = () => setIsMobileScreen(window.innerWidth < 768);
    checkMediaQuery();
    window.addEventListener("resize", checkMediaQuery);
    return () => window.removeEventListener("resize", checkMediaQuery);
  }, []);

  const setPredictionWindow = (monthsBack: number) => {
    setStartDate(monthsBefore(TODAY_DATE, monthsBack));
    setEndDate(DATA_MAX);
  };

  const filteredCommodities = useMemo(() => {
    return commodities.filter(c => c.name.toLowerCase().includes(searchComm.toLowerCase()));
  }, [searchComm]);

  const filteredCities = useMemo(() => {
    return regionalComparisonMaster.filter(item => 
      item.region.toLowerCase().includes(searchCity.toLowerCase()) && 
      !selectedRegions.includes(item.region)
    );
  }, [searchCity, selectedRegions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commDropdownRef.current && !commDropdownRef.current.contains(event.target as Node)) setIsCommOpen(false);
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) setIsCityOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddRegion = (regionName: string) => {
    if (selectedRegions.length >= 3) {
      alert("Maksimal perbandingan adalah 3 wilayah sekaligus.");
      return;
    }
    setSelectedRegions([...selectedRegions, regionName]);
    setSearchCity("");
    setIsCityOpen(false);
  };

  const handleRemoveRegion = (regionName: string) => {
    if (selectedRegions.length <= 1) {
      alert("Minimal harus memilih 1 wilayah untuk divisualisasikan.");
      return;
    }
    setSelectedRegions(selectedRegions.filter(r => r !== regionName));
  };

  const currentCommodityName = useMemo(() => {
    return commodities.find(c => c.id === commodityId)?.name || "Beras Medium";
  }, [commodityId]);

  // Sumbu waktu memakai IRISAN bulan, bukan gabungan.
  //
  // Sumber data tidak lengkap merata: Januari 2026, misalnya, hanya tercatat di
  // 8 dari 34 provinsi. Dengan sumbu gabungan, bulan itu tetap muncul lalu
  // wilayah yang tidak memilikinya bernilai undefined — dan Recharts memutus
  // garisnya di sana, sehingga terlihat seperti kerusakan tampilan. Menyambung
  // paksa lewat connectNulls juga bukan jawaban: itu menggambar nilai yang tidak
  // pernah ada. Membandingkan wilayah hanya sah pada bulan yang semuanya punya,
  // jadi bulan yang tidak dimiliki seluruh wilayah terpilih dikeluarkan — dan
  // disebutkan di bawah grafik supaya tidak hilang diam-diam.
  const { chartData, bulanDilewati } = useMemo(() => {
    const activeGroup = generatedTimeSeriesMaster[commodityId];
    if (!activeGroup) return { chartData: [] as Record<string, string | number | boolean>[], bulanDilewati: [] as string[] };

    const inRange = (reg: string) =>
      (activeGroup[reg] ?? []).filter(pt => pt.date >= startDate && pt.date <= endDate);

    const perRegion = selectedRegions.map(reg => new Set(inRange(reg).map(pt => pt.date)));
    const union = Array.from(new Set(perRegion.flatMap(set => Array.from(set)))).sort();
    const shared = union.filter(d => perRegion.every(set => set.has(d)));
    const dropped = union.filter(d => !perRegion.every(set => set.has(d)));

    const labelOf = (dStr: string) => {
      for (const reg of selectedRegions) {
        const hit = activeGroup[reg]?.find(pt => pt.date === dStr);
        if (hit) return hit.displayDate;
      }
      return dStr.slice(0, 7);
    };

    const rows = shared.map(dStr => {
      const row: Record<string, string | number | boolean> = { date: dStr, displayDate: labelOf(dStr) };
      selectedRegions.forEach(reg => {
        const found = activeGroup[reg]?.find(pt => pt.date === dStr);
        if (found) {
          row[reg] = found.price;
          if (found.isToday) row.isToday = true;
          if (found.isFuture) row.isFuture = true;
        }
      });
      return row;
    });

    return { chartData: rows, bulanDilewati: dropped.map(labelOf) };
  }, [commodityId, selectedRegions, startDate, endDate]);

  const analysis = useMemo(() => analyzePrediction({
    commodityId, regions: selectedRegions, startDate, endDate,
  }), [commodityId, selectedRegions, startDate, endDate]);
  const { currentPrice, predictedPrice, change: priceChange, mape: avgMape } = analysis;
  const isPriceDown = (priceChange ?? 0) < 0;

  const regionalBarData = useMemo(() => {
    return regionalComparisonMaster.flatMap(item => {
      const regList = generatedTimeSeriesMaster[commodityId]?.[item.region] || [];
      const todayPt = regList.find(pt => pt.isToday);
      return todayPt ? [{ region: item.region, price: todayPt.price }] : [];
    });
  }, [commodityId]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError("");
    try {
      const params = new URLSearchParams({ commodity: commodityId, start: startDate, end: endDate });
      selectedRegions.forEach((region) => params.append("region", region));
      const response = await fetch(`/api/prediction-report?${params}`);
      if (!response.ok) throw new Error("Laporan belum dapat dibuat. Periksa rentang tanggal dan coba lagi.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan-Prediksi-${commodityId}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Gagal mengunduh laporan. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const regionColors = ["#006c4a", "#0284c7", "#d97706"];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans pb-12 px-4 sm:px-0 text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/50 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#006c4a] tracking-tight">Prediksi Harga Komoditas</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Proyeksi harga komoditas 1–3 bulan ke depan, dibandingkan lintas provinsi.
          </p>
        </div>
        <Button 
          onClick={handleExportPDF}
          disabled={isExporting || !startDate || !endDate || startDate > endDate}
          className="no-print flex items-center gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-4 sm:py-5 px-5 sm:px-6 transition-all cursor-pointer shadow-sm active:scale-97 justify-center text-xs sm:text-sm w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Menyiapkan laporan..." : "Unduh Laporan PDF"}
        </Button>
      </div>

      {exportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{exportError}</p>}

      <AnimatePresence>
        {hasTrigger && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={transitionSmooth} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs no-print">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Langkah 1: Analisis Proyeksi Krisis Terdeteksi</h4>
                <p className="text-xs font-medium text-amber-700 mt-0.5">Sistem otomatis mengunci komoditas <span className="font-bold underline">{currentCommodityName}</span> berdasarkan warkat peringatan dini.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* PARAMETERS PANEL (KIRI) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={transitionSmooth}
          className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5 shadow-xs"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase">
            <Sliders className="w-3.5 h-3.5 text-[#006c4a]" />
            PENGATURAN PREDIKSI
          </div>

          {/* DROPDOWN KOMODITAS */}
          <div className="space-y-1.5 relative" ref={commDropdownRef}>
            <label className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block">KOMODITAS STRATEGIS</label>
            <div onClick={() => !hasTrigger && setIsCommOpen(!isCommOpen)} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center justify-between text-sm font-bold text-slate-700 cursor-pointer transition-all ${hasTrigger ? "bg-slate-100 cursor-not-allowed" : "hover:border-slate-300"}`}>
              <span>{currentCommodityName}</span>
              <ThinChevron />
            </div>
            <AnimatePresence>
              {isCommOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="dropdown-portal absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Cari komoditas..." value={searchComm} onChange={(e) => setSearchComm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#006c4a] font-bold"/>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredCommodities.map(c => (
                      <div key={c.id} onClick={() => { setCommodityId(c.id); setIsCommOpen(false); setSearchComm(""); }} className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${c.id === commodityId ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}>{c.name}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DROPDOWN KOTA */}
          <div className="space-y-1.5 relative" ref={cityDropdownRef}>
            <label className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block">BANDINGKAN WILAYAH (MAKS. 3)</label>
            <div onClick={() => !hasTrigger && setIsCityOpen(!isCityOpen)} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center justify-between text-sm font-bold text-slate-700 cursor-pointer transition-all ${hasTrigger ? "bg-slate-100 cursor-not-allowed" : "hover:border-slate-300"}`}>
              <span className="text-slate-400 font-normal text-xs sm:text-sm truncate">Tambah wilayah pembanding...</span>
              <Plus className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <AnimatePresence>
              {isCityOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="dropdown-portal absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Cari provinsi..." value={searchCity} onChange={(e) => setSearchCity(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#006c4a] font-bold"/>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredCities.length > 0 ? (
                      filteredCities.map(item => (
                        <div key={item.region} onClick={() => handleAddRegion(item.region)} className="px-3 py-2 text-xs font-bold rounded-lg cursor-pointer text-slate-600 hover:bg-slate-50">{item.region}</div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center py-2">Wilayah tidak tersedia/sudah dipilih</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-1.5 pt-2">
              <AnimatePresence>
                {selectedRegions.map((reg, idx) => (
                  <motion.div key={reg} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-bold border shadow-3xs" style={{ borderColor: regionColors[idx], backgroundColor: idx === 0 ? "#E6F4EA" : idx === 1 ? "#f0f9ff" : "#fffbeb", color: regionColors[idx] }}>
                    <span>{reg}</span>
                    {!hasTrigger && (
                      <button type="button" onClick={() => handleRemoveRegion(reg)} className="no-print hover:bg-black/5 rounded-full p-0.5 transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* REDESIGN PANEL: DATA SCOPE & LIVE SCOPE REGIONAL MAP SUMMARY */}
          <div className="pt-2">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2.5 shadow-3xs">
              <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-slate-400 font-mono uppercase">
                <Info className="w-3.5 h-3.5 text-[#006c4a]" />
                Ringkasan Cakupan
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">KOMODITAS AKTIF</span>
                <span className="text-xs font-black text-[#006c4a] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block">
                  {currentCommodityName}
                </span>
              </div>
              <div className="space-y-1 border-t border-slate-200/60 pt-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">WILAYAH DIPANTAU ({selectedRegions.length})</span>
                <div className="text-xs font-bold text-slate-700 leading-relaxed">
                  {selectedRegions.join(", ")}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* WORKSPACE GRAPH CONTAINER (KANAN) */}
        <div className="xl:col-span-9 space-y-6 w-full min-w-0">
          
          {/* METRIC CARDS */}
          <motion.div variants={cardContainerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={cardItemVariants} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-3xs min-h-[110px] sm:min-h-[120px]">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase">HARGA RATA-RATA</span>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 mt-1 truncate">
                {/* PERBAIKAN 2: Mengembalikan pola pemanggilan tag tunggal self-closing bawaan */}
                {currentPrice === null ? "Belum tersedia" : <>Rp <AnimatedNumber value={Math.round(currentPrice)} /></>}<span className="text-[10px] sm:text-[1xs] font-mono font-normal text-slate-400 pl-0.5">/{commodities.find(c => c.id === commodityId)?.unit || "kg"}</span>
              </h4>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1 truncate">{analysis.baselineDate ? monthLabel(analysis.baselineDate) : "Bulan acuan belum tersedia"}</span>
            </motion.div>

            <motion.div variants={cardItemVariants} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-3xs min-h-[110px] sm:min-h-[120px]">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase">RATA-RATA PERUBAHAN</span>
              <h4 className={`text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-0.5 truncate ${isPriceDown ? "text-emerald-600" : "text-rose-600"}`}>
                {priceChange === null ? "Belum tersedia" : <>{isPriceDown ? "↓" : "↑"} Rp <AnimatedNumber value={Math.round(Math.abs(priceChange))} /></>}
              </h4>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1 block truncate ${isPriceDown ? "text-emerald-600" : "text-rose-600"}`}>
                {analysis.direction}
              </span>
            </motion.div>

            <motion.div variants={cardItemVariants} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-3xs min-h-[110px] sm:min-h-[120px]">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase">RATA-RATA PREDIKSI</span>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 mt-1 truncate">
                {predictedPrice === null ? "Belum tersedia" : <>Rp <AnimatedNumber value={Math.round(predictedPrice)} /></>}<span className="text-[10px] sm:text-xs font-mono font-normal text-slate-400 pl-0.5">/{commodities.find(c => c.id === commodityId)?.unit || "kg"}</span>
              </h4>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1 truncate">{analysis.forecastDate ? monthLabel(analysis.forecastDate) : "Tidak ada prediksi pada rentang ini"}</span>
            </motion.div>

            <motion.div variants={cardItemVariants} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-3xs min-h-[110px] sm:min-h-[120px]">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase">KESALAHAN HISTORIS (MAPE)</span>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight text-amber-600 mt-1">
                {avgMape === null ? "Belum tersedia" : `${avgMape.toLocaleString("id-ID")}%`}
              </h4>
              <span className="text-[9px] sm:text-[10px] text-amber-600 font-bold mt-1 block truncate">Evaluasi historis 1 bulan</span>
            </motion.div>
          </motion.div>

          {/* LINE CHART SECTION & CONTROLS TOOLBAR */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={transitionSmooth} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-3xs overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 font-mono uppercase flex items-center gap-1.5">
                <span>📈</span> PERGERAKAN HARGA 1–3 BULAN
              </span>

              {/* TIMELINE CONTROLS BAR WITH NEW RANGE SHORTCUTS BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                
                {/* NEW SHORTCUT BUTTONS GROUP */}
                <div className="shortcut-row flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-[10px] font-bold text-slate-600 shadow-3xs shrink-0">
                  <button onClick={() => setPredictionWindow(3)} className="px-2.5 py-1.5 rounded-lg hover:bg-white transition-all cursor-pointer">3 Bulan</button>
                  <button onClick={() => setPredictionWindow(6)} className="px-2.5 py-1.5 rounded-lg hover:bg-white transition-all cursor-pointer">6 Bulan</button>
                  <button onClick={() => setPredictionWindow(12)} className="px-2.5 py-1.5 rounded-lg hover:bg-white transition-all cursor-pointer">1 Tahun</button>
                </div>

                {/* Date Picker Range Input */}
                <div className="date-picker-trigger flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 max-w-full overflow-x-auto">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Popover.Root>
                    <Popover.Trigger className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:text-[#006c4a] outline-none cursor-pointer text-[10px] sm:text-[11px] font-mono whitespace-nowrap">
                      {startDate.split("-").reverse().join("/")}
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Positioner side="bottom" sideOffset={6} align="end" className="z-50">
                        <Popover.Popup className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl font-sans space-y-2">
                          <label className="text-[9px] font-mono font-bold text-slate-400 block">TANGGAL MULAI</label>
                          <input type="date" aria-label="Tanggal mulai" min={DATA_MIN} max={endDate || DATA_MAX} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-[#006c4a] font-bold"/>
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                  <span className="text-slate-300">-</span>
                  <Popover.Root>
                    <Popover.Trigger className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:text-[#006c4a] outline-none cursor-pointer text-[10px] sm:text-[11px] font-mono whitespace-nowrap">
                      {endDate.split("-").reverse().join("/")}
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Positioner side="bottom" sideOffset={6} align="end" className="z-50">
                        <Popover.Popup className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl font-sans space-y-2">
                          <label className="text-[9px] font-mono font-bold text-slate-400 block">TANGGAL AKHIR</label>
                          <input type="date" aria-label="Tanggal akhir" min={startDate || DATA_MIN} max={DATA_MAX} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-[#006c4a] font-bold"/>
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

              </div>
            </div>

            {/* CHART CANVAS */}
            <div className="w-full h-[260px] sm:h-[320px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="displayDate" tickLine={false} axisLine={false} stroke="#94a3b8" style={{ fontSize: "9px", fontWeight: "600" }} />
                  <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `Rp ${v.toLocaleString("id-ID")}`} domain={["auto", "auto"]} style={{ fontSize: "9px" }} />
                  <RechartsTooltip formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                  <ReferenceLine x={chartData.find(d => d.isToday)?.displayDate as string | undefined} stroke="#f43f5e" strokeDasharray="3 3" />
                  {selectedRegions.map((reg, idx) => (
                    <Line isAnimationActive={false} key={reg} type="monotone" dataKey={reg} name={reg} stroke={regionColors[idx]} strokeWidth={isMobileScreen ? 2 : 3} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-slate-500">Garis merah menandai bulan acuan data terakhir. Bagian setelah bulan acuan merupakan prediksi, bukan harga yang sudah teramati.</p>
            {!chartData.length && <p role="status" className="text-sm text-amber-700">Tidak ada data bersama pada rentang tanggal terpilih.</p>}
            {bulanDilewati.length > 0 && (
              <p className="text-[10px] text-slate-400 font-medium pt-1.5 leading-relaxed">
                {bulanDilewati.join(", ")} tidak ditampilkan — bulan tersebut tidak tercatat di
                seluruh wilayah yang dibandingkan, sehingga tidak dapat diperbandingkan.
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <PredictionNarrative analysis={analysis} />

      {/* NATIONAL BASELINE COMPLEMENT BAR CHART */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={transitionSmooth} className="border border-slate-200 bg-white rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#006c4a]" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Perbandingan Harga Acuan Antarwilayah</h3>
              <p className="text-xs text-slate-500 mt-1">Harga terakhir yang teramati pada {analysis.baselineDate ? monthLabel(analysis.baselineDate) : "bulan acuan"}; rentang grafik di atas tidak mengubah acuan ini.</p>
            </div>
          </div>
          <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-200 self-start sm:self-auto">
            Cakupan data: {regionalBarData.length} Wilayah
          </span>
        </div>
        <div className="w-full h-[240px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regionalBarData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
              <XAxis dataKey="region" tickLine={false} axisLine={false} stroke="#94a3b8" style={{ fontSize: "9px", fontWeight: "600" }} interval={isMobileScreen ? 1 : 0} />
              <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `Rp ${v.toLocaleString("id-ID")}`} style={{ fontSize: "9px" }} />
              <RechartsTooltip formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Harga acuan"]} contentStyle={{ borderRadius: "var(--radius-lg)" }} />
              <Bar isAnimationActive={false} dataKey="price" fill="#006c4a" radius={[4, 4, 0, 0]} maxBarSize={isMobileScreen ? 16 : 30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}