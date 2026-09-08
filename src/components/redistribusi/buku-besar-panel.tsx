"use client";

import { bukuBesar } from "@/data/buku-besar";
import { Badge } from "@/components/ui/badge";
import { BUKU_BESAR_STATUS_LABEL } from "@/lib/redistribusi/buku-besar";

export function BukuBesarPanel() {
  const terukur = bukuBesar.filter((e) => e.status === "terukur").length;
  const diasumsikan = bukuBesar.filter((e) => e.status === "diasumsikan").length;
  const diturunkan = bukuBesar.filter((e) => e.status === "diturunkan").length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-6 text-slate-500">
        Setiap angka yang dipakai perhitungan ini, beserta asalnya.{" "}
        <span className="font-bold text-slate-700">
          {terukur} dari {bukuBesar.length}
        </span>{" "}
        berasal dari sumber yang dapat diperiksa. {diasumsikan} kami tetapkan sendiri
        berdasarkan penilaian profesional. {diturunkan} dihitung dari masukan lain dan mewarisi
        tingkat kepercayaan mereka. Semua ditandai sesuai jenisnya.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {bukuBesar.map((e) => (
          <div key={e.input} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{e.input}</span>
              <Badge variant={BUKU_BESAR_STATUS_LABEL[e.status].badgeVariant} className="shrink-0">
                {BUKU_BESAR_STATUS_LABEL[e.status].label}
              </Badge>
            </div>
            <p className="text-xs font-bold text-[#006c4a]">{e.nilai}</p>
            <p className="text-xs leading-5 text-slate-500">{e.sumber}</p>
            <p className="text-xs text-slate-400">Tahun: {e.tahun}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
