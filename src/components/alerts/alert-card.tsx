"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, ArrowUpRight, X } from "lucide-react";

export interface AlertData {
  id: string | number;
  severity: "CRITICAL" | "WARNING" | "INFO";
  type: string;
  title: string;
  location: string;
  delta: string;
  updated: string;
}

interface AlertCardProps {
  alert: AlertData;
  onDismiss?: (id: string | number) => void;
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const router = useRouter();
  const isCritical = alert.severity === "CRITICAL";
  const isWarning = alert.severity === "WARNING";

  return (
    <motion.div
      /* Hapus prop `layout` agar tidak memaksa reflow vertical yang kasar */
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors bg-white hover:border-slate-300 shadow-3xs ${isCritical ? "border-rose-200/80 bg-rose-50/10" : isWarning ? "border-amber-200/80 bg-amber-50/10" : "border-slate-200"
        }`}
    >
      {/* SISI KIRI: Icon, Badge, Judul, & Lokasi */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Status Icon Indicator */}
        <div
          className={`p-2.5 rounded-xl shrink-0 ${isCritical ? "bg-rose-100 text-rose-600" : isWarning ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Badge */}
            <span
              className={`text-[9px] font-black tracking-wider uppercase font-mono px-2 py-0.5 rounded-md ${isCritical ? "bg-rose-100/80 text-rose-700" : isWarning ? "bg-amber-100/80 text-amber-700" : "bg-slate-100 text-slate-600"
                }`}
            >
              {alert.severity} • {alert.type}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Updated: {alert.updated}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-black text-slate-800 leading-snug truncate">
              {alert.title}
            </h4>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3 text-slate-400" />
              {alert.location}
            </p>
          </div>
        </div>
      </div>

      {/* SISI KANAN: Price Delta & Tombol Aksi */}
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        {/* Price Delta */}
        <div className="text-left sm:text-right pr-2">
          <span className="text-[9px] text-slate-400 font-bold font-mono block uppercase leading-none mb-0.5">Price Delta</span>
          <span
            // Sebuah alert selalu berarti harga NAIK: agent.classify() hanya
            // mengembalikan Info/Warning/Kritis saat perubahan >= p70, dan p70
            // tiap komoditas positif. Jadi delta di sini tidak pernah negatif,
            // dan hijau membacanya terbalik -- seolah harga aman. Warna angka
            // ini menyatakan ARAH (naik), bukan tingkat keparahan; keparahan
            // sudah dibawa badge dan ikon di sisi kiri. Sama dengan halaman
            // detail alert, yang memakai rose-600 untuk tiap kenaikan.
            className={`text-base font-black font-mono leading-none ${isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-rose-600"
              }`}
          >
            {alert.delta}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => router.push(`/alerts/${alert.id}`)}
            className="text-[11px] font-bold bg-[#006c4a] hover:bg-[#005237] text-white rounded-xl h-8 px-3 shadow-3xs cursor-pointer active:scale-97 transition-all flex items-center gap-1"
          >
            Investigate
            <ArrowUpRight className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.(alert.id);
            }}
            title="Sembunyikan Peringatan"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl h-8 w-8 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}