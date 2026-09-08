import tingkatanData from "@/data/generated/tingkatan.json"
import { formatRupiah } from "@/lib/format"
import type { ModalRute, PasarProvinsi, PosisiHarga, RantaiMuatan, SetaraKegiatan } from "@/lib/types"
import type { RedistribusiAnalysis } from "./analysis"
import { angka, persen, ton } from "./format"
import type { Kelompok, SebaranKelompokResult } from "./kesenjangan"
import { jendelaWaktu } from "./waktu"

/** Label lengkap tiap kelompok IKP, dari `tingkatan.json` -- satu-satunya
 *  sumber, supaya kalimatnya tidak bisa diam-diam berbeda dari data yang
 *  menghasilkannya. Bukan "daerah tertinggal": itu sebutan resmi dengan
 *  daftarnya sendiri di tingkat kabupaten (Perpres 63/2020), sedangkan ini
 *  provinsi yang diurutkan menurut skor IKP. */
const LABEL_KELOMPOK: Record<Kelompok, string> = tingkatanData.label as Record<Kelompok, string>

/** Peringkat IKP tiap provinsi (1 = tertinggi, `TOTAL_PROVINSI_IKP` =
 *  terendah), dari `tingkatan.json`. Dipakai supaya kalimat "di luar
 *  jangkauan model" bisa menyebut peringkat provinsi ber-IKP terendah di
 *  antara yang disebut, bukan cuma menyebut namanya. Empat nama saja
 *  menyatakan kita kehilangan sejumlah provinsi; menyebut peringkatnya
 *  menyatakan apa yang hilang itu. */
const PERINGKAT_IKP: Map<string, number> = new Map(
  tingkatanData.provinsi.map((p) => [p.provinsi, p.peringkat]),
)
const TOTAL_PROVINSI_IKP = tingkatanData.provinsi.length

/** Menggabung daftar nama dengan "dan" ala Indonesia: "A", "A dan B", atau
 *  "A, B, dan C". */
