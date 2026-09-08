"use client";

import type { Postur } from "@/lib/types";
import { POSTUR, POSTUR_LABEL } from "@/lib/redistribusi/postur";

interface PostureSwitchProps {
  value: Postur;
  onChange: (postur: Postur) => void;
  compact?: boolean;
}

export function PostureSwitch({ value, onChange, compact = false }: PostureSwitchProps) {
  return (
    <div className="space-y-2">
      <div className={`${compact ? "flex w-full" : "inline-flex"} rounded-xl border border-slate-300 bg-white p-1 shadow-xs`}>
        {POSTUR.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={p === value}
            className={`${compact ? "min-w-0 flex-1 px-2" : "px-3"} whitespace-nowrap py-1.5 text-xs font-bold rounded-lg transition-colors ${
              p === value ? "bg-[#006c4a] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {POSTUR_LABEL[p].nama}
          </button>
        ))}
      </div>
      {!compact && <p className="text-[11px] font-medium text-slate-500 max-w-md leading-relaxed">{POSTUR_LABEL[value].arti}</p>}
    </div>
  );
}
