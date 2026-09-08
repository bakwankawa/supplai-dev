"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useApi } from "@/hooks/use-api";
import { HeatmapResponse } from "@/lib/types";
import { commodities } from "@/data/commodities";
import { PriceMatrix } from "@/components/heatmap/price-matrix";
import { TopCritical } from "@/components/heatmap/top-critical";
import { CityFilterModal } from "@/components/heatmap/city-filter-modal";
import { ElasticDatePicker } from "@/components/layout/elastic-date-picker";
import { NationalHeatmap } from "@/components/heatmap/national-heatmap";
import { ALL_PROVINCES } from "@/data/province-groups";
import { Button } from "@/components/ui/button";
import { MapPin, SlidersHorizontal, Info, ChevronDown, Search, Check, LayoutGrid, Map } from "lucide-react";

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

const viewPanelVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 15 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: { duration: 0.16, ease: "easeOut" },
  },
} as const;

export default function HeatmapPage() {
  const reducedMotion = useReducedMotion();
  const [commodity, setCommodity] = useState("beras");
  const [range, setRange] = useState(12);
  const [view, setView] = useState<"heatmap" | "map">("heatmap");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // ================= STATE CUSTOM SEARCHABLE DROPDOWN =================
  const [isCommodityOpen, setIsCommodityOpen] = useState(false);
  const [commoditySearch, setCommoditySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [appliedCities, setAppliedCities] = useState<string[]>(ALL_PROVINCES);

  const { data, loading, error, refetch } = useApi<HeatmapResponse>(
    `/api/heatmap?commodity=${commodity}&range=${range}`
  );

  // A failed load leaves no matrix and no ranking to show. Rendering the
  // matrix's empty-grid skeleton or the ranking panel's "Tidak ada data" in
  // this case would read as a measured, all-clear result rather than as a
  // request that never came back. See /redistribusi's `gagalMuat` for the
  // same reasoning.
  const gagalMuat = error ? error.message : null;

  useEffect(() => {
    const handleGlobalRefresh = () => refetch?.();
    window.addEventListener("global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("global-refresh", handleGlobalRefresh);
  }, [refetch]);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCommodityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMatrix = useMemo(() => {
    if (!data?.matrix) return [];
    return data.matrix.filter(row => appliedCities.includes(row.region));
  }, [data, appliedCities]);

  // Filter daftar komoditas berdasarkan keyword search
  const filteredCommodities = useMemo(() => {
    return commodities.filter((c) =>
      c.name.toLowerCase().includes(commoditySearch.toLowerCase())
    );
  }, [commoditySearch]);

  const selectedCommodityLabel = useMemo(() => {
    return commodities.find((c) => c.id === commodity)?.name ?? "Pilih Komoditas";
  }, [commodity]);

  const filteredTopCritical = useMemo(
    () => (data?.topCritical ?? []).filter((item) => appliedCities.includes(item.region)).slice(0, 5),
    [data, appliedCities]
  );

  const insight = useMemo(() => {
    if (loading) return "Insight sedang disusun berdasarkan filter yang dipilih.";
    if (filteredTopCritical.length === 0) return `Belum ada wilayah kritis untuk ${selectedCommodityLabel} pada cakupan yang dipilih.`;
    const highest = filteredTopCritical[0];
    const average = filteredTopCritical.reduce((total, item) => total + item.change, 0) / filteredTopCritical.length;
    return `${highest.region} mencatat proyeksi kenaikan tertinggi untuk ${selectedCommodityLabel}, yaitu ${highest.change.toFixed(1)}%. Rata-rata kenaikan pada ${filteredTopCritical.length} wilayah prioritas mencapai ${average.toFixed(1)}%. Data ini dapat digunakan untuk memprioritaskan verifikasi pasokan dan koordinasi distribusi.`;
  }, [filteredTopCritical, loading, selectedCommodityLabel]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-[1600px] mx-auto font-sans pb-12 text-slate-800"
    >

      {/* ================= ROW 1: PAGE HEADER ================= */}
      <motion.div variants={itemVariants} className="border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#065F46] tracking-tight">Heatmap Prediksi Harga per Wilayah</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Prediksi perubahan harga 1–3 bulan ke depan di seluruh Indonesia.
          </p>
        </div>

      </motion.div>

      {/* ================= ROW 2: SHARED HEATMAP FILTERS ================= */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
          <SlidersHorizontal className="h-4 w-4 text-[#006c4a]" />
          Pengaturan Heatmap
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Komoditas Strategis</label>

          {/* ================= SEARCHABLE COMMODITY DROPDOWN ================= */}
          <div className="relative min-w-[200px]" ref={dropdownRef}>
            <button
              type="button"
              aria-label="Pilih komoditas heatmap"
              aria-expanded={isCommodityOpen}
              onClick={() => setIsCommodityOpen(!isCommodityOpen)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none flex items-center justify-between cursor-pointer focus:border-[#006c4a] focus:ring-2 focus:ring-emerald-50 shadow-xs h-10 transition-all"
            >
              <span className="truncate">{selectedCommodityLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCommodityOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isCommodityOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-slate-800 overflow-hidden"
                >
                  {/* SEARCH INPUT FIELD */}
                  <div className="relative mb-1.5">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={commoditySearch}
                      onChange={(e) => setCommoditySearch(e.target.value)}
                      placeholder="Cari komoditas..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#006c4a] transition-all"
                      autoFocus
                    />
                  </div>

                  {/* LIST COMMODITIES */}
                  <div className="max-h-48 overflow-y-auto space-y-0.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                    {filteredCommodities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium">
                        Komoditas tidak ditemukan
                      </div>
                    ) : (
                      filteredCommodities.map((c) => {
                        const isSelected = c.id === commodity;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCommodity(c.id);
                              setIsCommodityOpen(false);
                              setCommoditySearch("");
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer ${isSelected
                                ? "bg-emerald-50 text-[#006c4a]"
                                : "text-slate-700 hover:bg-slate-50"
                              }`}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#006c4a]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
        <div className="space-y-1.5 [&>div]:border-slate-200 [&>div]:bg-slate-50">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Periode Analisis</label>
          <ElasticDatePicker onRangeChange={(days) => setRange(days)} />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Cakupan Wilayah</label>
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            className="flex h-10 items-center gap-2 border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter wilayah ({appliedCities.length})</span>
          </Button>
        </div>
        </div>
        <div className="space-y-1.5">
          <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Tampilan Data</span>
          <div role="group" aria-label="Pilih tampilan heatmap" className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-xs">
            <motion.button type="button" aria-pressed={view === "heatmap"} onClick={() => setView("heatmap")} whileTap={reducedMotion ? undefined : { scale: 0.97 }} className={`relative flex items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors ${view === "heatmap" ? "text-[#006c4a]" : "text-slate-500 hover:text-slate-800"}`}>
              {view === "heatmap" && <motion.span layoutId="heatmap-view-active" className="absolute inset-0 rounded-md bg-emerald-50 shadow-xs" transition={{ type: "spring", stiffness: 360, damping: 30 }} />}
              <LayoutGrid className="relative h-4 w-4" /><span className="relative">Heatmap</span>
            </motion.button>
            <motion.button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} whileTap={reducedMotion ? undefined : { scale: 0.97 }} className={`relative flex items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors ${view === "map" ? "text-[#006c4a]" : "text-slate-500 hover:text-slate-800"}`}>
              {view === "map" && <motion.span layoutId="heatmap-view-active" className="absolute inset-0 rounded-md bg-emerald-50 shadow-xs" transition={{ type: "spring", stiffness: 360, damping: 30 }} />}
              <Map className="relative h-4 w-4" /><span className="relative">Peta Nasional</span>
            </motion.button>
          </div>
        </div>
        </div>
      </motion.div>

      {/* ================= LOAD FAILURE (NOT AN EMPTY MATRIX) ================= */}
      {gagalMuat && (
        <motion.div
          variants={itemVariants}
          className="bg-white border border-rose-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-2 border-b border-rose-100 pb-4 mb-4">
            <MapPin className="w-4 h-4 text-rose-600" />
            <h3 className="text-lg font-bold text-slate-800">Heatmap gagal dimuat</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Permintaan ke <span className="font-mono">/api/heatmap</span> untuk{" "}
            <span className="font-bold">{selectedCommodityLabel}</span> pada rentang{" "}
            <span className="font-bold">{range} bulan</span> tidak berhasil:{" "}
            <span className="font-bold text-rose-700">{gagalMuat}</span>
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            Matriks dan peringkat wilayah kritis di bawah ini sengaja tidak ditampilkan sampai
            jawaban diterima. Grid kosong atau &quot;tidak ada data&quot; di sana akan terbaca
            sebagai hasil pengukuran, padahal tidak ada pengukuran yang sampai ke sini.
          </p>
        </motion.div>
      )}

      {/* ================= ROW 3: SELECTED DATA VIEW ================= */}
      <AnimatePresence mode="wait" initial={false}>
      {view === "map" ? (
        <motion.div key="national-map" variants={viewPanelVariants} initial={reducedMotion ? false : "hidden"} animate="show" exit={reducedMotion ? undefined : "exit"} className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs">
          <NationalHeatmap selectedCommodity={commodity} selectedRegions={appliedCities} />
        </motion.div>
      ) : (
        <motion.div key="heatmap-matrix" variants={viewPanelVariants} initial={reducedMotion ? false : "hidden"} animate="show" exit={reducedMotion ? undefined : "exit"} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-w-0 overflow-hidden">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 mb-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
              <h3 className="text-lg font-bold text-slate-800">Heatmap</h3>
            </div>

          </div>

          <div className="w-full overflow-x-auto">
            {gagalMuat ? (
              <div className="py-12 px-6 text-center space-y-1.5">
                <p className="text-xs font-bold text-rose-600">Matriks ini gagal dimuat.</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-md mx-auto">
                  {gagalMuat} Ini kegagalan pengambilan data, bukan pernyataan bahwa harga
                  stabil di semua wilayah.
                </p>
              </div>
            ) : (
              <PriceMatrix matrix={filteredMatrix} loading={loading} />
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ================= ROW 4: PRIORITY REGIONS & NARRATIVE ================= */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <MapPin className="w-4 h-4 text-rose-600" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Top 5 Wilayah Kritis</h3>
                {/* Tolok ukurnya berbeda dari matriks di sebelah kiri — di sana
                    persentase dibandingkan bulan basis. Tanpa keterangan ini,
                    kedua panel tampak saling bertentangan. */}
                <p className="text-[10px] text-slate-400 font-medium leading-tight">
                  Kenaikan yang diproyeksikan 3 bulan ke depan, dihitung dari harga saat ini
                </p>
              </div>
            </div>
            {gagalMuat ? (
              <div className="py-8 px-4 text-center space-y-1">
                <p className="text-xs font-bold text-rose-600">Peringkat ini gagal dimuat.</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                  Bukan berarti tidak ada wilayah kritis — jawaban dari server belum sampai.
                </p>
              </div>
            ) : (
              <TopCritical data={filteredTopCritical} loading={loading} />
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 mt-4">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Penetapan status kritis mengacu pada deviasi harga &gt; 10% dari Harga Eceran Tertinggi (HET) nasional dalam kurun waktu 12 bulan terakhir.
            </p>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-emerald-200/70 pb-4">
            <Info className="h-4 w-4 text-[#006c4a]" />
            <h3 className="text-lg font-bold text-[#006c4a]">Insight SupplAI</h3>
          </div>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-600">{insight}</p>
          <p className="mt-4 text-[10px] leading-5 text-slate-400">Narasi dibuat otomatis dari hasil prediksi pada filter aktif dan perlu diverifikasi bersama data operasional.</p>
        </aside>
      </motion.div>

      {/* LAUNCH CITY FILTER MODAL */}
      {isFilterModalOpen && <CityFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentSelected={appliedCities}
        onApply={(selected) => setAppliedCities(selected)}
      />}
    </motion.div>
  );
}
