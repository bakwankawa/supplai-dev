"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react"; // PERBAIKAN: Impor AnimatePresence telah ditambahkan

interface AlertFiltersProps {
  severity: string | null;
  status: string | null;
  commodity: string | null;
  onSeverityChange: (val: string | null) => void;
  onStatusChange: (val: string | null) => void;
  onCommodityChange: (val: string | null) => void;
}

const ThinChevron = () => (
  <svg 
    className="w-3.5 h-3.5 text-slate-400 opacity-80" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const AVAILABLE_COMMODITIES = [
  { id: "beras", name: "Beras Medium" },
  { id: "bawang-merah", name: "Bawang Merah" },
  { id: "bawang-putih", name: "Bawang Putih" },
  { id: "daging-ayam", name: "Daging Ayam" },
  { id: "telur-ayam", name: "Telur Ayam" },
  { id: "minyak-goreng", name: "Minyak Goreng" }
];

const SEVERITY_OPTIONS = [
  { id: "CRITICAL", name: "Critical" },
  { id: "WARNING", name: "Warning" },
  { id: "INFO", name: "Info" }
];

const STATUS_OPTIONS = [
  { id: "ACTIVE", name: "Active" },
  { id: "INVESTIGATING", name: "Investigating" },
  { id: "RESOLVED", name: "Resolved" }
];

export function AlertFilters({
  severity,
  status,
  commodity,
  onSeverityChange,
  onStatusChange,
  onCommodityChange,
}: AlertFiltersProps) {
  const [isSevOpen, setIsSevOpen] = useState(false);
  const [isStatOpen, setIsStatOpen] = useState(false);
  const [isCommOpen, setIsCommOpen] = useState(false);
  const [searchComm, setSearchComm] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSevOpen(false);
        setIsStatOpen(false);
        setIsCommOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCommodities = useMemo(() => {
    return AVAILABLE_COMMODITIES.filter(c => c.name.toLowerCase().includes(searchComm.toLowerCase()));
  }, [searchComm]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative">
      
      {/* SEVERITY LEVEL */}
      <div className="space-y-1.5 relative">
        <label className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block">
          Severity Level
        </label>
        <div 
          onClick={() => { setIsSevOpen(!isSevOpen); setIsStatOpen(false); setIsCommOpen(false); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer hover:border-slate-300 transition-all"
        >
          <span>{SEVERITY_OPTIONS.find(o => o.id === severity)?.name || "All Severities"}</span>
          <ThinChevron />
        </div>
        <AnimatePresence>
          {isSevOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5"
            >
              <div 
                onClick={() => { onSeverityChange(null); setIsSevOpen(false); }}
                className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${!severity ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                All Severities
              </div>
              {SEVERITY_OPTIONS.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => { onSeverityChange(opt.id); setIsSevOpen(false); }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${severity === opt.id ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {opt.name}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RESOLUTION STATUS */}
      <div className="space-y-1.5 relative">
        <label className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block">
          Resolution Status
        </label>
        <div 
          onClick={() => { setIsStatOpen(!isStatOpen); setIsSevOpen(false); setIsCommOpen(false); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer hover:border-slate-300 transition-all"
        >
          <span>{STATUS_OPTIONS.find(o => o.id === status)?.name || "All Statuses"}</span>
          <ThinChevron />
        </div>
        <AnimatePresence>
          {isStatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5"
            >
              <div 
                onClick={() => { onStatusChange(null); setIsStatOpen(false); }}
                className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${!status ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                All Statuses
              </div>
              {STATUS_OPTIONS.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => { onStatusChange(opt.id); setIsStatOpen(false); }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${status === opt.id ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {opt.name}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* COMMODITY TYPE */}
      <div className="space-y-1.5 relative">
        <label className="text-[10px] font-bold tracking-wider text-slate-400 font-mono uppercase block">
          Commodity Type
        </label>
        <div 
          onClick={() => { setIsCommOpen(!isCommOpen); setIsSevOpen(false); setIsStatOpen(false); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer hover:border-slate-300 transition-all"
        >
          <span>{AVAILABLE_COMMODITIES.find(o => o.id === commodity)?.name || "All Commodities"}</span>
          <ThinChevron />
        </div>
        <AnimatePresence>
          {isCommOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2"
            >
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari komoditas..." 
                  value={searchComm}
                  onChange={(e) => setSearchComm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#006c4a] font-bold"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                <div 
                  onClick={() => { onCommodityChange(null); setIsCommOpen(false); setSearchComm(""); }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${!commodity ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  All Commodities
                </div>
                {filteredCommodities.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => { onCommodityChange(c.id); setIsCommOpen(false); setSearchComm(""); }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${commodity === c.id ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}