function daftarDan(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} dan ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`
}

/** Kepala laporan: bulan sasaran dan sisa waktu. Baris pertama selalu ada;
 *  baris kedua berubah bunyinya ketika jendelanya sudah lewat.
 *
 *  `sekarang` diwajibkan, bukan diambil dari `new Date()` di sini, supaya
 *  tidak ada jalur yang diam-diam membaca jam saat fungsi ini diuji. */
export function teksJendela(bulanPrediksi: string, sekarang: Date): string[] {
  const jendela = jendelaWaktu(bulanPrediksi, sekarang)
  const baris1 =
    `Berlaku untuk ${jendela.labelBulan} · Dibuat ${sekarang.toLocaleDateString("id-ID")}`
  const baris2 = jendela.sudahLewat
    ? `Jendela tindakan rencana ini sudah lewat ${Math.abs(jendela.sisaHari)} hari lalu. ` +
      `Intervensi harus terjadi sebelum ${jendela.labelBulan} berjalan agar memengaruhi ` +
      `harganya. Rencana ini perlu dibangun ulang dari ramalan terbaru sebelum dipakai.`
    : `Sisa waktu sampai tenggat: ${jendela.sisaHari} hari. Tenggatnya awal ` +
      `${jendela.labelBulan}, bukan akhirnya.`
  return [baris1, baris2]
}

/** Bagian "Penekanan harga": klaim utama, dasar takarannya, lalu asumsi
 *  terbesar yang menopang angka itu -- diucapkan sebelum ditanya, bukan
 *  ditunggu sampai ditanya.
 *
 *  `a.dampak.ditahanPpRata` / `fraksiRata` bisa `null`, dan nol bukan hal
 *  yang sama dengan null di sini (lihat `rataBobotVolume` di `./analysis`):
 *  nol berarti kami TAHU rencana ini tidak menahan apa-apa, null berarti
 *  kami TIDAK TAHU -- karena sedikitnya satu rute dalam seleksi ini menuju
 *  provinsi tujuan tanpa data konsumsi pendukung. Kasus null di sini tidak
 *  mencetak angka dan tidak mencetak nol; ia menyatakan mengapa angkanya
 *  tidak ada. Ini meniru pilihan yang sudah diambil `rataBobotVolume` dan
 *  blok fakta Python yang sama-sama menghilangkan figur ini seluruhnya
 *  dalam situasi yang sama, alih-alih diam-diam merata-ratakan sisa rute
 *  yang datanya ada -- dua lapisan yang membaca sumber yang sama tidak
 *  boleh berselisih pendapat soal apa arti "tidak diketahui".
 *
 *  Satu angka, dua besaran: `ditahanPpRata` adalah POIN PERSEN dari kenaikan
 *  yang diprediksi, dirender dengan `angka` (tanpa tanda %) karena unitnya
 *  sudah disebut dalam kata "poin persen" di sampingnya -- menambahkan %
 *  akan menyatakan besaran yang berbeda dan lebih kecil (X% DARI kenaikan,
 *  bukan X poin persen DARInya). `fraksiRata` genuinely adalah pecahan 0..1
 *  dari kenaikan itu, jadi ia dan harga akhir yang "lebih rendah" memang
 *  berhak atas tanda %, dirender dengan `persen`.
 *
 *  `ditahanPpRata` dan `fraksiRata` TIDAK setara, walau berasal dari data
 *  yang sama: `fraksiRata` adalah rata-rata TERBOBOT dari rasio per-rute
 *  (d_i/r_i), sedangkan `ditahanPpRata` dibagi kenaikan rata-rata adalah
 *  rasio dari dua rata-rata terbobot (mean(d_i)/mean(r_i)) -- pembagian dan
 *  rata-rata tidak bertukar urutan begitu saja, jadi kalimat tidak boleh
 *  memakai "atau" seakan keduanya cara lain menyatakan angka yang sama.
 *
 *  Klaim "harga akhir X% lebih rendah dibanding tanpa intervensi" TIDAK
 *  sama dengan `ditahanPpRata` dibaca sebagai persen: bila kenaikan yang
 *  diprediksi adalah r% dan yang ditahan d poin, harga tanpa intervensi naik
 *  ke P0(1+r/100) dan harga dengan intervensi naik lebih sedikit, ke
 *  P0(1+(r-d)/100). Selisih relatif keduanya adalah d/(1+r/100), BUKAN d --
 *  memakai d langsung sebagai persen membesar-besarkan klaim (satu kasus
 *  nyata mencetak 1,78% padahal 1,55% yang tepat). `kenaikanRata` di
 *  `./analysis` memulihkan r dari ditahanPp/fraksiDitahan tiap rute. */
export function teksPenekananHarga(a: RedistribusiAnalysis): string[] {
  const { ditahanPpRata, fraksiRata, kenaikanRata } = a.dampak
  const klaim =
    a.totalRute === 0
      ? "Rencana ini tidak memuat satu pun rute, sehingga tidak ada klaim " +
        "penekanan harga yang dapat dinyatakan."
      : ditahanPpRata === null || fraksiRata === null || kenaikanRata === null
        ? "Rencana ini tidak menghasilkan angka penekanan harga gabungan: " +
          "setidaknya satu rute dalam seleksi ini menuju provinsi tujuan tanpa " +
          "data konsumsi pendukung, sehingga seberapa jauh harga akhirnya lebih " +
          "rendah dibanding tanpa intervensi tidak diketahui — bukan nol. Rute " +
          "yang datanya tersedia sengaja tidak dirata-ratakan sendirian, karena " +
          "itu akan diam-diam menyembunyikan rute yang tidak diketahui itu."
        : `Rencana ini menahan rata-rata ${angka(ditahanPpRata)} poin persen ` +
          `dari kenaikan yang diprediksi. Secara terpisah, rata-rata terbobot ` +
          `di seluruh rute, bagian kenaikan yang tertahan per rute adalah ` +
          `sekitar ${persen(fraksiRata * 100)} — dua cara berbeda merangkum ` +
          `data yang sama, bukan angka yang setara. Artinya harga di provinsi ` +
          `tujuan berakhir sekitar ${persen(ditahanPpRata / (1 + kenaikanRata / 100))} ` +
          `lebih rendah dibanding tanpa intervensi — bukan turun sebesar itu ` +
          `dari harga hari ini.`

  const takaran =
    `Angka ini mewarisi dasar takaran rutenya: ${a.terukur} rute bersandar ` +
    `pada kebutuhan terukur, ${a.diasumsikan} rute pada heuristik sisi ` +
    `pasokan. Untuk rute yang diasumsikan, dampak harganya juga diasumsikan.`

  const basis =
    `Efek harga berlaku atas seluruh konsumsi bulanan provinsi tujuan, bukan ` +
    `hanya atas tonase yang dikirim. Itulah sebabnya volume kecil dapat ` +
    `menggeser harga untuk semua pembeli, dan itu pula asumsi terbesar dalam ` +
    `angka di atas.`

  return [klaim, takaran, basis]
}

/** Kerangka pedagang: penjelasan tentang marjin harapan. Ia adalah selisih
 *  antara harga tujuan SETELAH kenaikan yang diprediksi dan harga asal hari
 *  ini, dikurangi ongkos angkut, untuk SELURUH RUTE (bukan per kilogram).
 *  Penting untuk menyatakan bahwa ia harapan (conditional pada kenaikan yang
 *  terjadi) dan bukan penghematan (yang sudah terwujud). Juga harus dijelaskan
 *  perbedaan antara Margin/kg (hari ini, tanpa prediksi) dan Marjin harapan
 *  (setelah prediksi, untuk seluruh rute). */
export function teksMarjin(): string {
  return (
    `Marjin harapan adalah total rute — selisih antara harga tujuan setelah ` +
    `kenaikan yang diprediksi dan harga asal hari ini, dikurangi ongkos angkut ` +
    `untuk seluruh volume. Ia bukan penghematan: angka ini terwujud hanya bila ` +
    `kenaikan yang diprediksi benar-benar terjadi. Marjin negatif ditampilkan ` +
    `apa adanya. Margin/kg di kolom sebelumnya adalah selisih hari ini per ` +
    `kilogram, tanpa prediksi — dua besaran berbeda, keduanya berguna bagi ` +
    `pedagang yang memutuskan apakah perlu memindahkan barang.`
  )
}

/** Bagian "Kesenjangan": ke kelompok IKP mana rencana ini sampai.
 *
 *  `sebaran` datang dari `sebaranKelompok` (lihat `./kesenjangan`) apa
 *  adanya -- fungsi ini tidak menghitung ulang, hanya merangkai kalimat dari
 *  angka yang sudah ada. Kelompoknya selalu disebut dengan label lengkapnya
 *  dari `tingkatan.json` ("sepertiga terbawah/tengah/teratas IKP Bapanas
 *  2025"), TIDAK PERNAH "daerah tertinggal": itu sebutan resmi dengan
 *  daftarnya sendiri di tingkat kabupaten (Perpres 63/2020), bukan provinsi
 *  yang diurutkan menurut skor IKP -- memakainya di sini salah tingkatan
 *  administratif sekaligus salah daftar.
 *
 *  `ikpTanpaHarga` dan `sebaran.tanpaTingkatan` adalah dua lubang yang
 *  berbeda dan TIDAK BOLEH tertukar:
 *  - `ikpTanpaHarga` (dari `cakupan.ikpTanpaHarga` di `tingkatan.json`):
 *    provinsi yang PUNYA skor IKP tapi harganya tidak pernah dimodelkan sama
 *    sekali, karena datanya masih memakai pembagian provinsi sebelum
 *    pemekaran 2022. Ini lubang pada JANGKAUAN PRODUK -- provinsi itu tidak
 *    bisa muncul di rute manapun, terlepas dari rencana yang mana.
 *  - `sebaran.tanpaTingkatan`: tujuan rute PADA RENCANA INI yang tidak
 *    punya skor IKP sama sekali, sehingga volumenya tidak masuk salah satu
 *    dari tiga kelompok. Ini lubang pada RENCANA -- alasannya bisa berbeda
 *    tiap kali (skor belum ada, nama tidak cocok, dst).
 *  Alat pemerataan yang tidak bisa melihat provinsi paling rentan adalah hal
 *  yang wajib diketahui pemakainya, bukan cacat yang disembunyikan -- karena
 *  itu keduanya dinyatakan eksplisit, bukan digabung diam-diam ke salah satu
 *  kelompok atau saling menutupi satu sama lain, dan tidak digabung jadi
 *  satu kalimat yang sama.
 *
 *  Urutan array yang dikembalikan adalah bagian dari kontraknya, bukan
 *  kebetulan: [kalimat utama, kalimat jangkauan model (HANYA bila
 *  `ikpTanpaHarga` tidak kosong), lalu kalimat-kalimat kondisional lain apa
 *  adanya]. `report.ts` menyandarkan diri pada urutan ini untuk mencetak
 *  kalimat jangkauan model senormal kalimat utama -- ia BUKAN aside dan
 *  tidak boleh mendapat perlakuan catatan kaki (abu-abu, 9pt) seperti
 *  kalimat kondisional lainnya, karena ia menyatakan provinsi yang produk
 *  ini tidak akan pernah bisa jangkau sama sekali, termasuk yang ber-IKP
 *  terendah di negeri ini. */
export function teksKesenjangan(
  sebaran: SebaranKelompokResult,
  ikpTanpaHarga: string[],
): string[] {
  const hasil: string[] = []

  const bagian = sebaran.kelompok
    .map((k) => `${persen(k.persen)} ke ${LABEL_KELOMPOK[k.kelompok]}`)
    .join(", ")
  hasil.push(`Dari seluruh tonase rencana ini, ${bagian}.`)

  if (ikpTanpaHarga.length > 0) {
    const berperingkat = ikpTanpaHarga
      .map((nama) => ({ nama, peringkat: PERINGKAT_IKP.get(nama) }))
      .filter((p): p is { nama: string; peringkat: number } => p.peringkat !== undefined)
    const terendah =
      berperingkat.length > 0
        ? berperingkat.reduce((a, b) => (b.peringkat > a.peringkat ? b : a))
        : null
    // Empat nama menyatakan kita kehilangan sejumlah provinsi; peringkat
    // menyatakan APA yang hilang -- provinsi ber-IKP terendah yang justru
    // paling butuh dilihat alat pemerataan ini.
    const catatanPeringkat = terendah
      ? ` Salah satunya, ${terendah.nama}, berperingkat ${terendah.peringkat} dari ${TOTAL_PROVINSI_IKP} -- IKP terendah di seluruh Indonesia.`
      : ""
    hasil.push(
      `${daftarDan(ikpTanpaHarga)} punya skor IKP Bapanas 2025 tetapi berada di luar jangkauan model ini: ` +
        `data harganya masih memakai pembagian provinsi sebelum pemekaran 2022, sehingga rencana ini tidak ` +
        `pernah bisa mengirim ke sana.${catatanPeringkat}`,
    )
  }

  const nol = sebaran.kelompok.filter((k) => k.ton === 0)
  if (nol.length > 0) {
    hasil.push(
      `${daftarDan(nol.map((k) => LABEL_KELOMPOK[k.kelompok]))} tidak menerima apa pun dari rencana ini.`,
    )
  }

  if (sebaran.tanpaTingkatan.provinsi.length > 0) {
    hasil.push(
      `${ton(sebaran.tanpaTingkatan.ton)} (${persen(sebaran.tanpaTingkatan.persen)} dari total rencana ini) ` +
        `menuju ${daftarDan(sebaran.tanpaTingkatan.provinsi)} tidak punya skor IKP, sehingga tonase itu ` +
        `tidak masuk sebaran kelompok mana pun di atas.`,
    )
  }

  return hasil
}

/** Enam komoditas yang benar-benar punya model ramalan tiga bulan (lihat
 *  `COMMODITY_MAP` di `supplai/data.py`). Daftar tetap, bukan diturunkan dari
 *  `baris` yang masuk ke `teksLanskap`: "diramalkan" adalah properti produk
 *  (model mana yang kami latih), bukan properti baris data lanskap tertentu
 *  yang kebetulan lewat -- dua hal yang harus tetap terpisah walau hari ini
 *  kebetulan sejalan. */
const KOMODITAS_DIRAMALKAN = [
  "Beras Medium", "Bawang Merah", "Bawang Putih", "Daging Ayam", "Telur Ayam", "Minyak Goreng",
]

/** Dua dari delapan komoditas lanskap yang TIDAK kami ramalkan: keduanya
 *  punya harga dan neraca nasional (lihat `supplai/lanskap.py`,
 *  `data/neraca_nasional.csv`) tapi tidak ada model tiga bulan untuknya.
 *  Nama tetap sesuai brief tugas ini, bukan dihitung dari
 *  `KOMODITAS_DIRAMALKAN` -- lihat komentar di atasnya. */
const KOMODITAS_TANPA_RAMALAN = ["Daging Sapi", "Gula Pasir"]
const SET_TANPA_RAMALAN = new Set(KOMODITAS_TANPA_RAMALAN)

/** Bagian "Lanskap komoditas" pada kerangka pedagang: komoditas mana di
 *  provinsi yang diminta harganya di bawah median nasional, mana persis
 *  setara, dan mana di atas, dengan selisihnya. Harga HET-anchored sering
 *  jatuh persis di median, jadi "setara median" adalah kelompoknya sendiri,
 *  bukan dilempar ke "di bawah" atau "di atas" -- selisih 0,00% tidak
 *  membuktikan arah manapun.
 *
 *  Ini BACAAN HARGA, bukan bacaan pasokan, dan kalimat itu bagian dari
 *  kontrak fungsi ini, bukan komentar pinggir: harga di bawah median adalah
 *  bukti kelimpahan setempat, bukan pengukurannya. Data produksi per
 *  provinsi tidak tersedia bagi kami -- buku besar mencatat baris yang
 *  sama persis ("Kapasitas kirim provinsi sumber": "Heuristik yang
 *  dinyatakan; data produksi per provinsi tidak tersedia bagi kami") -- jadi
 *  kata "surplus" di produk ini berarti "harga di bawah median dan tidak
 *  diramalkan melonjak", bukan kelebihan produksi terukur. Kalimat ini
 *  menjaga layar dan PDF sepakat dengan buku besar, bukan menyimpulkan
 *  sendiri sesuatu yang lebih kuat dari yang datanya dukung.
 *
 *  Urutan array yang dikembalikan adalah bagian dari kontraknya, seperti
 *  `teksKesenjangan`: [klaim per-provinsi, bacaan-harga bukan-bacaan-pasokan,
 *  penanda enam-diramalkan/dua-tidak]. Dua kalimat terakhir TIDAK bergantung
 *  pada apakah provinsi yang diminta punya baris data -- keduanya pernyataan
 *  umum tentang produk ini, bukan simpulan atas baris yang ditemukan --
 *  sehingga `report.ts` boleh mencetaknya sekali saja untuk seluruh bagian
 *  (mengambilnya dari panggilan provinsi manapun) sementara elemen pertama
 *  dicetak ulang tiap provinsi.
 *
 *  Penanda enam-diramalkan/dua-tidak TIDAK BOLEH tinggal hanya di kalimat
 *  `penanda`: satu provinsi mencetak sampai delapan angka berdampingan
 *  ("... Daging Sapi (7,73%), Gula Pasir (3,85%) ..."), dan pembaca yang
 *  sedang memindai satu baris tidak menahan kalimat penjelas dari bagian
 *  lain di kepalanya. Aturan "angka tidak boleh membawa nama yang tidak
 *  didukung definisinya" mengikat ANGKA itu sendiri, bukan paragraf
 *  tempatnya berada -- karena itu `sebut` di bawah menambahkan penanda
 *  ", tidak diramalkan" tepat di sebelah tiap angka Daging Sapi/Gula Pasir,
 *  bukan cuma di kalimat `penanda` yang menjelaskan artinya.
 *
 *  Provinsi yang diminta tapi tidak punya baris di `baris` (nama tidak
 *  cocok, atau provinsi itu di luar cakupan `lanskap.json`) TIDAK dibiarkan
 *  diam: elemen pertama menyatakan eksplisit bahwa datanya tidak ada,
 *  alih-alih mencetak daftar kosong yang terbaca seolah provinsi itu
 *  benar-benar tidak punya komoditas bermasalah. */
export function teksLanskap(baris: PosisiHarga[], provinsi: string): string[] {
  const milikProvinsi = baris.filter((b) => b.provinsi === provinsi)

  const bawah = milikProvinsi
    .filter((b) => b.posisi === "di bawah median")
    .sort((x, y) => x.komoditas.localeCompare(y.komoditas, "id"))
  const atas = milikProvinsi
    .filter((b) => b.posisi === "di atas median")
    .sort((x, y) => x.komoditas.localeCompare(y.komoditas, "id"))
  // Jarang terisi -- kebanyakan provinsi tidak punya komoditas yang persis
  // setara mediannya -- jadi klausanya HANYA muncul ketika ada isinya,
  // bukan dipaksakan "tidak ada komoditas setara median" di tiap provinsi
  // seperti dua kelompok di atas. Itu tetap jujur: kelompok "bawah"/"atas"
  // selalu relevan menyatakan (kosong atau tidak) karena delapan komoditas
  // selalu jatuh ke salah satu dari tiga kelompok, sedangkan absennya
  // "setara" di sebagian besar provinsi bukan temuan, hanya kasus biasa.
  const setara = milikProvinsi
    .filter((b) => b.posisi === "setara median")
    .sort((x, y) => x.komoditas.localeCompare(y.komoditas, "id"))
  const sebut = (list: PosisiHarga[]) =>
    daftarDan(
      list.map(
        (b) =>
          `${b.komoditas} (${persen(b.relatifPersen)}${SET_TANPA_RAMALAN.has(b.komoditas) ? ", tidak diramalkan" : ""})`,
      ),
    )

  const segmen = [
    bawah.length > 0 ? `di bawah median ${sebut(bawah)}` : "tidak ada komoditas di bawah median",
    atas.length > 0 ? `di atas median ${sebut(atas)}` : "tidak ada komoditas di atas median",
  ]
  if (setara.length > 0) {
    segmen.push(`setara median ${sebut(setara)}`)
  }

  const klaim =
    milikProvinsi.length === 0
      ? `Lanskap harga tidak memuat baris untuk ${provinsi}, sehingga posisi komoditasnya ` +
        `terhadap median nasional tidak dapat dinyatakan di sini.`
      : `Di ${provinsi}, terhadap median nasional: ${segmen.join("; ")}.`

  const bacaanHarga =
    `Ini bacaan harga, bukan bacaan pasokan: harga di bawah median nasional adalah bukti ` +
    `kelimpahan setempat, bukan pengukurannya -- data produksi per provinsi tidak tersedia ` +
    `bagi kami.`

  const penanda =
    `Dari delapan komoditas yang lanskap ini baca, enam kami ramalkan tiga bulan ke depan -- ` +
    `${daftarDan(KOMODITAS_DIRAMALKAN)} -- dan dua tidak kami ramalkan, hanya dibaca harganya: ` +
    `${daftarDan(KOMODITAS_TANPA_RAMALAN)}.`

  return [klaim, bacaanHarga, penanda]
}

/** Bidang yang dipakai `teksMuatanBalik`, dipetik dari `RantaiMuatan`
 *  (`@/lib/types`) -- fungsi ini tidak butuh `totalTon`, `simpul`, `rantai`,
 *  maupun `tonKmKosongDihindari` untuk merangkai kalimatnya. */
type MuatanBalikTeksInput = Pick<
  RantaiMuatan, "nRute" | "tonKm" | "pasanganBolakBalik" | "tonDirantai" | "persenDirantai"
>

/** Bagian "Muatan balik" pada kerangka pedagang: apakah rencana ini punya
 *  pasangan rute bolak-balik pada komoditas yang sama (yang bisa menagih
 *  ongkos kaki pulang), dan apa yang ada sebagai gantinya.
 *
 *  `pasanganBolakBalik` nol BUKAN kegagalan menghitung -- ia TEMUAN tentang
 *  rencana kita sendiri: tidak ada rute tujuan A->B yang berpasangan dengan
 *  rute B->A pada komoditas yang sama. Konsekuensinya, bila setiap rute
 *  berjalan sebagai perjalanan khusus, seluruh `tonKm` kaki pulang berjalan
 *  kosong -- bukan sebagian, bukan sebuah dugaan.
 *
 *  Yang ADA, sebagai gantinya, adalah RANTAI: provinsi yang sekaligus
 *  menerima dan mengirim komoditas berbeda, sehingga kaki masuknya bisa
 *  disambung ke kaki keluarnya tanpa perjalanan pulang kosong. `persenDirantai`
 *  dihitung HANYA atas enam komoditas yang kita modelkan -- sebuah agregator
 *  muatan sungguhan juga melihat hasil bumi lokal yang tidak kita lihat sama
 *  sekali -- jadi angka ini LANTAI, bukan langit-langit, dan kalimatnya harus
 *  bilang begitu, bukan cuma mencetak angkanya.
 *
 *  Kami tidak punya model kendaraan (kapal, truk, atau moda apa pun): kapal
 *  mana yang benar-benar menempuh kaki pulang yang kosong itu, atau bahkan
 *  apakah satu kendaraan menempuh kedua kaki sekaligus, tidak diketahui di
 *  sini. Kalimatnya tidak boleh terbaca seakan kami tahu.
 *
 *  `tonKm`, `tonDirantai`, dan `persenDirantai` bisa `null` (lihat
 *  `RantaiMuatan` di `@/lib/types`): baris yang mendasarinya ada tapi
 *  volumenya tidak diketahui -- dicetak sebagai "tidak diketahui", bukan 0. */
export function teksMuatanBalik(d: MuatanBalikTeksInput): string[] {
  if (d.nRute === 0) {
    return [
      "Rencana ini tidak memuat satu pun rute, sehingga tidak ada muatan " +
        "balik yang dapat dinyatakan.",
    ]
  }

  const pasangan =
    d.pasanganBolakBalik === 0
      ? "nol pasangan bolak-balik"
      : `${angka(d.pasanganBolakBalik, 0)} pasangan bolak-balik`
  const tonKmTeks = d.tonKm === null ? "tidak diketahui" : `${angka(d.tonKm, 0)} ton-km`

  const temuan =
    `Dari ${d.nRute} rute pada rencana ini, kami menemukan ${pasangan}: tidak ada ` +
    `rute tujuan yang berpasangan dengan rute pulang pada komoditas yang sama. Bila ` +
    `setiap rute berjalan sebagai perjalanan khusus, seluruh ${tonKmTeks} kaki pulang ` +
    `berjalan kosong.`

  const perantaian =
    d.persenDirantai === null || d.tonDirantai === null
      ? "Sebagai gantinya, seberapa banyak tonase yang bisa dirantai lewat provinsi " +
        "yang sekaligus menerima dan mengirim tidak diketahui di sini -- bukan nol."
      : `Sebagai gantinya, ${ton(d.tonDirantai)} (${persen(d.persenDirantai)}) tonase ` +
        `bisa dirantai lewat provinsi yang sekaligus menerima dan mengirim komoditas ` +
        `berbeda, memakai kaki masuknya sebagai kaki keluar. Angka ini dihitung hanya ` +
        `atas enam komoditas yang kita modelkan, sehingga ia lantai, bukan langit-langit: ` +
        `agregator muatan sungguhan juga melihat hasil bumi lokal yang tidak kita lihat ` +
        `sama sekali.`

  const batasKendaraan =
    "Kami tidak punya model kendaraan: kapal mana yang benar-benar menempuh kaki " +
    "pulang yang kosong itu, atau apakah satu kendaraan menempuh kedua kaki sekaligus, " +
    "tidak diketahui di sini."

  return [temuan, perantaian, batasKendaraan]
}

/** Bagian "Pasar bernama" pada kerangka pedagang: pasar WFP yang tercatat di
 *  satu provinsi, tempat harga komoditas DIAMATI.
 *
 *  BATASNYA, dan ini bagian dari kontrak fungsi ini, bukan komentar pinggir:
 *  menyebut nama pasar bukan jaminan barangnya tersedia di sana -- kami tidak
 *  punya data pasokan tingkat pasar. Sebuah pasar yang muncul di sini berarti
 *  "harga komoditas ini pernah tercatat di sini", bukan "barangnya ada
 *  sekarang".
 *
 *  Urutan array yang dikembalikan adalah bagian dari kontraknya, seperti
 *  `teksLanskap`: [klaim per-provinsi (nama-nama pasar), lalu kalimat batas
 *  umum -- HANYA ada bila ada pasar untuk disebut]. Kalimat batas TIDAK
 *  bergantung pada provinsi mana pun, jadi `report.ts` boleh mencetaknya
 *  sekali untuk seluruh bagian, bukan diulang di tiap provinsi. */
export function teksPasar(pasar: PasarProvinsi[], provinsi: string): string[] {
  if (pasar.length === 0) {
    return [
      `Tidak ada pasar WFP yang tercatat untuk ${provinsi} dalam data kami, sehingga ` +
        `tidak ada nama pasar yang dapat disebut di sini.`,
    ]
  }

  const daftar = daftarDan(pasar.map((p) => `${p.nama} (${p.kabupaten})`))
  return [
    `Di ${provinsi}, harga komoditas ini diamati di ${daftar}.`,
    `Nama pasar di sini menandai tempat pengamatan harga, bukan bukti bahwa barangnya ` +
      `ada di lokasi itu saat rencana ini dibaca -- kami tidak punya data pasokan ` +
      `tingkat pasar.`,
  ]
}

/** Bidang yang dipakai `teksModal`, dipetik dari `ModalRute` (`@/lib/types`)
 *  -- fungsi ini tidak butuh `ton`. */
type ModalTeksInput = Pick<ModalRute, "dari" | "modalRp" | "marjinRp" | "imbalHasilPersen">

/** Ambang imbal hasil per-transaksi (persen) di bawah mana sebuah rute pada
 *  bagian "Modal dan imbal hasil" kami tandai tidak layak diambil.
 *
 *  Angka yang kami PILIH, bukan yang kami UKUR -- dicatat pula di buku besar
 *  (`supplai/buku_besar.py`, entri "Ambang imbal hasil layak modal
 *  pedagang"), karena ia menentukan klaim yang laporan ini buat, bukan cuma
 *  detail rendering. Pada rencana "seimbang" saat ini, ambang ini memisahkan
 *  Bengkulu (0,18%) dari delapan rute lain (>= 6,72%) -- pemisah yang jelas
 *  pada data ini, bukan kalibrasi selera risiko pedagang sungguhan, yang
 *  tidak kami ukur. */
export const AMBANG_IMBAL_HASIL_LAYAK_PERSEN = 5

/** Bagian "Modal dan imbal hasil" pada kerangka pedagang: modal yang
 *  terkunci di tiap provinsi asal, dan imbal hasil yang diharapkan bila
 *  kenaikan harga yang diprediksi benar-benar terjadi.
 *
 *  `imbalHasilPersen` adalah imbal hasil SATU TRANSAKSI -- sekali jalan --
 *  BUKAN basis tahunan: kalimatnya tidak boleh terbaca seakan angka ini bisa
 *  diulang begitu saja tiap tahun.
 *
 *  Rute yang imbal hasilnya di bawah `AMBANG_IMBAL_HASIL_LAYAK_PERSEN`
 *  ditandai tidak layak diambil, dengan modal dan imbal hasilnya disebut
 *  eksplisit -- bukan cuma persennya -- supaya pembaca tidak menyandingkan
 *  begitu saja rute yang mengunci miliaran rupiah untuk imbal hasil di bawah
 *  1% dengan rute berimbal hasil puluhan persen, seakan keduanya pilihan
 *  yang sebanding.
 *
 *  `imbalHasilPersen` bisa `null` (lihat `ModalRute` di `@/lib/types`):
 *  berarti modal pada rute itu nol, bukan imbal hasil nol atau tak hingga. */
export function teksModal(modal: ModalTeksInput[]): string[] {
  if (modal.length === 0) {
    return ["Tidak ada rute dengan modal dan imbal hasil yang dapat dinyatakan di sini."]
  }

  const caveat =
    `Imbal hasil di bawah ini adalah untuk satu transaksi -- sekali jalan -- dan ` +
    `bersandar pada asumsi bahwa kenaikan harga yang diprediksi di provinsi tujuan ` +
    `benar-benar terjadi. Modal yang terkunci dihitung dari harga beli di provinsi ` +
    `asal saat rute ini dijalankan.`

  const baris = modal.map((m) => {
    if (m.imbalHasilPersen === null) {
      return (
        `${m.dari} tidak punya modal yang tercatat pada rute ini, sehingga imbal ` +
        `hasilnya tidak diketahui -- bukan nol atau tak hingga.`
      )
    }
    const layak = m.imbalHasilPersen >= AMBANG_IMBAL_HASIL_LAYAK_PERSEN
    return (
      `${m.dari} mengunci ${formatRupiah(m.modalRp)} modal untuk marjin harapan ` +
      `${formatRupiah(m.marjinRp)}, imbal hasil ${persen(m.imbalHasilPersen)}` +
      (layak
        ? "."
        : ` -- di bawah ambang layak ${persen(AMBANG_IMBAL_HASIL_LAYAK_PERSEN)} yang kami ` +
          `tetapkan; kami tandai rute ini "tidak layak diambil", tidak sebanding ` +
          `disandingkan begitu saja dengan rute berimbal hasil puluhan persen.`)
    )
  })

  return [caveat, ...baris]
}

/** Bagian "Kapasitas instrumen" pada kerangka pemerintah: tonase rencana ini,
 *  diubah menjadi setara jumlah kegiatan Gerakan Pangan Murah (GPM), lalu
 *  dibandingkan dengan kapasitas TAHUNAN NASIONAL instrumen itu (lihat
 *  `setara_kegiatan()` di `supplai/tindakan.py`).
 *
 *  TEMUAN YANG LEBIH PENTING DARI KONVERSINYA SENDIRI, dan alasan fungsi ini
 *  ada: rencana SATU BULAN sering setara sebagian besar kapasitas GPM
 *  SETAHUN PENUH. Merekomendasikan volume ini tanpa menyatakan bahwa GPM
 *  sendirian tidak akan sanggup menyerapnya sebagai tindakan berulang adalah
 *  kelalaian yang bisa dihindari dengan satu paragraf -- merekomendasikan
 *  volume di luar kapasitas instrumen yang kita sendiri jadikan pembanding,
 *  tanpa mengatakannya. Ambang "tidak akan sanggup" di sini dites lewat fakta
 *  aritmatika, bukan angka bulat yang dipilih sembarang: bila bulan ini
 *  diulang genap 12 kali, `persenKapasitas * 12` akan lewat 100% kapasitas
 *  tahunan -- itulah kondisi yang memicu kalimatnya, bukan ambang selera.
 *
 *  Konversinya INDIKATIF, bukan takaran, dan mewarisi tiga peringatan yang
 *  sudah melekat pada Kecukupan GPM di bagian rute (lihat `report.ts`): GPM
 *  satu instrumen di antara beberapa -- penyaluran Cadangan Pangan Pemerintah
 *  jauh lebih besar dan tidak terhitung di sini -- anggaran per kegiatan
 *  adalah rencana 2027 diterapkan pada realisasi 2026, dan GPM menjual
 *  beberapa komoditas sekaligus sehingga mengonversinya memakai harga satu
 *  komoditas bersifat indikatif.
 *
 *  `s` di sini adalah agregat LINTAS ENAM KOMODITAS pada postur "seimbang"
 *  SELALU -- `setara_kegiatan()` tidak menerima parameter komoditas maupun
 *  postur (lihat dokumentasi `SetaraKegiatan`/`Tindakan` di `@/lib/types`).
 *  Fungsi ini sendiri tidak tahu komoditas atau postur laporan mana yang
 *  memanggilnya; `report.ts` bertanggung jawab menyatakan cakupan itu di
 *  kalimat pembuka bagian, SEBELUM angka mana pun dicetak -- bukan di
 *  catatan kaki. */
export function teksInstrumen(s: SetaraKegiatan): string[] {
  const klaim =
    `Dinilai pada harga tujuan, rencana ini setara ${angka(s.kegiatan, 0)} kegiatan Gerakan ` +
    `Pangan Murah (GPM) -- konversi indikatif, bukan takaran, dari nilai ${formatRupiah(s.nilaiRp)} ` +
    `atas ${ton(s.ton)}. Kapasitas GPM nasional adalah ${angka(s.kapasitasTahunan, 0)} kegiatan PER ` +
    `TAHUN, sehingga rencana ini sendirian setara ${persen(s.persenKapasitas)} dari kapasitas ` +
    `tahunan itu.`

  const akanMelewatiTahunan = s.persenKapasitas * 12 > 100
  const sanggup = akanMelewatiTahunan
    ? `GPM sendirian tidak akan sanggup menyerap rencana seukuran ini sebagai tindakan yang ` +
      `berulang: diulang genap 12 kali, rencana ini sendirian sudah melewati seluruh kapasitas ` +
      `TAHUNAN instrumen yang kita jadikan pembanding. Merekomendasikan volume ini tanpa ` +
      `menyatakan batas itu adalah kelalaian yang bisa dihindari dengan satu paragraf -- GPM perlu ` +
      `didampingi instrumen lain, seperti penyaluran Cadangan Pangan Pemerintah, bukan dijadikan ` +
      `satu-satunya jalur.`
    : `Pada angka ini, kapasitas GPM tahunan masih cukup menampung rencana ini bila diulang tiap ` +
      `bulan sepanjang tahun -- tetapi angka ini tidak menyatakan berapa banyak kapasitas itu ` +
      `sudah dipakai instrumen lain atau bulan-bulan lain sepanjang tahun yang sama.`

  const takaran =
    `Angka ini mewarisi tiga peringatan yang sudah melekat pada Kecukupan GPM: GPM hanya satu dari ` +
    `beberapa instrumen -- penyaluran Cadangan Pangan Pemerintah jauh lebih besar dan tidak ` +
    `terhitung di sini; anggaran per kegiatan adalah rencana 2027 yang diterapkan pada realisasi ` +
    `2026; dan GPM menjual beberapa komoditas sekaligus, sehingga mengonversinya memakai harga satu ` +
    `komoditas bersifat indikatif, bukan takaran.`

  return [klaim, sanggup, takaran]
}

/** Bidang yang dipakai `teksUjiOngkos`, sebagian dipetik dari `UjiOngkos`
 *  (`@/lib/types`). Hanya tiga field yang wajib (`ruteBerubah`,
 *  `persenBawahJarak`, `persenBawahTetap`); sisanya opsional supaya
 *  kalimatnya tetap bisa dirangkai walau pemanggil hanya berikan yang ia
 *  punya.
 *
 *  BATAS YANG DIWARISI DARI SUMBERNYA (lihat dokumentasi `UjiOngkos` di
 *  `@/lib/types` dan `bench_ongkos.py`): seluruh angka di sini adalah
 *  agregat LINTAS ENAM KOMODITAS pada postur "seimbang" SELALU -- fungsi
 *  ini sendiri tidak tahu komoditas atau postur laporan mana yang
 *  memanggilnya. `report.ts` bertanggung jawab menyatakan cakupan itu di
 *  kalimat pembuka bagian, SEBELUM angka mana pun dicetak -- bukan di
 *  catatan kaki -- dan mencetak `keterbatasan` dari `UjiOngkos` apa adanya,
 *  bukan diparafrase ulang di sini. */
type UjiOngkosTeksInput = {
  ruteBerubah: number
  persenBawahJarak: number | null
  persenBawahTetap: number | null
  ruteBerubahTetapPlusJarak?: number
  tetapDegenerate?: boolean
  nRuteJarak?: number
}

/** Bagian "Uji ongkos" pada kerangka pemerintah: apakah rencana ini bergeser
 *  ketika jarak dihapus dari fungsi objektif LP dan diganti ongkos datar per
 *  ton (dan, sebagai kontrol, ketika ongkos datar itu DITAMBAHKAN di atas
 *  jarak, bukan menggantikannya).
 *
 *  `ruteBerubah` TIDAK BOLEH dibaca sebagai hasil ekonomi begitu saja: bila
 *  `tetapDegenerate` true, struktur ongkos datar terbukti (lewat perturbasi
 *  ~1 per sejuta yang dijalankan `bench_ongkos.py`) tidak punya preferensi
 *  sama sekali -- total tonase dipatok lantai kebutuhan, sehingga SETIAP
 *  penugasan layak sama optimalnya, dan himpunan rute yang dikembalikan
 *  solver adalah satu titik sembarang dari muka optimal yang datar, bukan
 *  preferensi ekonomi. Kalimatnya menyatakan ini di napas yang sama dengan
 *  angkanya, bukan di kalimat terpisah yang mudah dilewati.
 *
 *  Bila rencananya HAMPIR TIDAK BERGESER (`ruteBerubah` mendekati atau sama
 *  dengan nol), itu BUKAN eksperimen yang gagal -- itu tesis mentor yang
 *  terbukti pada data kita sendiri, dan kalimatnya menyatakan begitu apa
 *  adanya, bukan minta maaf atas hasil yang "kurang meyakinkan".
 *
 *  `persenBawahJarak`/`persenBawahTetap` yang SETARA di kedua struktur
 *  menunjukkan sesuatu yang lebih tajam dari `ruteBerubah` semata: struktur
 *  ongkos tidak bisa mengubah SIAPA yang dilayani sama sekali, karena
 *  tonase ke tiap tujuan dipatok lantai kebutuhan -- ongkos hanya memilih
 *  SUMBER kiriman, bukan tujuannya. */
export function teksUjiOngkos(u: UjiOngkosTeksInput): string[] {
  const jumlahRute = u.nRuteJarak !== undefined ? ` dari ${angka(u.nRuteJarak, 0)} rute` : " rute"

  const perubahan =
    u.ruteBerubah === 0
      ? `Ketika ongkos jarak diganti ongkos datar per ton, nol rute berubah: tidak satu pun rute ` +
        `berpindah -- rencananya sama persis. Ini bukan eksperimen yang gagal: ia tesis mentor -- ` +
        `bahwa jarak bukan kendala sesungguhnya -- terbukti langsung pada data kita sendiri.`
      : `Ketika ongkos jarak diganti ongkos datar per ton, ${angka(u.ruteBerubah, 0)}${jumlahRute} ` +
        `berubah.` +
        (u.tetapDegenerate === true
          ? ` Angka ini TIDAK dibaca sebagai hasil ekonomi: perturbasi kecil (~1 per sejuta) pada ` +
            `ongkos datar menghasilkan himpunan rute yang berbeda-beda pada biaya yang persis sama -- ` +
            `objektif ongkos datar terbukti degenerate, sehingga rute yang dipilih solver adalah satu ` +
            `titik sembarang dari muka optimal yang datar, bukan preferensi ekonomi.`
          : ` Perubahan ini tidak dengan sendirinya membuktikan preferensi ekonomi -- lihat batasan ` +
            `eksperimen di bawah.`)

  const kontrolInert =
    u.ruteBerubahTetapPlusJarak === undefined
      ? null
      : u.ruteBerubahTetapPlusJarak === 0
        ? `Sebagai kontrol, menambahkan ongkos datar per ton DI ATAS jarak (jarak tetap ada di ` +
          `fungsi objektif) tidak menggeser rencana sedikit pun: nol rute berubah. Ongkos datar itu ` +
          `inert secara ekonomi ketika jarak masih menjadi kriteria pembeda.`
        : `Sebagai kontrol, menambahkan ongkos datar per ton DI ATAS jarak mengubah ` +
          `${angka(u.ruteBerubahTetapPlusJarak, 0)}${jumlahRute}.`

  const siapaDilayani =
    u.persenBawahJarak === null || u.persenBawahTetap === null
      ? "Porsi tonase yang sampai ke sepertiga terbawah IKP di bawah struktur ongkos ini tidak diketahui."
      : u.persenBawahJarak === u.persenBawahTetap
        ? `Porsi tonase yang sampai ke sepertiga terbawah IKP tetap ${persen(u.persenBawahJarak)} pada ` +
          `kedua struktur ongkos. Struktur ongkos tidak bisa mengubah SIAPA yang dilayani: tonase ke ` +
          `tiap tujuan dipatok lantai kebutuhan, sehingga ongkos hanya memilih SUMBER kiriman, bukan ` +
          `tujuannya.`
        : `Porsi tonase yang sampai ke sepertiga terbawah IKP adalah ${persen(u.persenBawahJarak)} ` +
          `pada struktur jarak dan ${persen(u.persenBawahTetap)} pada struktur ongkos datar.`

  return kontrolInert === null ? [perubahan, siapaDilayani] : [perubahan, kontrolInert, siapaDilayani]
}
