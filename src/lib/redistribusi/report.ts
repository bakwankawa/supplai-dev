import { jsPDF } from "jspdf";
import { bukuBesar } from "@/data/buku-besar";
import { narasiModel } from "@/data/narasi";
import lanskapData from "@/data/generated/lanskap.json";
import muatanBalikData from "@/data/generated/muatan_balik.json";
import tindakanData from "@/data/generated/tindakan.json";
import tingkatanData from "@/data/generated/tingkatan.json";
import ujiOngkosData from "@/data/generated/uji_ongkos.json";
import { formatNumber, formatRupiah } from "@/lib/format";
import type {
  DegenerasiKomoditas, MuatanBalikByPostur, PasarProvinsi, PosisiHarga, TingkatanProvinsi, Tindakan,
  UjiOngkos,
} from "@/lib/types";
import type { RedistribusiAnalysis } from "./analysis";
import { persen, takaranLabel, ton } from "./format";
import { sebaranKelompok } from "./kesenjangan";
import { POSTUR_LABEL } from "./postur";
import { BUKU_BESAR_STATUS_LABEL } from "./buku-besar";
import {
  teksJendela, teksPenekananHarga, teksMarjin, teksKesenjangan, teksLanskap,
  teksMuatanBalik, teksPasar, teksModal, teksInstrumen, teksUjiOngkos, teksUjiOngkosKomoditas,
} from "./teks";
import { ruteBerubahKomoditas } from "./uji-ongkos";
import { jendelaWaktu } from "./waktu";

// Tingkatan IKP Bapanas 2025 per provinsi, dan provinsi yang punya skor IKP
// tapi tidak pernah dimodelkan harganya (lihat dokumentasi teksKesenjangan di
// ./teks untuk kenapa dua hal ini tidak boleh tertukar). Dimuat sekali di
// tingkat modul: datanya statis per build, sama seperti `bukuBesar` di atas.
const TINGKATAN_IKP = tingkatanData.provinsi as TingkatanProvinsi[];
const IKP_TANPA_HARGA = tingkatanData.cakupan.ikpTanpaHarga as string[];

// Posisi harga tiap komoditas di tiap provinsi terhadap median nasional
// (lihat dokumentasi teksLanskap di ./teks). Dimuat sekali di tingkat modul,
// sama seperti TINGKATAN_IKP di atas.
const LANSKAP_BARIS = lanskapData.baris as PosisiHarga[];

// Diagnosis muatan balik per postur (lihat dokumentasi teksMuatanBalik di
// ./teks): rantai yang benar-benar ada, dan ton-km kaki kosong yang bisa
// dihindari bila kiriman itu dirantai. Agregat LINTAS ENAM KOMODITAS untuk
// postur rencana ini -- bukan hanya komoditas laporan ini -- karena
// muatan_balik.json dibangun sekali per postur atas seluruh rencana.
const MUATAN_BALIK = muatanBalikData as unknown as MuatanBalikByPostur;

// Jalur tindakan pembaca (lihat dokumentasi teksPasar/teksModal di ./teks):
// pasar bernama per provinsi dan modal-imbal hasil per provinsi asal.
// `pasar`/`modal` (tanpa akhiran) tetap agregat lintas enam komoditas pada
// postur "seimbang" saja -- lihat build_tindakan() di scripts/export_web.py
// -- dan TIDAK dipakai kerangka pedagang di bawah untuk itu.
// `modalPerKomoditas` SUDAH disaring per POSTUR dan KOMODITAS laporan ini
// (lihat dokumentasi Tindakan di @/lib/types): modal dan imbal hasil
// genuinely berbeda per postur, jadi laporan Aman Pangan tidak boleh
// menampilkan angka milik rencana Seimbang. `pasarPerKomoditas` SUDAH
// disaring per komoditas TAPI SENGAJA TIDAK per postur -- pasar bernama
// adalah tempat harga pernah diamati secara historis, tidak bergantung pada
// rencana redistribusi mana yang kami pilih.
const TINDAKAN = tindakanData as unknown as Tindakan;

