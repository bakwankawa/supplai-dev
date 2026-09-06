"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";

// PERBAIKAN 1: Impor dialihkan langsung dari master data prediksi `generatedTimeSeriesMaster`
import { generatedTimeSeriesMaster } from "../../data/prediction-chart";

const formatYAxis = (value: number) => `Rp ${(value / 1000)}k`;

const CITY_COLORS = [
  { stroke: "#006c4a", fill: "#10B981", name: "Kota 1" },
  { stroke: "#0284c7", fill: "#3b82f6", name: "Kota 2" },
  { stroke: "#d97706", fill: "#f59e0b", name: "Kota 3" }
];

// Interface untuk data point individu agar aman dari implicit 'any'
interface TimeSeriesPoint {
  date: string;
  price: number;
  historical?: number;
  predicted?: number;
  lowerCI?: number;
  upperCI?: number;
  isToday?: boolean;
  isFuture?: boolean;
}

const CustomTooltip = ({ active, payload, label, selectedRegions }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xl font-sans min-w-[200px]">
        <span className="text-[10px] font-bold tracking-wider text-brand-textMuted font-mono uppercase block border-b border-brand-border/60 pb-1.5 mb-2">
          DATE: {label}
        </span>
        <div className="space-y-2 text-xs">
          {selectedRegions.map((regionName: string, idx: number) => {
            const histVal = payload.find((p: any) => p.dataKey === `hist_${idx}`)?.value;
            const predVal = payload.find((p: any) => p.dataKey === `pred_${idx}`)?.value;
            const activeVal = predVal !== undefined ? predVal : histVal;
            const color = CITY_COLORS[idx % CITY_COLORS.length].stroke;

            if (activeVal === undefined) return null;

            return (
              <div key={idx} className="flex flex-col border-b border-brand-bgSubtle last:border-0 pb-1 last:pb-0">
                <div className="flex items-center gap-1.5 font-bold text-brand-textMain">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate max-w-[120px]">{regionName}</span>
                </div>
                <div className="flex justify-between items-center pl-3 text-brand-textMuted mt-0.5">
                  <span>{predVal !== undefined ? "Forecast" : "Actual"}:</span>
                  <span className="font-bold font-mono text-brand-textMain">
                    Rp {activeVal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

interface PredictionChartProps {
  selectedCommodity: string;
  selectedRegions: string[];
}

export function PredictionChart({ selectedCommodity, selectedRegions }: PredictionChartProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [selectedCommodity, selectedRegions]);

  const combinedChartData = useMemo(() => {
    const dates = ["Aug 14", "Aug 17", "Aug 21", "Aug 24 (Today)", "Aug 28", "Sept 01", "Sept 07"];
    
    // Gunakan data dari master time series
    const commodityGroup = generatedTimeSeriesMaster[selectedCommodity] || {};

    return dates.map((date) => {
      const row: any = { date };

      selectedRegions.forEach((region, index) => {
        const regionData: TimeSeriesPoint[] = commodityGroup[region] || [];
        
        // PERBAIKAN 2: Berikan anotasi tipe `TimeSeriesPoint` pada argumen `d`
        const dataPoint = regionData.find((d: TimeSeriesPoint) => d.date === date);
        
        if (dataPoint) {
          // Normalisasi pemetaan properti price historis vs prediktif masa depan
          if (!dataPoint.isFuture) {
            row[`hist_${index}`] = dataPoint.price;
          } else {
            row[`pred_${index}`] = dataPoint.price;
          }
          
          // Simulasi fallback jika nilai batas bawah atas CI tidak disuplai dari API
          row[`low_${index}`] = dataPoint.lowerCI ?? Math.round(dataPoint.price * 0.96);
          row[`up_${index}`] = dataPoint.upperCI ?? Math.round(dataPoint.price * 1.04);
          
          if (dataPoint.isToday) {
            row.isToday = true;
          }
        }
      });

      return row;
    });
  }, [selectedCommodity, selectedRegions]);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[280px] flex flex-col justify-between p-2 animate-pulse">
        <div className="flex-1 flex items-end gap-3 px-4">
          <div className="w-full h-[45%] bg-brand-bgSubtle rounded-t-lg" />
          <div className="w-full h-[55%] bg-brand-bgSubtle rounded-t-lg" />
          <div className="w-full h-[35%] bg-brand-bgSubtle rounded-t-lg" />
        </div>
        <div className="h-4 w-full bg-brand-bgSubtle rounded mt-4" />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[280px] pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={combinedChartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D6" opacity={0.25} vertical={false} />
          
          <XAxis 
            dataKey="date" 
            tickLine={false}
            axisLine={false}
            stroke="#5D5D5D"
            style={{ fontSize: "10px", fontWeight: "500" }}
            dy={10}
          />
          
          <YAxis 
            domain={["auto", "auto"]}
            tickFormatter={formatYAxis}
            tickLine={false}
            axisLine={false}
            stroke="#5D5D5D"
            style={{ fontSize: "10px" }}
            dx={-5}
          />
          
          <Tooltip 
            content={<CustomTooltip selectedRegions={selectedRegions} />} 
            cursor={{ stroke: "#006c4a", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          {selectedRegions.map((_, index) => {
            const colors = CITY_COLORS[index % CITY_COLORS.length];
            return (
              <g key={index}>
                {/* PERBAIKAN 3: CI Shade diperbaiki menggunakan array rentang data [low, high] pada properti dataKey */}
                {index === 0 && (
                  <Area isAnimationActive={false}
                    type="monotone"
                    dataKey={(data) => [data.low_0, data.up_0]}
                    stroke="none"
                    fill={colors.fill}
                    fillOpacity={0.05}
                  />
                )}

                {/* Garis Historis */}
                <Line isAnimationActive={false}
                  type="monotone"
                  dataKey={`hist_${index}`}
                  stroke={colors.stroke}
                  strokeWidth={2}
                  strokeOpacity={0.4}
                  dot={false}
                />

                {/* Garis Prediksi */}
                <Line isAnimationActive={false}
                  type="monotone"
                  dataKey={`pred_${index}`}
                  stroke={colors.stroke}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: colors.stroke }}
                  activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                />
              </g>
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}