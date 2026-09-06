import { jsPDF } from "jspdf";
import { type PredictionAnalysis, money, monthLabel, percent } from "./analysis";

// Draw text and vector graphics directly. No DOM screenshots or browser print.
export function createPredictionReport(a: PredictionAnalysis) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const left = 18, width = 174, bottom = 272;
  const green = "#006C4A", ink = "#182B38", muted = "#536775";
  let y = 29;
  const clean = (text: string) => text.replace(/[–—−]/g, "-").replace(/\u00a0/g, " ");
  const header = () => {
    doc.setFillColor(green); doc.rect(0, 0, 210, 4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(green); doc.text("SUPPLAI  /  INTELIJEN HARGA PANGAN", left, 15);
    doc.setDrawColor("#DCE5E7"); doc.line(left, 20, 192, 20);
  };
  const nextPage = () => { doc.addPage(); y = 29; header(); };
  const ensure = (height: number) => { if (y + height > bottom) nextPage(); };
  const paragraph = (text: string, size = 10, color = ink) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    for (const line of lines) { ensure(5.2); doc.text(line, left, y); y += 5.2; }
    y += 2;
  };
  const heading = (text: string) => {
    ensure(20); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(green); doc.text(clean(text), left, y); y += 8;
  };
  const bullets = (items: string[]) => items.forEach((text, index) => paragraph(`${index + 1}. ${text}`, 9.5));
  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const drawRow = (cells: string[], isHeader: boolean) => {
      doc.setFont("helvetica", isHeader ? "bold" : "normal"); doc.setFontSize(8);
      const lines = cells.map((cell, i) => doc.splitTextToSize(clean(cell), widths[i] - 4) as string[]);
      const height = Math.max(...lines.map((list) => list.length)) * 4 + 5;
      doc.setFillColor(isHeader ? "#EAF3EF" : "#FFFFFF"); doc.rect(left, y, width, height, "F");
      doc.setTextColor(isHeader ? green : ink);
      let x = left;
      lines.forEach((list, i) => { doc.text(list, x + 2, y + 4, { lineHeightFactor: 1.4 }); x += widths[i]; });
      doc.setDrawColor("#E1E8EB"); doc.line(left, y + height, 192, y + height); y += height;
    };
    ensure(25); drawRow(headers, true);
    for (const row of rows) {
      doc.setFontSize(8);
      const height = Math.max(...row.map((cell, i) => doc.splitTextToSize(clean(cell), widths[i] - 4).length)) * 4 + 5;
      if (y + height > bottom) { nextPage(); drawRow(headers, true); }
      drawRow(row, false);
    }
    y += 7;
  };
  header();
  doc.setProperties({ title: `Laporan Prediksi Harga ${a.commodity.name}`, subject: "Analisis hasil model dan bahan telaah keputusan", author: "SupplAI", creator: "SupplAI - Laporan Prediksi" });
  heading("Laporan Prediksi Harga Komoditas");
  paragraph(`${a.commodity.name} | ${a.regions.map((row) => row.region).join(", ")}`, 12);
  paragraph(`Dibuat: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`, 8, muted);
  paragraph(`Rentang telaah: ${monthLabel(a.startDate)} - ${monthLabel(a.endDate)}. Acuan harga: ${a.baselineDate ? monthLabel(a.baselineDate) : "belum tersedia"}.`, 9, muted);
  heading("01  Ringkasan untuk pengambil keputusan");
  paragraph(a.narrative);
  ensure(27);
  const cards = [
    ["HARGA ACUAN", a.currentPrice === null ? "Tidak tersedia" : `${money(a.currentPrice)}/${a.commodity.unit}`],
    ["PREDIKSI AKHIR", a.predictedPrice === null ? "Tidak tersedia" : `${money(a.predictedPrice)}/${a.commodity.unit}`],
    ["PERUBAHAN", a.changePercent === null ? "Tidak tersedia" : percent(a.changePercent)],
  ];
  cards.forEach(([label, value], index) => {
    const x = left + index * 59;
    doc.setFillColor("#F2F6F4"); doc.roundedRect(x, y, 56, 23, 2, 2, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(muted); doc.text(label, x + 4, y + 7);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(green); doc.text(value, x + 4, y + 16);
  });
  y += 32;
  heading("02  Tren harga dan proyeksi");
  if (a.history.length > 1) {
    ensure(95);
    const chartY = y + 3, chartX = left + 20, chartW = width - 24, chartH = 55;
    const values = a.history.flatMap((row) => row.values.flatMap((point) => point ? [point.price] : []));
    const min = Math.min(...values) * 0.97, max = Math.max(...values) * 1.03;
    const colors = [green, "#0284C7", "#B66D0A"];
    const xAt = (index: number) => chartX + index * chartW / (a.history.length - 1);
    const yAt = (price: number) => chartY + chartH - (price - min) / (max - min || 1) * chartH;
    for (let tick = 0; tick < 4; tick++) {
      const price = min + (max - min) * tick / 3;
      doc.setDrawColor("#E7ECEF"); doc.setLineWidth(0.2); doc.line(chartX, yAt(price), chartX + chartW, yAt(price));
      doc.setTextColor(muted); doc.setFontSize(7); doc.text(Math.round(price).toLocaleString("id-ID"), chartX - 2, yAt(price) + 1, { align: "right" });
    }
    a.regions.forEach((_, regionIndex) => {
      doc.setDrawColor(colors[regionIndex]); doc.setFillColor(colors[regionIndex]); doc.setLineWidth(0.6);
      a.history.forEach((row, index) => {
        const point = row.values[regionIndex]; if (!point) return;
        const prev = a.history[index - 1]?.values[regionIndex];
        const consecutive = prev && (Number(point.date.slice(0, 4)) * 12 + Number(point.date.slice(5, 7))) - (Number(prev.date.slice(0, 4)) * 12 + Number(prev.date.slice(5, 7))) === 1;
        doc.setLineDashPattern(point.isFuture ? [1.5, 1] : [], 0);
        if (prev && consecutive) doc.line(xAt(index - 1), yAt(prev.price), xAt(index), yAt(point.price));
        doc.circle(xAt(index), yAt(point.price), 0.65, "F");
      });
    });
    doc.setLineDashPattern([], 0); doc.setTextColor(muted); doc.setFontSize(7);
    doc.text(monthLabel(a.history[0].date), chartX, chartY + chartH + 6);
    doc.text(monthLabel(a.history.at(-1)!.date), chartX + chartW, chartY + chartH + 6, { align: "right" });
    y = chartY + chartH + 14;
    a.regions.forEach((row, index) => { doc.setTextColor(colors[index]); doc.text(row.region, left + index * 59, y); });
    y += 7;
    paragraph("Sumbu harga: rupiah per kg. Garis utuh: data historis; putus-putus: prediksi. Data bulanan yang hilang tidak disambungkan.", 8, muted);
  } else paragraph("Rentang terpilih belum cukup untuk menampilkan tren.", 9, muted);
  paragraph(a.budgetNarrative, 9);
  nextPage();
  heading("03  Rincian proyeksi per wilayah");
  const forecasts = a.regions.flatMap((row) => row.forecasts.map((point) => [row.region, monthLabel(point.date), row.baseline ? money(row.baseline.price) : "-", money(point.price), row.baseline && row.baseline.price > 0 ? percent((point.price - row.baseline.price) / row.baseline.price * 100) : "-"]));
  if (forecasts.length) table(["Wilayah", "Bulan prediksi", "Harga acuan", "Prediksi / kg", "Perubahan"], forecasts, [43, 39, 32, 33, 27]);
  else paragraph("Tidak ada bulan prediksi dalam rentang terpilih.");
  a.regionalNarratives.forEach((text) => paragraph(text, 9));
  heading("04  Implikasi dan tindak lanjut");
  paragraph("Untuk bisnis dan pengadaan", 10, green); bullets(a.businessActions);
  paragraph("Untuk kelembagaan dan pemantauan", 10, green); bullets(a.institutionalActions);
  paragraph(a.budgetNarrative, 9, muted);
  nextPage();
  heading("05  Metode, keandalan, dan batasan");
  paragraph("Sumber: keluaran pipeline SupplAI yang diekspor ke timeseries.json dan commodity_mape.json. Evaluasi historis memakai ensemble LightGBM, LSTM, dan komponen quantile dengan bobot per komoditas (scripts/export_web.py, blend_h1). Model bahasa eksternal tidak digunakan untuk narasi ini.", 9);
  paragraph(`Konteks sinyal: ${a.signal.toLowerCase()}.`, 10, green);
  bullets(a.caveats);
  heading("06  Lampiran data untuk verifikasi");
  paragraph("Data berikut mengikuti komoditas, wilayah, dan rentang tanggal yang dipilih saat ekspor. Tanda '-' berarti data tidak tersedia, bukan nol. Nilai harga dalam rupiah per kg.", 9, muted);
  if (a.history.length) {
    const priceWidth = 114 / a.regions.length;
    table(["Bulan", "Jenis data", ...a.regions.map((row) => row.region)], a.history.map((row) => [monthLabel(row.date), row.values.some((point) => point?.isFuture) ? "Prediksi" : "Historis", ...row.values.map((point) => point ? money(point.price) : "-")]), [33, 27, ...a.regions.map(() => priceWidth)]);
  } else paragraph("Tidak ada data pada rentang yang dipilih.");
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor("#DCE5E7"); doc.line(left, 280, 192, 280);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("SupplAI | Bahan telaah, bukan keputusan otomatis", left, 286);
    doc.text(`${page} / ${pages}`, 192, 286, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
