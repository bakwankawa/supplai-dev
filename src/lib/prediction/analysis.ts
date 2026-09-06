import { generatedTimeSeriesMaster, type TimeSeriesPoint } from "@/data/prediction-chart";
import { commodities } from "@/data/commodities";
import mapeData from "@/data/generated/commodity_mape.json";

export const money = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
export const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
export const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
export type AnalysisInput = { commodityId: string; regions: string[]; startDate: string; endDate: string };
export type RegionProjection = {
  region: string;
  baseline: TimeSeriesPoint | null;
  forecasts: TimeSeriesPoint[];
  last: TimeSeriesPoint | null;
  change: number | null;
  changePercent: number | null;
};

export function analyzePrediction(input: AnalysisInput) {
  const commodity = commodities.find((item) => item.id === input.commodityId);
  if (!commodity) throw new Error("Komoditas tidak tersedia.");
  const group = generatedTimeSeriesMaster[input.commodityId] || {};
  const validRange = Boolean(input.startDate && input.endDate && input.startDate <= input.endDate);
  const regions: RegionProjection[] = input.regions.map((region) => {
    const points = [...(group[region] || [])].sort((a, b) => a.date.localeCompare(b.date));
    const baseline = points.find((point) => point.isToday && !point.isFuture) ?? points.filter((point) => !point.isFuture).at(-1) ?? null;
    const forecasts = validRange ? points.filter((point) => point.isFuture && point.date >= input.startDate && point.date <= input.endDate) : [];
    const last = forecasts.at(-1) ?? null;
    const change = baseline && last ? last.price - baseline.price : null;
    return { region, baseline, forecasts, last, change, changePercent: baseline && baseline.price > 0 && change !== null ? change / baseline.price * 100 : null };
  });
  const comparable = regions.filter((row) => row.baseline && row.last && row.changePercent !== null);
  // Aggregate only matching baseline and forecast dates; never compare different horizons.
  const commonDates = comparable.length > 0 && new Set(comparable.map((row) => row.baseline!.date)).size === 1 && new Set(comparable.map((row) => row.last!.date)).size === 1;
  const complete = comparable.length === regions.length && regions.length > 0 && commonDates;
  const baselinesComplete = regions.length > 0 && regions.every((row) => row.baseline) && new Set(regions.map((row) => row.baseline!.date)).size === 1;
  const currentPrice = baselinesComplete ? regions.reduce((sum, row) => sum + row.baseline!.price, 0) / regions.length : null;
  const predictedPrice = complete ? comparable.reduce((sum, row) => sum + row.last!.price, 0) / comparable.length : null;
  const change = currentPrice !== null && predictedPrice !== null ? predictedPrice - currentPrice : null;
  const changePercent = currentPrice && change !== null ? change / currentPrice * 100 : null;
  const baselineDate = regions.find((row) => row.baseline)?.baseline?.date ?? null;
  const forecastDate = complete ? comparable[0].last!.date : null;
  const mape = (mapeData as Record<string, number>)[input.commodityId] ?? null;
  const direction = changePercent === null ? "Belum dapat disimpulkan" : changePercent > 0.5 ? "Cenderung naik" : changePercent < -0.5 ? "Cenderung turun" : "Relatif stabil";
  const signal = changePercent === null || mape === null ? "Belum tersedia" : Math.abs(changePercent) > mape ? "Perubahan lebih besar dari MAPE historis" : "Perubahan masih kecil dibanding MAPE historis";
  const narrative = complete && currentPrice !== null && predictedPrice !== null && changePercent !== null
    ? `Harga ${commodity.name.toLowerCase()} di ${regions.length === 1 ? regions[0].region : `${regions.length} wilayah terpilih`} diproyeksikan ${direction.toLowerCase()}, dari ${money(currentPrice)}/${commodity.unit} pada ${monthLabel(baselineDate!)} menjadi ${money(predictedPrice)}/${commodity.unit} pada ${monthLabel(forecastDate!)}. Perubahan rata-rata sebesar ${percent(changePercent)} atau ${money(Math.abs(change!))}/${commodity.unit}. Rata-rata ini memberi bobot yang sama pada setiap wilayah, bukan berdasarkan volume perdagangan.`
    : `Belum tersedia proyeksi yang dapat dibandingkan untuk seluruh wilayah pada rentang ini. Pilih periode yang mencakup bulan prediksi dan wilayah dengan data lengkap. Data historis tetap dapat diperiksa pada grafik.`;
  const regionalNarratives = regions.map((row) => row.baseline && row.last && row.changePercent !== null
    ? `${row.region}: ${money(row.baseline.price)} menjadi ${money(row.last.price)}/${commodity.unit} (${percent(row.changePercent)}) pada ${monthLabel(row.last.date)}.`
    : `${row.region}: tidak tersedia pasangan harga acuan dan prediksi pada rentang terpilih.`);
  const costPerTon = change !== null && commodity.unit === "kg" ? change * 1000 : null;
  const budgetNarrative = costPerTon === null ? "Simulasi anggaran belum tersedia."
    : `Untuk volume ilustratif 1 ton, nilai pembelian ${costPerTon > 0 ? "bertambah" : costPerTon < 0 ? "berkurang" : "tetap"} sekitar ${money(Math.abs(costPerTon))}, jika volume dan komposisi wilayah tetap. Perhitungan hanya perubahan harga dikali 1.000 kg; belum termasuk ongkos angkut, pajak, mutu, dan biaya penyimpanan.`;
  const businessActions = changePercent === null
    ? ["Lengkapi periode dan wilayah sebelum menyusun rencana pengadaan."]
    : changePercent > 0.5
      ? ["Bandingkan penawaran pemasok untuk bulan pengadaan yang dipilih; pertimbangkan pembelian bertahap sesuai kebutuhan riil.", "Periksa dampak kenaikan terhadap anggaran dan margin; konfirmasi stok, daya simpan, serta biaya distribusi sebelum menambah persediaan."]
      : changePercent < -0.5
        ? ["Tinjau jadwal pembelian bertahap dan negosiasi ulang penawaran; hindari menumpuk stok tanpa kepastian kebutuhan.", "Periksa risiko penurunan nilai persediaan dan margin penjualan; harga turun tidak otomatis berarti pasokan aman."]
        : ["Pertahankan jadwal pengadaan berbasis kebutuhan dan bandingkan harga pemasok secara berkala.", "Utamakan ketepatan volume serta efisiensi distribusi; perubahan harga yang kecil belum cukup untuk mengubah kebijakan secara besar."];
  const institutionalActions = [
    "Validasi sinyal dengan harga pasar terbaru dan ketersediaan stok di wilayah yang dipantau.",
    "Prioritaskan pemeriksaan wilayah dengan kenaikan terbesar; koordinasikan informasi pasokan dan jalur distribusi sebelum menetapkan intervensi.",
    "Dokumentasikan tanggal data, asumsi volume, penanggung jawab, dan hasil evaluasi ulang sebelum keputusan anggaran atau operasi pasar.",
  ];
  const coverageDates = validRange ? [...new Set(regions.flatMap((row) => (group[row.region] || []).filter((point) => point.date >= input.startDate && point.date <= input.endDate).map((point) => point.date)))].sort() : [];
  const history = coverageDates.map((date) => ({ date, values: regions.map((row) => (group[row.region] || []).find((point) => point.date === date) ?? null) }));
  const missingMonths = coverageDates.filter((date) => regions.some((row) => !(group[row.region] || []).some((point) => point.date === date)));
  const caveats = [
    `Data acuan terakhir: ${baselineDate ? monthLabel(baselineDate) : "tidak tersedia"}. Prediksi adalah hasil ekspor data, bukan harga pasar langsung pada hari laporan dibuat.`,
    mape === null ? "MAPE komoditas belum tersedia." : `MAPE ${mape.toLocaleString("id-ID")}% adalah rata-rata kesalahan persentase absolut pada evaluasi historis horizon satu bulan. Bukan peluang benar, batas toleransi, atau interval keyakinan prediksi tiga bulan.`,
    "Narasi disusun otomatis dengan aturan penjelasan dari hasil ML, bukan oleh model bahasa generatif. Penyebab seperti cuaca, stok, dan kebijakan tidak disimpulkan dari harga saja.",
    "Kategori arah memakai batas deskriptif +/-0,5%; perbandingan dengan MAPE hanya konteks besaran kesalahan, bukan uji signifikansi statistik atau status darurat resmi.",
    "Rekomendasi merupakan bahan telaah. Konfirmasi kondisi lapangan, kontrak, kewenangan, dan biaya sebelum keputusan bisnis atau kelembagaan.",
    ...(missingMonths.length ? [`Data tidak lengkap untuk seluruh wilayah pada ${missingMonths.map(monthLabel).join(", ")}. Bulan tersebut tidak digabungkan dalam grafik perbandingan.`] : []),
  ];
  return { ...input, commodity, regions, complete, currentPrice, predictedPrice, change, changePercent, baselineDate, forecastDate, mape, direction, signal, narrative, regionalNarratives, costPerTon, budgetNarrative, businessActions, institutionalActions, history, caveats };
}
export type PredictionAnalysis = ReturnType<typeof analyzePrediction>;
