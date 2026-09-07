import { jsPDF } from "jspdf";
import { bukuBesar } from "@/data/buku-besar";
import tingkatanData from "@/data/generated/tingkatan.json";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { TingkatanProvinsi } from "@/lib/types";
import type { RedistribusiAnalysis } from "./analysis";
import { persen, takaranLabel, ton } from "./format";
import { sebaranKelompok } from "./kesenjangan";
import { POSTUR_LABEL } from "./postur";
import { BUKU_BESAR_STATUS_LABEL } from "./buku-besar";
import { teksJendela, teksPenekananHarga, teksMarjin, teksKesenjangan } from "./teks";
import { jendelaWaktu } from "./waktu";

// Tingkatan IKP Bapanas 2025 per provinsi, dan provinsi yang punya skor IKP
// tapi tidak pernah dimodelkan harganya (lihat dokumentasi teksKesenjangan di
// ./teks untuk kenapa dua hal ini tidak boleh tertukar). Dimuat sekali di
// tingkat modul: datanya statis per build, sama seperti `bukuBesar` di atas.
const TINGKATAN_IKP = tingkatanData.provinsi as TingkatanProvinsi[];
const IKP_TANPA_HARGA = tingkatanData.cakupan.ikpTanpaHarga as string[];

export const PEMBACA = ["pemerintah", "pedagang"] as const;
export type Pembaca = (typeof PEMBACA)[number];

/** Table width constants (all sum to 174mm drawable width) */
export const KERANGKA_PEMERINTAH_RUTE_WIDTH = [34, 34, 26, 22, 30, 28];
// Kolom terakhir diberi 16mm, bukan 12: "Menutup" tidak punya spasi untuk
// dibungkus, jadi pada 12mm splitTextToSize memotong katanya sendiri dan
// header itu tercetak "Menu / tup". Tambahannya diambil dari Tujuan dan
// Jarak, yang isinya masih muat. Jumlahnya tetap 174 -- dijaga oleh tes.
export const KERANGKA_PEDAGANG_WIDTH = [21, 20, 19, 20, 15, 19, 20, 24, 16];

/** The same plan, told twice. The government framing has to answer "on whose
 *  measurement?"; the trader framing has to answer "does the price gap pay for
 *  the freight?". Neither is allowed to drop the rows that look bad.
 *
 *  Drawn as vector text, mirroring src/lib/prediction/report.ts, so this
 *  codebase has one report idiom instead of two. */
