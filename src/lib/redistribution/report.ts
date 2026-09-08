import { jsPDF } from "jspdf";
import { commodities } from "@/data/commodities";
import type { RedistributionRoute } from "@/lib/types";
import { calculateRouteEstimate, recommendedVehicleId, shelfLifeByCommodity } from "./planning";

const money = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const number = (value: number) => Math.round(value).toLocaleString("id-ID");

export function createRedistributionReport(
  commodityId: string,
  routes: RedistributionRoute[],
  scope: "selected" | "all",
  selectedVehicleId = "box",
  sekarang: Date = new Date(),
  generatedBy = "Pengguna SupplAI",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const left = 18, width = 174, bottom = 272;
  const green = "#006C4A", ink = "#182B38", muted = "#536775";
  const commodity = commodities.find((item) => item.id === commodityId)?.name ?? commodityId;
  const shelfLife = shelfLifeByCommodity[commodityId] ?? { duration: "Perlu verifikasi", handling: "Konfirmasi standar penyimpanan sebelum pengiriman." };
  let y = 29;
  let tocPage = 0;
  const tocEntries: { title: string; page: number }[] = [];
  const clean = (text: string) => text.replace(/[–—−]/g, "-").replace(/\u00a0/g, " ");
  const header = () => {
    doc.setFillColor(green); doc.rect(0, 0, 210, 4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(green); doc.text("SUPPLAI  /  RENCANA REDISTRIBUSI PANGAN", left, 15);
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
    ensure(16);
    if (/^\d{2}\s/.test(text)) tocEntries.push({ title: clean(text), page: doc.getCurrentPageInfo().pageNumber });
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(green); doc.text(clean(text), left, y); y += 8;
  };
  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const drawRow = (cells: string[], isHeader: boolean) => {
      doc.setFont("helvetica", isHeader ? "bold" : "normal"); doc.setFontSize(8);
      const lines = cells.map((cell, index) => doc.splitTextToSize(clean(cell), widths[index] - 4) as string[]);
      const height = Math.max(...lines.map((line) => line.length)) * 4 + 5;
      doc.setFillColor(isHeader ? "#EAF3EF" : "#FFFFFF"); doc.rect(left, y, width, height, "F"); doc.setTextColor(isHeader ? green : ink);
      let x = left; lines.forEach((line, index) => { doc.text(line, x + 2, y + 4, { lineHeightFactor: 1.4 }); x += widths[index]; });
      doc.setDrawColor("#E1E8EB"); doc.line(left, y + height, 192, y + height); y += height;
    };
    ensure(25); drawRow(headers, true);
    for (const row of rows) { if (y + 14 > bottom) { nextPage(); drawRow(headers, true); } drawRow(row, false); }
    y += 7;
  };

  header();
  doc.setProperties({ title: `Laporan Redistribusi ${commodity}`, subject: "Rencana rute, moda angkut, dan estimasi biaya", author: generatedBy, creator: "SupplAI - Laporan Redistribusi" });
  heading(scope === "all" ? "Laporan Seluruh Rekomendasi Redistribusi" : "Laporan Rute Redistribusi Terpilih");
  paragraph(`${commodity} | ${routes.length} rute`, 12);
  paragraph(`Dibuat: ${sekarang.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`, 8, muted);
  nextPage();
  tocPage = doc.getCurrentPageInfo().pageNumber;
  nextPage();
  heading("01  Ringkasan rencana");
  const totalVolume = routes.reduce((sum, route) => sum + (route.volumeTon ?? route.volume), 0);
  const baselineCost = routes.reduce((sum, route) => sum + route.cost, 0);
  paragraph(`Rencana mencakup ${routes.length} rute dengan volume ${number(totalVolume)} ton dan estimasi acuan ${money(baselineCost)}. Tim logistik perlu mengonfirmasi tarif, kapasitas armada, jadwal, dan kondisi komoditas sebelum pelaksanaan.`);
  paragraph(`Masa simpan ${commodity}: ${shelfLife.duration}. ${shelfLife.handling}`, 9, muted);
  heading("02  Daftar rute dan estimasi");
  const rows = routes.map((route) => {
    const vehicleId = scope === "selected" ? selectedVehicleId : recommendedVehicleId(commodityId, route);
    const estimate = calculateRouteEstimate(route, vehicleId);
    return [route.from, route.to, `${number(estimate.volume)} ton`, `${number(route.distance)} km`, estimate.vehicle.name, money(estimate.total)];
  });
  table(["Asal", "Tujuan", "Volume", "Jarak", "Kendaraan", "Estimasi"], rows, [34, 34, 22, 22, 30, 32]);
  heading("03  Dasar perhitungan");
  routes.forEach((route, index) => {
    const vehicleId = scope === "selected" ? selectedVehicleId : recommendedVehicleId(commodityId, route);
    const estimate = calculateRouteEstimate(route, vehicleId);
    ensure(32);
    paragraph(`${index + 1}. ${route.from} ke ${route.to}`, 10, green);
    paragraph(`Acuan matriks ${money(route.cost)} = ${number(estimate.volume)} ton x ${number(route.distance)} km x ${money(estimate.effectiveRate)}/ton/km. ${estimate.vehicle.name} memakai faktor ${estimate.vehicle.multiplier.toLocaleString("id-ID")}, sehingga estimasi skenario menjadi ${money(estimate.total)}. Kebutuhan: ${number(estimate.trips)} perjalanan unit; durasi: ${estimate.days} hari operasional.`, 9);
  });
  heading("04  Metode dan batasan");
  paragraph("Rute berasal dari hasil alokasi surplus ke wilayah defisit. Estimasi acuan pada laporan sama dengan nilai di matriks. Faktor kendaraan digunakan untuk membandingkan skenario biaya. Angka belum mencakup perubahan tarif operator, tol, penyeberangan, waktu tunggu, pajak, dan kondisi lapangan.", 9);
  paragraph("Gunakan laporan ini sebagai bahan telaah. Verifikasi ketersediaan stok, mutu komoditas, armada, dan tarif sebelum menetapkan pengiriman.", 9, muted);
  const lastContentPage = doc.getCurrentPageInfo().pageNumber;
  doc.setPage(tocPage);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(green); doc.text("Daftar Isi", left, 34);
  doc.setDrawColor("#DCE5E7"); doc.line(left, 40, 192, 40);
  let tocY = 51;
  for (const entry of tocEntries) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink); doc.text(entry.title, left, tocY);
    doc.setDrawColor("#CCD8D3"); doc.setLineDashPattern([1, 1.5], 0); doc.line(left + 72, tocY - 1, 184, tocY - 1);
    doc.setFont("helvetica", "bold"); doc.text(String(entry.page), 192, tocY, { align: "right" });
    tocY += 9;
  }
  doc.setLineDashPattern([], 0);
  doc.setPage(lastContentPage);

  const generatedAt = sekarang.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "medium",
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor("#E2E8E5");
    doc.text(clean(`Dibuat oleh ${generatedBy} | ${generatedAt} WIB`), 105, 151, { align: "center", angle: 35 });
    doc.setDrawColor("#DCE5E7"); doc.line(left, 280, 192, 280); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("Generated by SupplAI | Bahan telaah rencana distribusi", left, 286); doc.text(`${page} / ${pages}`, 192, 286, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
