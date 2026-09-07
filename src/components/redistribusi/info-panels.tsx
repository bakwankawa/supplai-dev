"use client";

import type { RedistributionProvince } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface SurplusPanelProps {
  provinces: RedistributionProvince[];
}

export function SurplusPanel({ provinces }: SurplusPanelProps) {
  const surplusData = provinces.filter(p => p.status === "surplus");

  return (
    <div className="w-full">
      {surplusData.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center italic">Tidak ada data wilayah surplus.</p>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
          {surplusData
            .slice()
            .sort((a, b) => b.stock - a.stock)
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-100 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#006c4a]">{formatNumber(p.stock)} t</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Counts come from the solved plan. They were hard-coded as "8 Provinsi" and
// "10+ Wilayah", which sat under live-looking PRODUSEN/KONSUMEN labels and kept
// claiming both even for a commodity the solver returned no routes for.
export function MethodPanel({ sources = 0, destinations = 0 }: { sources?: number; destinations?: number }) {
  const label = (n: number, unit: string) => `${n} ${unit}`;
  return (
    <div className="space-y-5 h-full flex flex-col justify-between">
      <div className="space-y-3">
        <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
          <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
          <h3 className="text-lg font-bold text-slate-800">Metode Alokasi</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Rencana ini dipecahkan sebagai <span className="font-bold text-[#006c4a]">program linier</span> oleh{" "}
          <span className="font-bold text-[#006c4a]">HiGHS</span> (<span className="font-mono">scipy.optimize.linprog</span>,{" "}
          <span className="font-mono">method=&quot;highs&quot;</span>), dengan tujuan meminimalkan total biaya angkut nasional.
          HiGHS sendiri yang memilih simpleks atau titik-dalam, jadi metodenya tidak kami tetapkan dan tidak kami klaim.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {/* Not "Produsen": we have no per-province production data at all —
              the honesty ledger on this same page says so. These are the
              provinces the solver drew routes out of and into, nothing more. */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100/60 p-3 text-center">
            <span className="text-[10px] text-emerald-700 font-mono font-bold uppercase block">Wilayah Asal</span>
            <span className="text-lg font-black text-emerald-800">{label(sources, "Provinsi")}</span>
          </div>
          <div className="rounded-xl bg-rose-50/70 border border-rose-100/60 p-3 text-center">
            <span className="text-[10px] text-rose-700 font-mono font-bold uppercase block">Wilayah Tujuan</span>
            <span className="text-lg font-black text-rose-800">{label(destinations, "Wilayah")}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-slate-700">
          <p className="font-bold text-slate-800 mb-1">Objective Function (Fungsi Tujuan):</p>
          <div className="font-mono bg-slate-900 text-emerald-400 rounded-xl px-3 py-2 text-[11px] font-bold shadow-xs">
            min Z = ∑ (Cost × Volume × Distance)
          </div>
        </div>

        <div className="text-[11px] text-slate-400 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {/* The three constraints supplai/match.py actually builds into A_ub.
              The list here used to name a fleet-capacity term and a buffer-stock
              term, neither of which exists — and the first contradicted the
              ledger further down this page, which states we have no per-province
              production data. */}
          <p className="font-bold text-slate-700">Parameter Batasan / Constraints:</p>
          <ul className="list-disc list-inside space-y-0.5 font-medium">
            <li>
              Provinsi asal mengirim <span className="font-bold text-slate-600">maksimal 10% konsumsi bulanannya sendiri</span> —
              batas yang kami tetapkan, bukan kami ukur, karena data produksi per provinsi tidak tersedia bagi kami.
            </li>
            <li>
              Provinsi tujuan menerima <span className="font-bold text-slate-600">sekurang-kurangnya kebutuhan terukurnya</span> —
              populasi × konsumsi per kapita × elastisitas harga sendiri × kenaikan yang diprediksi.
            </li>
            <li>
              Total tonase dibatasi <span className="font-bold text-slate-600">neraca ketersediaan dan kebutuhan nasional</span>,
              bila komoditas itu punya neraca. Bawang Putih tidak punya, sehingga rencananya berjalan tanpa pagu.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}