// Uji apakah jarak benar-benar menyetir rencana (lihat dokumentasi
// teksUjiOngkos/teksUjiOngkosKomoditas di ./teks, dan UjiOngkos di
// @/lib/types): tiga struktur ongkos LP (jarak, ongkos datar, ongkos datar
// DI ATAS jarak), dijalankan SEKALI untuk postur "seimbang" -- lihat
// bench_ongkos.py -- tapi SEBAGAI ENAM SOLVE TERPISAH, satu per komoditas.
// `struktur.jarak/tetap/tetapPlusJarak.rute` dan `degenerasiTetapDetail`
// karena itu SUDAH per komoditas di sumbernya; `ruteBerubahKomoditas()`
// (./uji-ongkos) menyaring dan membandingkan ulang dari situ per komoditas
// laporan ini -- BUKAN mengambil pecahan dari `ruteBerubah` agregat, yang
// terbukti menyesatkan per komoditas (agregat 22/36 = 61%, sedangkan Bawang
// Putih sendirian 0/10 = 0%). Hanya `ongkosTetapTerkalibrasi` dan
// `persenBawahJarak`/`persenBawahTetap` TETAP whole-of-program: kalibrasi
// tarif datar dan pembagian ke sepertiga terbawah IKP dihitung atas
// GABUNGAN flow, tidak ada pecahan per komoditas untuk keduanya. `postur`
// TETAP "seimbang" selalu -- eksperimen ini tidak pernah dijalankan pada
// postur lain -- jadi `report.ts` menyatakan itu secara eksplisit sebelum
// angka per komoditas mana pun dicetak, terlepas dari postur laporan ini.
const UJI_ONGKOS = ujiOngkosData as unknown as UjiOngkos;

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
  a: RedistribusiAnalysis,
  pembaca: Pembaca,
  sekarang: Date = new Date(),
  generatedBy = "Pengguna SupplAI",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const left = 18, width = 174, bottom = 272;
  const green = "#006C4A", ink = "#182B38", muted = "#536775";
  let y = 29;
  let tocPage = 0;
  const tocEntries: { title: string; page: number }[] = [];
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
    ensure(20);
    if (/^\d{2}\s/.test(text) || text === "Glosarium") {
      tocEntries.push({ title: clean(text), page: doc.getCurrentPageInfo().pageNumber });
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(green); doc.text(clean(text), left, y); y += 8;
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
  const glossary = [
    [
      "Wilayah asal (surplus)",
      "Bukan kelebihan produksi yang terukur - data produksi per provinsi belum tersedia. Wilayah ini dipilih sebagai kandidat asal karena harga komoditasnya berada di bawah median nasional dan tidak diprediksi melonjak.",
    ],
    [
      "Cara membaca matriks rute",
      "Setiap baris merupakan usulan pengiriman dari provinsi asal ke tujuan. Persentase pasar menunjukkan perbandingan kiriman dengan konsumsi bulanan tujuan. Menekan harga menunjukkan estimasi poin persentase kenaikan yang dapat ditahan. Dasar takaran menjelaskan apakah volume berasal dari kebutuhan terukur atau batas asumsi. Biaya memuat ongkos angkut dan jarak rute.",
    ],
    [
      "Kecukupan GPM",
      "Kecukupan GPM tidak mengukur cakupan kiriman pada baris tersebut. Angka ini menunjukkan bagian kebutuhan terukur yang sudah ditutup Gerakan Pangan Murah di provinsi tujuan, sehingga setiap rute menuju provinsi yang sama menampilkan nilai yang sama.",
    ],
    [
      "Kelompok IKP",
      "Kelompok bawah, tengah, dan atas merupakan pembagian atas 38 provinsi yang memiliki skor IKP Bapanas 2025, bukan hanya 34 provinsi yang harganya dapat dimodelkan. Jumlah kecil dapat menunjukkan kelompok yang kecil atau keterbatasan jangkauan model.",
    ],
    [
      "Asal-usul angka",
      "Daftar ini menyebut setiap masukan perhitungan beserta sumber dan tahunnya agar dapat diperiksa, sekaligus membedakan angka yang diukur, diturunkan, dan ditetapkan melalui asumsi.",
    ],
    [
      "Ditulis model bahasa",
      `Disusun ${narasiModel} dari angka yang sudah dihitung pipeline, lalu diperiksa ulang: setiap angka dalam teks ini harus cocok dengan angka aslinya. Penalarannya tidak ikut diperiksa.`,
    ],
  ] as const;

  header();
  const judulPembaca = pembaca === "pemerintah" ? "Kerangka Pemerintah" : "Kerangka Pedagang";
  doc.setProperties({
    title: `Laporan Redistribusi ${a.komoditas} - ${judulPembaca}`,
    subject: "Rencana pengiriman antarprovinsi beserta dasar takaran dan asal-usul angkanya",
    author: generatedBy,
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

  nextPage();
  tocPage = doc.getCurrentPageInfo().pageNumber;
  nextPage();

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
    if (a.totalRute === 0) {
      // Sama seperti "02 Penekanan harga": rencana kosong tidak punya sebaran
      // untuk dinyatakan, jadi bagian ini menyatakan itu -- bukan mencetak
      // 0,00% ke ketiga kelompok seakan itu hasil pengukuran atas sebuah
      // rencana yang tidak pernah ada.
      paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada sebaran kelompok IKP yang dapat dinyatakan.");
    } else {
      const sebaran = sebaranKelompok(
        a.routes.map((r) => ({ ke: r.to, volumeTon: r.volumeTon })),
        TINGKATAN_IKP,
      );
      const teksSebaran = teksKesenjangan(sebaran, IKP_TANPA_HARGA);
      // teksKesenjangan menjamin urutan: [utama, jangkauan model (hanya bila
      // IKP_TANPA_HARGA tidak kosong), lalu sisanya]. Kalimat jangkauan model
      // BUKAN aside -- ia menyatakan provinsi yang tidak akan pernah
      // terjangkau produk ini sama sekali -- jadi ia dicetak senormal
      // kalimat utama, bukan abu-abu 9pt seperti kalimat kondisional lain.
      let i = 0;
      paragraph(teksSebaran[i++]);
      if (IKP_TANPA_HARGA.length > 0) paragraph(teksSebaran[i++]);
      for (; i < teksSebaran.length; i++) paragraph(teksSebaran[i], 9, muted);
    }
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

    heading("08  Kapasitas instrumen");
    if (a.routes.length === 0) {
      paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada setara kegiatan GPM yang dapat dinyatakan untuk komoditas dan postur ini.");
    } else {
      // Disaring per POSTUR dan KOMODITAS laporan ini
      // (setaraKegiatanPerKomoditas), bukan agregat lintas enam komoditas
      // pada postur "seimbang" saja (TINDAKAN.setaraKegiatan): ronde
      // perbaikan ini menutup celah yang sama dengan modalPerKomoditas --
      // laporan rencana Aman Pangan atau untuk satu komoditas tidak boleh
      // menampilkan setara-kegiatan yang sebenarnya milik rencana Seimbang
      // atau gabungan enam komoditas. `?? undefined` menutupi pasangan
      // postur-komoditas yang genuinely tak diketahui (seharusnya tak
      // terjadi, mengingat setiap postur/komoditas dienumerasi saat
      // ekspor) tanpa jatuh balik diam-diam ke agregat.
      const setaraKomoditas = TINDAKAN.setaraKegiatanPerKomoditas[a.postur]?.[a.komoditas];
      if (!setaraKomoditas) {
        paragraph("Data setara kegiatan GPM untuk komoditas dan postur ini tidak diketahui.");
      } else {
        const [klaimInstrumen, sanggupInstrumen, takaranInstrumen] = teksInstrumen(setaraKomoditas);
        paragraph(klaimInstrumen);
        paragraph(sanggupInstrumen, 10, green);
        paragraph(takaranInstrumen, 9, muted);
      }
    }

    heading("09  Uji ongkos: apakah jarak menyetir rencana");
    {
      // BAGIAN PER KOMODITAS: ruteBerubah dan detail degenerasi, disaring
      // ke a.komoditas -- lihat dokumentasi ruteBerubahKomoditas di
      // ./uji-ongkos dan teksUjiOngkosKomoditas di ./teks untuk kenapa ini
      // TIDAK BOLEH diambil sebagai pecahan dari angka agregat. Eksperimen
      // ini hanya pernah dijalankan pada postur Seimbang -- BUKAN postur
      // laporan ini -- jadi kalimat pembuka menyatakan itu eksplisit,
      // apa pun postur laporan ini.
      paragraph(
        `Baris berikut, khusus ${a.komoditas}, dihitung dari rencana postur Seimbang` +
        (a.postur === "seimbang"
          ? ", postur laporan ini juga -- tapi itu kebetulan, bukan jaminan: "
          : `, BUKAN postur ${POSTUR_LABEL[a.postur].nama} pada laporan ini. `) +
        `Uji ongkos ini hanya pernah dijalankan pada postur Seimbang, sehingga angka di bawah ` +
        `tidak berubah menurut postur laporan ini.`,
        10, green,
      );
      const degKomoditas: DegenerasiKomoditas | undefined = UJI_ONGKOS.degenerasiTetapDetail[a.komoditas];
      const tetap = ruteBerubahKomoditas(UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, a.komoditas);
      const tpj = ruteBerubahKomoditas(UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetapPlusJarak, a.komoditas);
      const ujiKomoditasInput =
        !degKomoditas || !degKomoditas.diuji || !tetap
          ? { komoditas: a.komoditas, diuji: false, alasan: degKomoditas?.alasan }
          : {
              komoditas: a.komoditas,
              diuji: true,
              ruteBerubah: tetap.ruteBerubah,
              nRuteJarak: tetap.nRuteJarak,
              ruteBerubahTetapPlusJarak: tpj?.ruteBerubah,
              nUlang: degKomoditas.nUlang,
              nHimpunanUnik: degKomoditas.nHimpunanUnik,
              stabil: degKomoditas.stabil,
            };
      for (const t of teksUjiOngkosKomoditas(ujiKomoditasInput)) paragraph(t);

      // BAGIAN WHOLE-OF-PROGRAM: kalibrasi ongkos datar dan siapa yang
      // dilayani, keduanya genuinely tidak bisa dipecah per komoditas --
      // lihat dokumentasi teksUjiOngkos di ./teks. Kalimat pembuka di sini
      // hanya menyandang cakupan DUA angka ini, bukan seluruh bagian --
      // satu kalimat cakupan yang menutupi angka per komoditas DAN angka
      // whole-of-program sekaligus adalah menyesatkan dengan cara yang
      // lebih halus, persis yang ronde perbaikan ini memperbaiki.
      paragraph(
        `Dua angka berikut TETAP agregat SELURUH rencana postur Seimbang, gabungan enam ` +
        `komoditas -- kalibrasi ongkos datar dan porsi tonase ke sepertiga terbawah IKP tidak ` +
        `bisa dipecah per komoditas pada data yang kami miliki.`,
        10, green,
      );
      const teksUji = teksUjiOngkos({
        ongkosTetapTerkalibrasi: UJI_ONGKOS.ongkosTetapTerkalibrasi,
        persenBawahJarak: UJI_ONGKOS.persenBawahJarak,
        persenBawahTetap: UJI_ONGKOS.persenBawahTetap,
      });
      for (const t of teksUji) paragraph(t);

      // `keterbatasan` dicetak APA ADANYA dari uji_ongkos.json, bukan
      // diparafrase ulang di sini -- ia berlaku atas SELURUH eksperimen
      // (baik angka per komoditas maupun whole-of-program di atas), jadi
      // dicetak sekali sebagai penutup bagian, bukan diulang per subbagian.
      paragraph(UJI_ONGKOS.keterbatasan, 10, green);
    }
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
    heading("03  Lanskap komoditas");
    if (a.routes.length === 0) {
      // Sama seperti Bagian 02: rencana kosong tidak punya provinsi tujuan
      // untuk dibaca lanskapnya, jadi bagian ini menyatakan itu -- bukan
      // mencetak posisi harga seakan ada tujuan yang sungguh dituju.
      paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada provinsi tujuan yang lanskap komoditasnya relevan untuk ditampilkan.");
    } else {
      paragraph(
        "Posisi harga kedelapan komoditas yang lanskap ini baca -- termasuk dua yang tidak kami " +
        "ramalkan -- di tiap provinsi tujuan rencana ini, terhadap median nasional.", 9, muted,
      );
      const tujuan = [...new Set(a.routes.map((r) => r.to))].sort((x, y) => x.localeCompare(y, "id"));
      // teksLanskap menjamin urutan [klaim per-provinsi, bacaan-harga bukan
      // bacaan-pasokan, penanda enam-diramalkan/dua-tidak]. Dua elemen
      // terakhir adalah pernyataan umum tentang produk ini, bukan simpulan
      // atas baris data provinsi tertentu -- lihat dokumentasi teksLanskap di
      // ./teks -- sehingga aman dicetak SEKALI untuk seluruh bagian ini,
      // diambil dari provinsi tujuan pertama, alih-alih diulang tiap provinsi.
      for (const provinsi of tujuan) {
        const [klaim] = teksLanskap(LANSKAP_BARIS, provinsi);
        paragraph(klaim);
      }
      const [, bacaanHarga, penanda] = teksLanskap(LANSKAP_BARIS, tujuan[0]);
      paragraph(bacaanHarga, 10, green);
      paragraph(penanda, 9, muted);
    }
    heading("04  Muatan balik");
    paragraph(
      `Diagnosis berikut mencakup seluruh rencana postur ${POSTUR_LABEL[a.postur].nama} ` +
      `lintas enam komoditas yang kami modelkan, bukan hanya rute ${a.komoditas} pada ` +
      `laporan ini.`, 9, muted,
    );
    {
      const [temuanBalik, ...sisaBalik] = teksMuatanBalik(MUATAN_BALIK[a.postur]);
      paragraph(temuanBalik);
      for (const s of sisaBalik) paragraph(s, 9, muted);
    }
    heading("05  Pasar bernama");
    if (a.routes.length === 0) {
      paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada provinsi asal atau tujuan yang pasarnya relevan untuk disebut di sini.");
    } else {
      // pasar mencakup provinsi ASAL maupun TUJUAN -- lihat dokumentasi
      // build_tindakan() di scripts/export_web.py -- karena tabel Bagian 02
      // menampilkan keduanya, bukan hanya provinsi asal.
      const provinsiTerlibat = [...new Set(a.routes.flatMap((r) => [r.from, r.to]))]
        .sort((x, y) => x.localeCompare(y, "id"));
      // Disaring per KOMODITAS laporan ini (pasarPerKomoditas), bukan
      // registri pasar mentah (pasar_provinsi(), tidak lagi diekspor di
      // tingkat atas -- lihat dokumentasi build_tindakan() di
      // scripts/export_web.py): teksPasar mencetak "harga komoditas ini
      // diamati di ..." dan klaim itu hanya benar bila daftar yang diberikan
      // sudah disaring ke komoditas ini -- lihat dokumentasi
      // pasar_provinsi_komoditas() di supplai/tindakan.py.
      const pasarKomoditas = TINDAKAN.pasarPerKomoditas[a.komoditas] ?? {};
      // teksPasar menjamin urutan [klaim per-provinsi, kalimat batas umum --
      // hanya bila ada pasar untuk disebut]. Kalimat batas dicetak SEKALI
      // untuk seluruh bagian ini, bukan diulang tiap provinsi -- lihat
      // dokumentasi teksPasar di ./teks.
      let batasDicetak = false;
      for (const provinsi of provinsiTerlibat) {
        const daftarPasar: PasarProvinsi[] = pasarKomoditas[provinsi] ?? [];
        const [klaim, batas] = teksPasar(daftarPasar, provinsi);
        paragraph(klaim, 9);
        if (!batasDicetak && batas) {
          paragraph(batas, 9, muted);
          batasDicetak = true;
        }
      }
    }
    heading("06  Modal dan imbal hasil");
    if (a.routes.length === 0) {
      paragraph("Rencana ini tidak memuat satu pun rute, sehingga tidak ada modal atau imbal hasil yang relevan untuk ditampilkan di sini.");
    } else {
      // Disaring per POSTUR dan KOMODITAS laporan ini (modalPerKomoditas),
      // bukan agregat lintas enam komoditas pada postur "seimbang" saja
      // (TINDAKAN.modal): modal dan marjin harapan berasal dari
      // flows.parquet, yang genuinely berbeda per postur (rute dan
      // volumenya berbeda) -- laporan rencana Aman Pangan tidak boleh
      // menampilkan imbal hasil yang sebenarnya milik rencana Seimbang.
      // `?? []` (bukan jatuh balik ke postur/komoditas lain) menutupi baik
      // postur tanpa rute sama sekali maupun pasangan postur-komoditas yang
      // rutenya nol -- lihat dokumentasi Tindakan di @/lib/types.
      const [caveatModal, ...barisModal] = teksModal(
        TINDAKAN.modalPerKomoditas[a.postur]?.[a.komoditas] ?? [],
      );
      // caveatModal menyatakan batas yang menentukan seberapa jauh angka ini
      // boleh dipakai (satu transaksi, bersandar pada prediksi yang belum
      // tentu terjadi) -- bukan catatan kaki, jadi ia mendapat perlakuan
      // sama seperti "Peringatan" di Bagian 05 kerangka pemerintah: 10pt
      // hijau, bukan abu-abu 9pt yang dipakai catatan sekunder.
      paragraph(caveatModal, 10, green);
      for (const b of barisModal) paragraph(b);
    }
    heading("07  Batasan");
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

  heading("Glosarium");
  paragraph(
    "Penjelasan yang tersedia sebagai tooltip pada dashboard dicantumkan kembali agar laporan ini dapat dibaca secara mandiri.",
    9,
    muted,
  );
  for (const [term, explanation] of glossary) {
    ensure(13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text(clean(term), left, y);
    y += 5.5;
    paragraph(explanation, 9, muted);
  }

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
    doc.setPage(page);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor("#E2E8E5");
    doc.text(clean(`Dibuat oleh ${generatedBy} | ${generatedAt} WIB`), 105, 151, { align: "center", angle: 35 });
    doc.setDrawColor("#DCE5E7"); doc.line(left, 280, 192, 280);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("Generated by SupplAI | Bahan telaah, bukan keputusan otomatis", left, 286);
    doc.text(`${page} / ${pages}`, 192, 286, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