export function createRedistribusiReport(
  a: RedistribusiAnalysis, pembaca: Pembaca, sekarang: Date = new Date(),
) {
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
  const cards = (items: [string, string][]) => {
    ensure(27);
    items.forEach(([label, value], index) => {
      const x = left + index * 59;
      doc.setFillColor("#F2F6F4"); doc.roundedRect(x, y, 56, 23, 2, 2, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(muted); doc.text(clean(label), x + 4, y + 7);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(green); doc.text(clean(value), x + 4, y + 16);
    });
    y += 32;
  };
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
  const LEDGER_HEAD = ["Masukan", "Nilai", "Sumber", "Tahun", "Status"];
  // "Diasumsikan" measures 16,1 mm at 8 pt; a narrower Status column breaks the
  // one word a reader is scanning for into "Diasumsik / an".
  const LEDGER_WIDTH = [30, 33, 71, 18, 22];
  const ledgerRow = (entry: (typeof bukuBesar)[number]) => [
    entry.input, entry.nilai, entry.sumber, entry.tahun,
    BUKU_BESAR_STATUS_LABEL[entry.status].label,
  ];

  header();
  const judulPembaca = pembaca === "pemerintah" ? "Kerangka Pemerintah" : "Kerangka Pedagang";
  doc.setProperties({
    title: `Laporan Redistribusi ${a.komoditas} - ${judulPembaca}`,
    subject: "Rencana pengiriman antarprovinsi beserta dasar takaran dan asal-usul angkanya",
    author: "SupplAI",
    creator: "SupplAI - Laporan Redistribusi",
  });
  heading("Laporan Rencana Redistribusi Pangan");
  paragraph(`${a.komoditas} | Postur ${POSTUR_LABEL[a.postur].nama} | ${judulPembaca}`, 12);
  paragraph(`${POSTUR_LABEL[a.postur].arti} Status pemecah rute: "${a.status}".`, 9, muted);

  // Kepala laporan menyebut bulan sasaran dan sisa waktu di badan laporan,
  // bukan catatan kaki: baris ini menentukan apakah rencana ini masih boleh
  // dipakai sama sekali. teksJendela hanya mengembalikan teks; gaya baris
  // kedua (ukuran/warna) berubah menurut jendelaWaktu, dihitung terpisah di
  // sini karena teks.ts murni tidak membawa keputusan tampilan.
  //
  // Tanggal pembuatan dicetak SEKALI, di baris pertama teksJendela, dari jam
  // yang disuntikkan (`sekarang`) -- bukan di sini lagi dari `new Date()`.
  // Dua pencetakan dari dua jam berbeda bisa mencetak dua tanggal berbeda
  // pada laporan yang sama.
  const [jendelaBaris1, jendelaBaris2] = teksJendela(a.bulanPrediksi, sekarang);
  paragraph(jendelaBaris1, 9, muted);
  if (jendelaWaktu(a.bulanPrediksi, sekarang).sudahLewat) {
    paragraph(jendelaBaris2, 10);
  } else {
    paragraph(jendelaBaris2, 9, muted);
  }

  if (pembaca === "pemerintah") {
    heading("01  Ringkasan");
    paragraph(a.ringkasan);
    cards([
      ["TOTAL VOLUME", ton(a.totalTon)],
      ["JUMLAH RUTE", formatNumber(a.totalRute)],
      ["ONGKOS ANGKUT", formatRupiah(a.totalBiaya)],
    ]);
    heading("02  Penekanan harga");
    const [klaimHarga, takaranHarga, basisHarga] = teksPenekananHarga(a);
    paragraph(klaimHarga);
    paragraph(takaranHarga, 9, muted);
    paragraph(basisHarga, 9, muted);
    heading("03  Kesenjangan IKP");
    const sebaran = sebaranKelompok(
      a.routes.map((r) => ({ ke: r.to, volumeTon: r.volumeTon })),
      TINGKATAN_IKP,
    );
    const [kesenjanganUtama, ...kesenjanganLain] = teksKesenjangan(sebaran, IKP_TANPA_HARGA);
    paragraph(kesenjanganUtama);
    for (const kalimat of kesenjanganLain) paragraph(kalimat, 9, muted);
    heading("04  Rute dan takaran");
    if (a.routes.length) {
      paragraph("Kolom \"% pasar\" adalah bagian kiriman terhadap konsumsi bulanan provinsi tujuan. Kolom \"Kecukupan GPM\" bukan tentang kiriman ini: ia adalah bagian kebutuhan terukur yang sudah ditutup Gerakan Pangan Murah, program intervensi yang memang sudah berjalan di provinsi tujuan. Angka itu melekat pada tujuannya, jadi setiap rute yang masuk ke provinsi yang sama menunjukkan nilai yang sama.", 9, muted);
      paragraph("Tiga peringatan melekat pada Kecukupan GPM dan harus dibaca bersamanya: (1) GPM hanya satu dari beberapa instrumen — penyaluran Cadangan Pangan Pemerintah jauh lebih besar dan tidak terhitung di sini; (2) anggaran per kegiatan adalah rencana 2027 yang diterapkan pada realisasi 2026; (3) GPM menjual beberapa komoditas sekaligus, sehingga mengonversinya memakai harga satu komoditas bersifat indikatif, bukan takaran.", 9, muted);
      table(
        ["Asal", "Tujuan", "Volume", "% pasar", "Dasar", "Kecukupan GPM"],
        a.routes.map((r) => [
          r.from, r.to, ton(r.volumeTon), persen(r.persenPasar),
          takaranLabel(r.dasarTakaran).teks, persen(r.kecukupanPersen),
        ]),
        KERANGKA_PEMERINTAH_RUTE_WIDTH,
      );
    } else paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada tabel yang dapat ditampilkan.");
    heading("05  Dasar takaran");
    paragraph(a.catatanTakaran);
    paragraph(
      a.totalRute === 0
        ? "Tidak ada rute, sehingga tidak ada takaran terukur maupun diasumsikan pada rencana ini."
        : a.terukur === 0
          ? `Peringatan: 0 dari ${a.totalRute} rute pada rencana ini volumenya terukur. Seluruh ${a.diasumsikan} rute dibatasi aturan yang kami tetapkan sendiri, bukan hasil pengukuran kebutuhan. Angka volumenya layak dibaca sebagai urutan besaran, bukan sebagai takaran pengadaan.`
          : `Peringatan: ${a.terukur} dari ${a.totalRute} rute volumenya terukur; ${a.diasumsikan} sisanya diasumsikan. Bagian yang diasumsikan tidak boleh dibaca setara dengan bagian yang terukur.`,
      10, green,
    );
    paragraph("Peringatan ini berada di badan laporan, bukan di catatan kaki, karena ia menentukan seberapa jauh rencana ini boleh dipakai.", 9, muted);
    heading("06  Pagu anggaran");
    if (a.anggaranNasionalTon === null) {
      paragraph("Komoditas ini tidak memiliki neraca nasional yang dapat dijadikan pagu, sehingga rencana berjalan tanpa batas anggaran. Keterbatasan ini dinyatakan, bukan diabaikan.");
    } else {
      const bagian = a.anggaranNasionalTon > 0 ? (a.totalTon / a.anggaranNasionalTon) * 100 : 0;
      paragraph(`Neraca ketersediaan dan kebutuhan nasional menetapkan pagu ${ton(a.anggaranNasionalTon)} untuk ${a.komoditas}. Rencana ini memakai ${ton(a.totalTon)}, atau ${persen(bagian, bagian > 0 && bagian < 0.01 ? 4 : 2)} dari pagu tersebut.`);
      paragraph("Pagu membatasi tonase nasional, bukan biaya angkut. Ongkos angkut pada Bagian 01 dihitung terpisah dan tidak diuji terhadap pagu ini.", 9, muted);
    }
    heading("07  Asal-usul angka");
    const terukurLedger = bukuBesar.filter((e) => e.status === "terukur").length;
    const diasumsikanLedger = bukuBesar.filter((e) => e.status === "diasumsikan").length;
    const diturunkanLedger = bukuBesar.filter((e) => e.status === "diturunkan").length;
    paragraph(`Setiap masukan yang dipakai perhitungan ini, beserta asalnya. ${terukurLedger} dari ${bukuBesar.length} berasal dari sumber yang dapat diperiksa. ${diasumsikanLedger} kami tetapkan sendiri berdasarkan penilaian profesional. ${diturunkanLedger} dihitung dari masukan lain dan mewarisi tingkat kepercayaan mereka. Semua ditandai sesuai jenisnya.`, 9);
    table(LEDGER_HEAD, bukuBesar.map(ledgerRow), LEDGER_WIDTH);
  } else {
    heading("01  Ringkasan");
    paragraph(
      a.totalRute === 0
        ? a.ringkasan
        : `Dari ${a.totalRute} rute ${a.komoditas} pada postur ${POSTUR_LABEL[a.postur].nama}, ${a.menutup} rute selisih harganya menutup ongkos angkut dan ${a.totalRute - a.menutup} rute tidak. Seluruh rute dicantumkan di Bagian 02, termasuk yang tidak menutup ongkos: daftar yang hanya memuat rute menguntungkan adalah iklan, bukan laporan.`,
    );
    cards([
      ["MENUTUP ONGKOS", `${formatNumber(a.menutup)} / ${formatNumber(a.totalRute)}`],
      ["TOTAL VOLUME", ton(a.totalTon)],
      ["ONGKOS ANGKUT", formatRupiah(a.totalBiaya)],
    ]);
    heading("02  Selisih harga terhadap ongkos angkut");
    if (a.routes.length) {
      paragraph("Harga dalam rupiah per kg di provinsi asal dan tujuan. Ongkos/kg adalah jarak dikali tarif angkut; Margin/kg adalah selisih harga dikurangi ongkos itu, memakai harga hari ini tanpa prediksi. Marjin harapan adalah total rute, dalam rupiah, memakai harga tujuan SETELAH kenaikan yang diprediksi, dikurangi ongkos angkut. Margin negatif ditampilkan apa adanya dan ditandai \"Tidak\" pada kolom terakhir.", 9, muted);
      table(
        ["Asal", "Tujuan", "Harga asal", "Harga tujuan", "Jarak", "Ongkos/kg", "Margin/kg", "Marjin harapan", "Menutup"],
        [...a.routes]
          .sort((x, z) => z.marginRpPerKg - x.marginRpPerKg)
          .map((r) => [
            r.from, r.to, formatRupiah(r.hargaAsal), formatRupiah(r.hargaTujuan),
            `${formatNumber(r.distance)} km`, formatRupiah(r.ongkosRpPerKg),
            formatRupiah(r.marginRpPerKg), formatRupiah(r.marjinHarapanRp), r.menutupOngkos ? "Ya" : "Tidak",
          ]),
        KERANGKA_PEDAGANG_WIDTH,
      );
      paragraph(`Rekapitulasi: ${a.menutup} rute menutup ongkos, ${a.totalRute - a.menutup} rute tidak, dari ${a.totalRute} rute yang seluruhnya tercantum di atas.`, 10, green);
      paragraph(teksMarjin(), 9, muted);
    } else paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada selisih harga yang dapat diuji terhadap ongkos angkut.");
    heading("03  Batasan");
    paragraph(a.catatanPedagang);
    // Mandatory, not best-effort. The freight rate is assumed and it carries
    // the whole trader framing, so the row declaring that has to print. Skipping
    // it silently meant an upstream rename would drop it while the size-only
    // PDF test still passed — the report would simply stop admitting that its
    // central number was never measured.
    const ongkos = bukuBesar.find((e) => e.input.toLowerCase().startsWith("ongkos angkut"));
    if (!ongkos) {
      throw new Error(
        "Buku besar tidak memuat baris 'Ongkos angkut ...'. Tarif angkut adalah " +
        "angka yang diasumsikan dan menopang seluruh kerangka pedagang; laporan " +
        "tidak boleh terbit tanpa baris yang menyatakannya.",
      );
    }
    paragraph("Baris buku besar untuk tarif angkut yang dipakai seluruh perhitungan di atas:", 9, muted);
    table(LEDGER_HEAD, [ledgerRow(ongkos)], LEDGER_WIDTH);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor("#DCE5E7"); doc.line(left, 280, 192, 280);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("SupplAI | Bahan telaah, bukan keputusan otomatis", left, 286);
    doc.text(`${page} / ${pages}`, 192, 286, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
