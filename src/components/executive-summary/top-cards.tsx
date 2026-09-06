"use client";

import { topMetricsData } from "@/data/executive";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { motion } from "motion/react";

export function TopCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {topMetricsData.map((item, idx) => {
        // Parsing nilai string ke number untuk animasi angka
        const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
        const suffix = item.value.replace(/[0-9.]/g, "");

        return (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
            className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
          >
            {/* Bagian Atas Card */}
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold tracking-wider text-brand-textMuted font-mono uppercase">
                {item.title}
              </span>
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: (idx * 0.1) + 0.3 }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                  item.statusType === "positive" ? "text-rose-600 bg-rose-50" :
                  item.statusType === "stable" ? "text-emerald-600 bg-emerald-50 border border-emerald-200" :
                  item.statusType === "surplus" ? "text-teal-600 bg-teal-50" : "text-brand-textMain bg-brand-bgSubtle"
                }`}
              >
                {item.statusText}
              </motion.span>
            </div>

            {/* Bagian Tengah: Nilai Utama Teranimasi */}
            <div className="mt-4 flex items-baseline gap-1">
              <h3 className="text-4xl font-bold tracking-tight text-brand-textMain font-sans">
                <AnimatedNumber 
                  value={numericValue} 
                  suffix={suffix} 
                  decimals={item.value.includes(".") ? 2 : 0} 
                />
              </h3>
              {item.subtext && (
                <span className="text-[11px] font-mono text-brand-textMuted pl-1">
                  {item.subtext}
                </span>
              )}
            </div>

            {/* Bagian Bawah: Sparkline & Dots Teranimasi */}
            <div className="w-full h-8 mt-4 flex items-end">
              {item.chartType === "line-red" && (
                <svg className="w-full h-6 stroke-rose-500 fill-none" strokeWidth="2">
                  <motion.path 
                    d="M0 20 Q 40 5, 85 15 T 190 5" 
                    strokeLinecap="round" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: idx * 0.15, ease: "easeInOut" }}
                  />
                </svg>
              )}
              {item.chartType === "line-green" && (
                <svg className="w-full h-6 stroke-emerald-500 fill-none" strokeWidth="2">
                  <motion.path 
                    d="M0 15 Q 50 10, 100 8 T 190 5" 
                    strokeLinecap="round" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: idx * 0.15, ease: "easeInOut" }}
                  />
                </svg>
              )}
              {item.chartType === "dots" && (
                <div className="flex gap-2 w-full justify-start pb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: (idx * 0.1) + (i * 0.08) }}
                      className={`h-2.5 rounded-full transition-all ${i === 4 ? "w-6 bg-teal-600" : "w-2.5 bg-teal-600/30"}`} 
                    />
                  ))}
                </div>
              )}
              {item.chartType === "bars" && (
                <svg className="w-full h-6 stroke-teal-600 fill-none" strokeWidth="2">
                  <motion.path 
                    d="M0 18 L 60 14 L 120 10 L 190 4" 
                    strokeLinecap="round" 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: idx * 0.15, ease: "easeInOut" }}
                  />
                </svg>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}