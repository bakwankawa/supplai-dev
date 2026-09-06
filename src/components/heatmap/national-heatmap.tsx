"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { generatedTimeSeriesMaster } from "@/data/prediction-chart";
import { commodities } from "@/data/commodities";
import { AlertTriangle, Eye, MapPin, ClipboardList, X } from "lucide-react";

// Canvas coordinates for all 34 provinces, computed from each province's path
// in /indonesia.svg (largest-landmass centroid, mapped through the same
// drawImage transform: rect 40,40 → 920×420 over a 792.5×316.7 image).
// Regenerate if the base map changes.
const PROVINCE_COORDINATES: Record<string, { x: number; y: number }> = {
  // Sumatera
  "Aceh": { x: 75, y: 111 },
  "Sumatera Utara": { x: 119, y: 156 },
  "Sumatera Barat": { x: 149, y: 224 },
  "Riau": { x: 172, y: 198 },
  "Kepulauan Riau": { x: 226, y: 185 },
  "Jambi": { x: 191, y: 247 },
  "Bengkulu": { x: 184, y: 290 },
  "Sumatera Selatan": { x: 220, y: 282 },
  "Kepulauan Bangka Belitung": { x: 256, y: 260 },
  "Lampung": { x: 237, y: 321 },
  // Jawa
  "DKI Jakarta": { x: 274, y: 350 },
  "Banten": { x: 259, y: 356 },
  "Jawa Barat": { x: 289, y: 367 },
  "Jawa Tengah": { x: 341, y: 374 },
  "DI Yogyakarta": { x: 346, y: 389 },
  "Jawa Timur": { x: 390, y: 387 },
  // Bali & Nusa Tenggara
  "Bali": { x: 440, y: 400 },
  "Nusa Tenggara Barat": { x: 495, y: 406 },
  "Nusa Tenggara Timur": { x: 561, y: 405 },
  // Kalimantan
  "Kalimantan Barat": { x: 360, y: 210 },
  "Kalimantan Tengah": { x: 406, y: 245 },
  "Kalimantan Selatan": { x: 445, y: 276 },
  "Kalimantan Timur": { x: 467, y: 198 },
  "Kalimantan Utara": { x: 462, y: 142 },
  // Sulawesi
  "Sulawesi Utara": { x: 623, y: 189 },
  "Gorontalo": { x: 586, y: 193 },
  "Sulawesi Tengah": { x: 560, y: 231 },
  "Sulawesi Barat": { x: 525, y: 265 },
  "Sulawesi Selatan": { x: 541, y: 292 },
  "Sulawesi Tenggara": { x: 574, y: 295 },
  // Maluku & Papua
  "Maluku": { x: 728, y: 282 },
  "Maluku Utara": { x: 699, y: 189 },
  "Papua Barat": { x: 802, y: 256 },
  "Papua": { x: 914, y: 313 },
};

type MapPoint = {
  region: string;
  price: number;
  status: "CRITICAL" | "STABLE" | "SURPLUS";
  change: number;
  coord: { x: number; y: number };
};

