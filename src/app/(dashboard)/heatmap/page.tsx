"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import { MapPin, SlidersHorizontal, Info, ChevronDown, Search, Check } from "lucide-react";

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

export default function HeatmapPage() {
  const [commodity, setCommodity] = useState("beras");
  const [range, setRange] = useState(12);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // ================= STATE CUSTOM SEARCHABLE DROPDOWN =================
  const [isCommodityOpen, setIsCommodityOpen] = useState(false);
  const [commoditySearch, setCommoditySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [appliedCities, setAppliedCities] = useState<string[]>(ALL_PROVINCES);

  const { data, loading, refetch } = useApi<HeatmapResponse>(
    `/api/heatmap?commodity=${commodity}&range=${range}`
  ) as { data: HeatmapResponse | null; loading: boolean; refetch: () => void };

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-[1600px] mx-auto font-sans pb-12 text-slate-800"
    >

      {/* ================= ROW 1: CONTROLS & HEADER ================= */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#065F46] tracking-tight">Heatmap Prediksi Harga per Wilayah</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Prediksi perubahan harga 1–3 bulan ke depan di seluruh Indonesia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

          {/* ================= SEARCHABLE COMMODITY DROPDOWN ================= */}
          <div className="relative min-w-[200px]" ref={dropdownRef}>
            <button
              type="button"
              aria-label="Pilih komoditas heatmap"
              aria-expanded={isCommodityOpen}
              onClick={() => setIsCommodityOpen(!isCommodityOpen)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#065F46] outline-none flex items-center justify-between cursor-pointer focus:border-[#006c4a] focus:ring-2 focus:ring-emerald-50 shadow-xs h-10 transition-all"
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
                  className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-slate-800 overflow-hidden"
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
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
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

          <ElasticDatePicker onRangeChange={(days) => setRange(days)} />
        </div>
      </motion.div>

      {/* ================= ROW 2: PETA NASIONAL ================= */}
      <motion.div variants={itemVariants} className="border border-slate-200 bg-white rounded-2xl p-2 shadow-xs">
        <NationalHeatmap selectedCommodity={commodity} />
      </motion.div>

      {/* ================= ROW 3: MATRIKS, DIIKUTI WILAYAH KRITIS ================= */}
      <div className="flex flex-col gap-6">

        {/* HEATMAP PRICE MATRIX (8 COLS) */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-w-0 overflow-hidden">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 mb-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
              <h3 className="text-lg font-bold text-slate-800">Matriks Perubahan Harga per Wilayah</h3>
            </div>

            <Button
              onClick={() => setIsFilterModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2 font-bold border-slate-300 bg-white hover:bg-slate-50 rounded-xl shadow-xs text-xs h-9 py-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Wilayah ({appliedCities.length})</span>
            </Button>
          </div>

          <div className="w-full overflow-x-auto">
            <PriceMatrix matrix={filteredMatrix} loading={loading} />
          </div>
        </motion.div>

        {/* TOP 5 CRITICAL PANEL (4 COLS) */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
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
            <TopCritical data={data?.topCritical ?? []} loading={loading} />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 mt-4">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Penetapan status kritis mengacu pada deviasi harga &gt; 10% dari Harga Eceran Tertinggi (HET) nasional dalam kurun waktu 12 bulan terakhir.
            </p>
          </div>
        </motion.div>
      </div>

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