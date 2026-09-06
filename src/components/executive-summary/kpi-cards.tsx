"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// 1. Definisikan kontrak tipe data eksplisit untuk item KPI
interface KPIData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtext: string;
}

// 2. MOCK DATA LOKAL CADANGAN (Gunakan ini jika di file "@/data/executive" belum ada datanya)
const localExecutiveKPIs: KPIData[] = [
  {
    title: "Total Komoditas Dipantau",
    value: "11 Item",
    change: "+2 minggu ini",
    isPositive: true,
    subtext: "Semua sistem pemantauan aktif nasional"
  },
  {
    title: "Akurasi Prediksi Rata-rata",
    value: "96.4%",
    change: "+0.8% MoM",
    isPositive: true,
    subtext: "Berdasarkan model baseline ensemble"
  },
  {
    title: "Cluster Wilayah Kritis",
    value: "3 Titik",
    change: "-1 area krisis",
    isPositive: false,
    subtext: "Awasi sentra pasokan bawang merah Brebes"
  },
  {
    title: "Efisiensi Logistik",
    value: "91.2%",
    change: "+3.4% proyeksi",
    isPositive: true,
    subtext: "Rekomendasi substitusi moda logistik laut"
  }
];

export function KPICards() {
  // Catatan: Jika Anda ingin tetap mengimpor dari data luar, pastikan file @/data/executive 
  // mengekspor variabel dengan nama array yang sama: "export const executiveKPIs = [...]"
  const activeKPIs = localExecutiveKPIs;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {activeKPIs.map((kpi: KPIData, idx: number) => (
        <div 
          key={idx} 
          className="border border-brand-border/40 bg-brand-card rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
        >
          <p className="text-brand-textMuted text-xs font-medium uppercase tracking-wider">{kpi.title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-bold text-brand-textMain">{kpi.value}</h3>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
              kpi.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              {kpi.isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {kpi.change}
            </span>
          </div>
          <p className="text-[11px] text-brand-textMuted mt-1">{kpi.subtext}</p>
        </div>
      ))}
    </div>
  );
}