export function NationalHeatmap({ selectedCommodity }: { selectedCommodity: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(mapRef);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // States Modal Rekomendasi & Hover Tooltip
  const [isRecoModalOpen, setIsRecoModalOpen] = useState(false);
  const [hoveredCity, setHoveredCity] = useState<MapPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const currentCommodityName = useMemo(() => {
    return commodities.find(c => c.id === selectedCommodity)?.name || "Beras Medium";
  }, [selectedCommodity]);

  // Real per-province price + 3-month projection for the selected commodity,
  // derived from the monthly series (current month vs last forecast month).
  const provinceData = useMemo<MapPoint[]>(() => {
    const series = generatedTimeSeriesMaster[selectedCommodity] || {};
    const out: MapPoint[] = [];
    for (const [prov, coord] of Object.entries(PROVINCE_COORDINATES)) {
      const arr = series[prov];
      if (!arr || arr.length === 0) continue;
      const today = arr.find(p => p.isToday) ?? arr[0];
      const last = arr[arr.length - 1];
      const change = today.price ? ((last.price - today.price) / today.price) * 100 : 0;
      const status: MapPoint["status"] =
        change > 3 ? "CRITICAL" : change < -3 ? "SURPLUS" : "STABLE";
      out.push({ region: prov, price: today.price, status, change, coord });
    }
    return out;
  }, [selectedCommodity]);

  const criticalCount = useMemo(
    () => provinceData.filter(p => p.status === "CRITICAL").length,
    [provinceData]
  );

  // LOGIKA MOUSE HOVER CANVAS TOOLTIP
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    let foundCity: MapPoint | null = null;

    provinceData.forEach((item) => {
      const coord = item.coord;

      const distance = Math.sqrt(Math.pow(mouseX - coord.x, 2) + Math.pow(mouseY - coord.y, 2));
      if (distance < 16) {
        foundCity = item;
      }
    });

    if (foundCity) {
      setHoveredCity(foundCity);
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15
      });
    } else {
      setHoveredCity(null);
    }
  };

  // ENGINE RENDER SEBARAN DENSITY CANVAS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = (baseMap: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (baseMap) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(baseMap, 40, 40, 920, 420); // scaled to widescreen
        ctx.globalAlpha = 1.0;
      }

      // Render Thermal Gradien Blur
      provinceData.forEach((item) => {
        const coord = item.coord;

        const radius = 48;
        const gradient = ctx.createRadialGradient(coord.x, coord.y, 2, coord.x, coord.y, radius);

        if (item.status === "CRITICAL") {
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.85)");   
          gradient.addColorStop(0.3, "rgba(249, 115, 22, 0.55)"); 
          gradient.addColorStop(0.6, "rgba(234, 179, 8, 0.25)");  
          gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
        } else if (item.status === "SURPLUS") {
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.75)");  
          gradient.addColorStop(0.4, "rgba(52, 211, 153, 0.35)"); 
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        } else {
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.55)");   
          gradient.addColorStop(0.5, "rgba(147, 197, 253, 0.25)"); 
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Titik Anchor Kota & Teks Label
      provinceData.forEach((item) => {
        const coord = item.coord;

        ctx.fillStyle = item.status === "CRITICAL" ? "#ef4444" : "#1e293b";
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Province label only (price/change live in the hover tooltip); keeps
        // the 34-marker map readable. White halo for contrast over the heat.
        ctx.font = "600 9px sans-serif";
        ctx.fillStyle = "#0f172a";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 3;
        ctx.fillText(item.region, coord.x + 6, coord.y + 3);
        ctx.shadowBlur = 0;
      });
    };

    // Draw the data immediately, then layer the base map underneath once it
    // loads. If the map asset is missing/slow, the heat + markers still show.
    paint(null);
    const baseMap = new Image();
    baseMap.onload = () => paint(baseMap);
    baseMap.src = "/indonesia.svg";
    return () => { baseMap.onload = null; };
  }, [provinceData]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans pb-4 p-2 text-slate-800">
      
      {/* ================= BAR CONTROLLER ATAS & TOMBOL MODAL ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/50 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#006c4a] tracking-tight">Peta Nasional — {currentCommodityName}</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Proyeksi perubahan harga 3 bulan ke depan untuk komoditas yang dipilih di atas.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Legend Indikator Status */}
          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 shadow-3xs h-10">
            <span>Surplus</span>
            <div className="w-20 h-2 bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-md" />
            <span>Defisit</span>
          </div>

          {/* NEW ACTION BUTTON: Pemicu Pop-Up Rekomendasi Wilayah */}
          <button
            onClick={() => setIsRecoModalOpen(true)}
            className="flex items-center gap-2 bg-[#006c4a] hover:bg-[#005238] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-97 cursor-pointer h-10 shrink-0"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Lihat Rekomendasi Wilayah</span>
          </button>
        </div>
      </div>

      {/* ================= MAIN INTERFACE (FULL WIDESCREEN VIEW) ================= */}
      <div className="w-full">
        
        {/* WORKSPACE PETA INDONESIA BESAR MAKSIMAL (KANAN - 9 COLS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col relative w-full overflow-hidden">
          <div className="w-full flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 font-mono uppercase flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#006c4a]" />
              Sebaran harga nasional
            </span>
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              {criticalCount} Wilayah Status Kritis
            </div>
          </div>
          
          <div ref={mapRef} className="w-full relative bg-slate-50 rounded-2xl border border-slate-200/40 flex justify-center items-center overflow-hidden">
            <canvas 
              ref={canvasRef} 
              width={1000} 
              height={500} 
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCity(null)}
              className="rounded-xl shadow-2xs w-full h-auto cursor-crosshair"
            />

            <svg
              viewBox="0 0 1000 500"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <g className="motion-safe:animate-pulse" style={{ animationPlayState: isInView ? "running" : "paused" }}>
                {provinceData.filter((point) => point.status === "CRITICAL").map((point) => (
                  <circle
                    key={point.region}
                    cx={point.coord.x}
                    cy={point.coord.y}
                    r={11}
                    fill="rgba(239, 68, 68, 0.25)"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                ))}
              </g>
            </svg>

            {/* FLOATING DETAILED HOVER WIDGET */}
            <AnimatePresence>
              {hoveredCity && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.1 }}
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                  className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-xs text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 space-y-1.5 z-50 w-52"
                >
                  <div className="flex justify-between items-center border-b border-slate-700/60 pb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {hoveredCity.region}
                    </span>
                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                      hoveredCity.status === 'CRITICAL' ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}>
                      {hoveredCity.status}
                    </span>
                  </div>
                  <div className="space-y-0.5 font-mono text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-400">Harga Kini:</span><span className="font-bold text-emerald-300">Rp{hoveredCity.price.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Proyeksi 3 Bln:</span><span className={`font-bold ${hoveredCity.change >= 0 ? "text-rose-300" : "text-emerald-300"}`}>{hoveredCity.change >= 0 ? "+" : ""}{hoveredCity.change.toFixed(1)}%</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ================= MODAL INTERAKTIF POP-UP REKOMENDASI PER WILAYAH ================= */}
      <AnimatePresence>
        {isRecoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRecoModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden text-slate-800"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#006c4a]">
                  <ClipboardList className="w-5 h-5 text-[#006c4a]" />
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">Matriks Rekomendasi SupplAi per Wilayah</h3>
                </div>
                <button 
                  onClick={() => setIsRecoModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Modal Grid Content List */}
              <div className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/80 space-y-1">
                  <h5 className="text-xs font-black text-[#006c4a]">Kawasan Jabodetabek</h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Stabilisasi stok via Pasar Induk Cipinang dan Kramat Jati perlu ditingkatkan segera. Hambatan variansi harga eceran terpantau menipis.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/80 space-y-1">
                  <h5 className="text-xs font-black text-[#006c4a]">Kawasan Pulau Jawa</h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Pasokan cabai dan bawang menuju Jabodetabek terpantau aman, namun awasi volatilitas krisis penawaran di sentra tani Brebes.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/80 space-y-1">
                  <h5 className="text-xs font-black text-[#006c4a]">Kawasan Pulau Sumatera</h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Distribusikan tambahan logistik jalur darat lintas Trans-Sumatera guna menekan potensi defisit pasokan musiman akibat cuaca buruk.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/80 space-y-1">
                  <h5 className="text-xs font-black text-[#006c4a]">Sulawesi & Kawasan Timur</h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Rekomendasi taktis substitusi moda armada logistik laut terpadu untuk menekan disparitas lonjakan harga tinggi antar pulau.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}