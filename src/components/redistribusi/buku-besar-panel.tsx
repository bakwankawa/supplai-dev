"use client";

import { bukuBesar } from "@/data/buku-besar";
import { Badge } from "@/components/ui/badge";

export function BukuBesarPanel() {
  const terukur = bukuBesar.filter((e) => e.status === "terukur").length;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
        Setiap angka yang dipakai perhitungan ini, beserta asalnya.{" "}
        <span className="font-bold text-slate-700">
          {terukur} dari {bukuBesar.length}
        </span>{" "}
        berasal dari sumber yang dapat diperiksa; sisanya kami tetapkan sendiri dan
        ditandai demikian.
      </p>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {bukuBesar.map((e) => (
          <div key={e.input} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{e.input}</span>
              <Badge variant={e.status === "terukur" ? "default" : "outline"} className="shrink-0">
                {e.status === "terukur" ? "Terukur" : "Diasumsikan"}
              </Badge>
            </div>
            <p className="text-[11px] font-bold text-[#006c4a]">{e.nilai}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">{e.sumber}</p>
            <p className="text-[10px] text-slate-400">Tahun: {e.tahun}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
