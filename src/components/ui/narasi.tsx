import { Sparkles, BookOpen } from "lucide-react";
import { narasiModel } from "@/data/narasi";

/** Machine-generated prose. Visually distinct from human-written text, and
 *  labelled, because a reader must never have to guess which sentences a model
 *  wrote. Every numeral in this text was checked against the computed figures
 *  before it shipped; the reasoning around them was not. */
export function Narasi({ teks }: { teks: string | null }) {
  if (!teks) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
          Ditulis model bahasa
        </span>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">{teks}</p>
      <p className="text-[10px] text-violet-600/80 leading-relaxed">
        Disusun {narasiModel} dari angka yang sudah dihitung pipeline, lalu diperiksa
        ulang: setiap angka dalam teks ini harus cocok dengan angka aslinya.
        Penalarannya tidak ikut diperiksa.
      </p>
    </div>
  );
}

/** Human-written, human-reviewed explanation of what a feature is. Static on
 *  purpose: this text does not change when the data changes, so generating it
 *  would add a hallucination surface to something that can simply be correct. */
export function Penjelas({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {judul}
        </span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{isi}</p>
    </div>
  );
}
