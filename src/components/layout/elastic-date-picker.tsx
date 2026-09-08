"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { motion } from "motion/react";

interface ElasticDatePickerProps {
  onRangeChange?: (days: number) => void;
  defaultLabel?: string;
}

export function ElasticDatePicker({ 
  onRangeChange, 
  defaultLabel = "12 bulan terakhir"
}: ElasticDatePickerProps) {
  const [dateRangeText, setDateRangeText] = useState(defaultLabel);

  const presets = [
    { label: "1 bulan", days: 1 },
    { label: "3 bulan", days: 3 },
    { label: "6 bulan", days: 6 },
    { label: "12 bulan terakhir", days: 12 },
  ];

  const handlePresetClick = (label: string, days: number) => {
    setDateRangeText(label);
    if (onRangeChange) onRangeChange(days);
  };

  return (
    <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs h-10">
      <Popover.Root>
        <Popover.Trigger className="flex items-center gap-2 px-3 h-full text-xs font-bold font-mono text-slate-700 outline-none cursor-pointer group rounded-xl hover:bg-slate-50 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
          <span className="max-w-[120px] truncate">{dateRangeText}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors ml-0.5" />
        </Popover.Trigger>
        
        <Popover.Portal>
          <Popover.Positioner side="bottom" sideOffset={6} align="end" className="z-50">
            <Popover.Popup render={
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl font-sans w-80 flex flex-col gap-4.5"
              />
            }>
              <div>
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Quick Select Presets
                </span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-semibold text-blue-600">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p.label, p.days)}
                      className="text-left py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                  Absolute / Custom Range
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block font-mono">FROM</span>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block font-mono">TO</span>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-medium outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
