"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BarChart2, Map, ShieldAlert, Settings } from "lucide-react";

export function ShortcutCards() {
  const router = useRouter();

  const shortcuts = [
    {
      title: "Prediction",
      desc: "Analisis proyeksi pergerakan harga komoditas 1–3 bulan ke depan.",
      path: "/dashboard",
      icon: BarChart2,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Heatmap",
      desc: "Pantau sebaran spasial suplai dan deteksi wilayah defisit.",
      path: "/heatmap",
      icon: Map,
      color: "bg-sky-50 text-sky-700 border-sky-100",
    },
    {
      title: "Redistribution",
      desc: "Kelola rute logistik armada pengiriman antar wilayah.",
      path: "/redistribusi",
      icon: ShieldAlert,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Alerts",
      desc: "Tindak lanjuti warkat peringatan dini krisis pangan.",
      path: "/alerts",
      icon: Settings,
      color: "bg-rose-50 text-rose-700 border-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {shortcuts.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={() => router.push(card.path)}
            className="border border-slate-200 bg-white p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-3xs hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer group"
          >
            <div className="space-y-2">
              <div className={`p-2.5 rounded-xl border w-fit ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#006c4a] transition-colors">
                {card.title}
              </h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {card.desc}
              </p>
            </div>
            
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 group-hover:text-[#006c4a] transition-colors pt-2 border-t border-slate-50">
              Buka Modul
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
}