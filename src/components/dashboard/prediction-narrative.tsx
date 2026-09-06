import { FileText, Info } from "lucide-react";
import { type PredictionAnalysis, monthLabel } from "@/lib/prediction/analysis";

export function PredictionNarrative({ analysis: a }: { analysis: PredictionAnalysis }) {
  return (
    <section aria-labelledby="prediction-narrative-title" className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 id="prediction-narrative-title" className="flex items-center gap-2 text-lg font-bold text-[#006c4a]"><FileText className="h-5 w-5" />Penjelasan Hasil Prediksi</h2>
          <p className="text-xs text-slate-500 mt-1">Ringkasan otomatis dari hasil pembelajaran mesin (ML), mengikuti filter yang dipilih.</p>
        </div>
        <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{a.direction}</span>
      </div>
      <p className="text-sm leading-7 text-slate-700">{a.narrative}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Perbedaan antarwilayah</h3>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">{a.regionalNarratives.map((text) => <li key={text}>{text}</li>)}</ul>
        </div>
        <div className="rounded-xl bg-emerald-50/60 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Ilustrasi dampak anggaran</h3>
          <p className="text-sm leading-6 text-slate-600">{a.budgetNarrative}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div><h3 className="text-sm font-bold text-slate-800 mb-2">Pertimbangan bisnis</h3><ul className="list-disc pl-4 space-y-2 text-sm leading-6 text-slate-600">{a.businessActions.map((text) => <li key={text}>{text}</li>)}</ul></div>
        <div><h3 className="text-sm font-bold text-slate-800 mb-2">Pertimbangan kelembagaan</h3><ul className="list-disc pl-4 space-y-2 text-sm leading-6 text-slate-600">{a.institutionalActions.map((text) => <li key={text}>{text}</li>)}</ul></div>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{a.signal}. MAPE mengukur kesalahan historis satu bulan, bukan kepastian prediksi. Acuan data: {a.baselineDate ? monthLabel(a.baselineDate) : "belum tersedia"}; harga lapangan perlu diperbarui sebelum keputusan. Narasi memakai aturan penjelasan hasil ML, bukan model bahasa generatif.</p>
      </div>
      <details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Metode dan batasan analisis</summary><ul className="mt-3 list-disc pl-4 space-y-2 leading-5">{a.caveats.map((text) => <li key={text}>{text}</li>)}</ul></details>
    </section>
  );
}
