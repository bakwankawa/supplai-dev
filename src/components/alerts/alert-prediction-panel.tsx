"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generatedTimeSeriesMaster } from "@/data/prediction-chart";
import { analyzePrediction, monthLabel } from "@/lib/prediction/analysis";

function monthsBefore(iso: string, months: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

function rupiah(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function AlertPredictionPanel({ commodityId, region }: { commodityId: string; region: string }) {
  const series = useMemo(
    () => generatedTimeSeriesMaster[commodityId]?.[region] ?? [],
    [commodityId, region],
  );
  const dataEnd = series.at(-1)?.date ?? "";
  const baseline = series.find((point) => point.isToday)?.date ?? series.filter((point) => !point.isFuture).at(-1)?.date ?? dataEnd;
  const [monthsBack, setMonthsBack] = useState(12);
  const startDate = dataEnd ? monthsBefore(baseline || dataEnd, monthsBack) : "";

  const chartData = useMemo(
    () => series.filter((point) => point.date >= startDate && point.date <= dataEnd),
    [dataEnd, series, startDate],
  );
  const analysis = useMemo(
    () => analyzePrediction({ commodityId, regions: [region], startDate, endDate: dataEnd }),
    [commodityId, dataEnd, region, startDate],
  );
  const isDown = (analysis.change ?? 0) < 0;
  const unit = analysis.commodity.unit || "kg";

  const metrics = [
    {
      label: "Harga rata-rata",
      value: analysis.currentPrice === null ? "Belum tersedia" : `${rupiah(analysis.currentPrice)}/${unit}`,
      note: analysis.baselineDate ? monthLabel(analysis.baselineDate) : "Bulan acuan belum tersedia",
      valueClass: "text-slate-900",
    },
    {
      label: "Rata-rata perubahan",
      value: analysis.change === null ? "Belum tersedia" : `${isDown ? "↓" : "↑"} ${rupiah(Math.abs(analysis.change))}`,
      note: analysis.direction,
      valueClass: isDown ? "text-emerald-600" : "text-rose-600",
    },
    {
      label: "Rata-rata prediksi",
      value: analysis.predictedPrice === null ? "Belum tersedia" : `${rupiah(analysis.predictedPrice)}/${unit}`,
      note: analysis.forecastDate ? monthLabel(analysis.forecastDate) : "Prediksi belum tersedia",
      valueClass: "text-slate-900",
    },
    {
      label: "MAPE (Mean Absolute Percentage Error)",
      value: analysis.mape === null ? "Belum tersedia" : `${analysis.mape.toLocaleString("id-ID")}%`,
      note: "Evaluasi historis 1 bulan",
      valueClass: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="flex min-h-32 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
            <p className={`mt-3 text-xl font-black tracking-tight ${metric.valueClass}`}>{metric.value}</p>
            <p className={`mt-2 text-xs font-semibold ${metric.valueClass === "text-slate-900" ? "text-slate-400" : metric.valueClass}`}>{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Pergerakan harga 1–3 bulan</p>
            <p className="mt-1 text-xs text-slate-500">Riwayat dan proyeksi {analysis.commodity.name} di {region}.</p>
          </div>
          <div className="flex w-fit items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {[[3, "3 Bulan"], [6, "6 Bulan"], [12, "1 Tahun"]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMonthsBack(Number(value))} aria-pressed={monthsBack === value} className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors ${monthsBack === value ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>{label}</button>
            ))}
          </div>
        </div>

        {chartData.length ? (
          <div className="mt-4 h-[280px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="displayDate" tickLine={false} axisLine={false} stroke="#94a3b8" style={{ fontSize: "10px", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} style={{ fontSize: "9px" }} domain={["auto", "auto"]} />
                <Tooltip formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Harga"]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                <ReferenceLine x={chartData.find((point) => point.isToday)?.displayDate} stroke="#f43f5e" strokeDasharray="3 3" />
                <Line isAnimationActive={false} type="monotone" dataKey="price" name={region} stroke="#006c4a" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">Data prediksi harga untuk wilayah ini belum tersedia.</p>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500">Garis merah menandai bulan acuan data terakhir. Bagian setelah bulan acuan merupakan prediksi, bukan harga yang sudah teramati.</p>
      </div>
    </div>
  );
}
