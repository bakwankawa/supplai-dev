export interface Commodity {
  id: string
  name: string
  unit: string
}

export interface Region {
  id: string
  name: string
  province: string
  lat: number
  lng: number
}

export interface PricePoint {
  date: string
  actual: number | null
  predicted: number | null
  upper: number | null
  lower: number | null
}

export interface PredictionSummary {
  currentPrice: number
  priceChange: number
  predictedPrice: number
  mape: number
}

export interface PredictionResponse {
  summary: PredictionSummary
  timeseries: PricePoint[]
  comparison: { region: string; price: number }[]
}

export interface HeatmapCell {
  date: string
  price: number
  change: number
  /** true = bulan proyeksi, bukan harga yang teramati */
  isFuture?: boolean
}

export interface HeatmapRow {
  region: string
  data: HeatmapCell[]
}

export interface HeatmapResponse {
  summary: { totalRegions: number; avgIncrease: number; alertCount: number }
  matrix: HeatmapRow[]
  topCritical: { region: string; commodity: string; change: number }[]
}

export interface RedistributionProvince {
  id: string
  name: string
  status: "surplus" | "deficit"
  stock: number
}

export type Postur = "konservatif" | "seimbang" | "aman_pangan"

export interface RedistributionRoute {
  from: string
  to: string
  commodity: string
  volume: number
  distance: number
  cost: number
  priority: "high" | "medium" | "low"
  /** Tonnes, to two decimals. Routes are tens of tonnes under population-based
   *  sizing, so the rounded `volume` above is too coarse to compare. */
  volumeTon: number
  /** Shipment as a share of the destination's monthly consumption. This is the
   *  number that shows the plan is not over-subsidising. */
  persenPasar: number
  postur: Postur
  epsilon: number
  /** "terukur" where the volume came from measured consumption; "diasumsikan"
   *  where a declared heuristic was used. */
  dasarTakaran: "terukur" | "diasumsikan"
  /** Share of the computed requirement already covered by Gerakan Pangan
   *  Murah, the intervention programme already running in the destination.
   *  A property of the destination, not of this route: every route into the
   *  same province carries the same value. */
  kecukupanPersen: number
  /** "regional" or "nasional" — a province whose regional elasticity was not
   *  statistically significant falls back to the national figure, and a reader
   *  must be able to tell which happened. */
  epsilonSumber: "regional" | "nasional"
  /** 95% interval on volumeTon, from the published standard error. This is the
   *  destination's interval apportioned by delivery share, not a per-route one. */
  volumeCiBawah: number
  volumeCiAtas: number
  /** The denominator behind persenPasar: the destination's monthly consumption. */
  konsumsiTujuanTonBulan: number
  /** The two prices the solver compared when it chose this lane. Kept here so a
   *  report never has to recompute them from an unrelated artifact and disagree
   *  with the plan it describes. */
  hargaAsal: number
  hargaTujuan: number
  /** Marjin pedagang terhadap harga tujuan yang sudah naik, dikurangi ongkos
   *  angkut. Bukan penghematan: ia keuntungan yang diharapkan bila kenaikan
   *  yang diprediksi benar-benar terjadi. */
  marjinHarapanRp: number
  /** Poin persen kenaikan yang ditahan rute ini. Mewarisi dasarTakaran: bila
   *  volumenya diasumsikan, angka ini juga diasumsikan. `null` — bukan 0 —
   *  bila provinsi tujuan tidak punya data konsumsi pendukung; jangan
   *  tampilkan sebagai angka bila null. */
  ditahanPp: number | null
  ditahanCiBawah: number | null
  ditahanCiAtas: number | null
  /** Bagian kenaikan terprediksi yang tertutup, 0..1. `null` mengikuti
   *  ditahanPp — sama-sama tidak diketahui, bukan nol. */
  fraksiDitahan: number | null
}

export interface RedistributionResponse {
  summary: { totalRoutes: number; totalVolume: number; activeRoutes: string
             estimatedCost: number
             anggaranNasionalTon: number | null
             /** Bulan yang diramal, ISO "YYYY-MM-DD". Tenggat tindakan adalah
              *  AWAL bulan ini, bukan akhirnya. */
             bulanPrediksi: string
             horizonBulan: number
             /** The solver's own reason, e.g. "ok", "tidak perlu intervensi".
              *  Left as a string, not a union: "solver gagal: …" carries a
              *  variable message. */
             status: string }
  provinces: RedistributionProvince[]
  routes: RedistributionRoute[]
}

export type RedistributionByPostur = Record<
  Postur | "default",
  Record<string, RedistributionResponse>
>

export interface Alert {
  id: string
  severity: "kritis" | "tinggi" | "sedang" | "rendah"
  title: string
  region: string
  commodity: string
  timestamp: string
  status: "aktif" | "ditangani" | "selesai"
  confidence: number
  change: number
  detail: {
    recommendation: string
    history: { status: string; timestamp: string }[]
    hargaKini: number
    hargaPrediksi: number
    persentilHistoris: number
    mapeKomoditas: number
    diAtasHet: boolean
    anomaliTerkonfirmasi: boolean
  }
}

export interface AlertResponse {
  summary: { active: number; thisMonth: number }
  alerts: Alert[]
}

export interface BukuBesarEntry {
  input: string
  nilai: string
  sumber: string
  tahun: string
  status: "terukur" | "diasumsikan" | "diturunkan"
}

export interface TingkatanProvinsi {
  provinsi: string
  /** Skor IKP Bapanas 2025, 0-100. Makin tinggi makin tahan pangan. */
  ikp: number
  peringkat: number
  kelompok: "bawah" | "tengah" | "atas"
}

export interface PosisiHarga {
  komoditas: string
  provinsi: string
  harga: number
  medianNasional: number
  /** Selisih terhadap median nasional, dalam persen. Negatif berarti di bawah. */
  relatifPersen: number
  posisi: "di bawah median" | "setara median" | "di atas median"
}

/** Satu pasangan kaki-masuk/kaki-keluar di satu simpul (hub) yang menerima
 *  sekaligus mengirim dalam rencana. BATASNYA: ini rute PENGIRIMAN yang
 *  dipasangkan, bukan kapal — modul sumbernya tidak mengaku tahu kapal mana
 *  yang pulang kosong. */
export interface RantaiBaris {
  hub: string
  dari: string
  ke: string
  komoditasMasuk: string
  komoditasKeluar: string
  /** `null` bila sisi masuk atau keluar hub ini sama sekali tidak diketahui
   *  (`total_max` di `muatan_balik.rantai()` NaN) — tidak diketahui, bukan
   *  nol. */
  tonDirantai: number | null
}

/** Diagnosis muatan balik untuk satu postur: bentuk rute yang benar-benar ada
 *  (rantai — nol simpul menerima DAN mengirim ke/dari pihak yang sama, bukan
 *  pulang-pergi), dan ton-km reposisi kosong yang bisa dihindari bila
 *  kiriman-kiriman itu dirantai.
 *
 *  BATASNYA: `persenDirantai`/`tonDirantai` dihitung HANYA atas enam
 *  komoditas yang dimodelkan — agregator muatan sungguhan juga melihat hasil
 *  bumi lokal, jadi angka ini LANTAI, bukan langit-langit. Jarak kaki pulang
 *  memakai jarak kaki masuk sebagai proksi (asumsi simetri matriks jarak,
 *  dinyatakan bukan diuji secara empiris). `null` — bukan 0 — berarti baris
 *  yang mendasarinya ada tapi volumenya tidak diketahui. */
export interface RantaiMuatan {
  nRute: number
  totalTon: number | null
  tonKm: number | null
  pasanganBolakBalik: number
  simpul: string[]
  tonDirantai: number | null
  persenDirantai: number | null
  tonKmKosongDihindari: number | null
  rantai: RantaiBaris[]
}

export type MuatanBalikByPostur = Record<Postur | "default", RantaiMuatan>

/** Satu struktur ongkos di dalam uji tesis jarak (Bagian 3). `rute` adalah
 *  daftar `[komoditas, dari, ke]` per rute layak (volume > 0). */
export interface StrukturOngkos {
  totalTon: number
  nRute: number
  rute: string[][]
  totalOngkos: number
  /** `null` bila struktur ini tidak mengirim apa pun sama sekali — bukan 0%. */
  tonKeSepertigaBawah: number | null
  persenKeSepertigaBawah: number | null
  ongkosTetapTerkalibrasi: number
}

export interface DegenerasiKomoditas {
  diuji: boolean
  /** Hanya ada bila `diuji` false — alasan komoditas ini dilewati (mis. tidak
   *  ada pasangan surplus-defisit). */
  alasan?: string
  nUlang?: number
  nHimpunanUnik?: number
  /** false berarti perturbasi ~1 per sejuta pada ongkos datar mengubah
   *  himpunan rute — bukti bahwa objektifnya degenerate, bukan berpreferensi. */
  stabil?: boolean
}

/** Hasil uji apakah jarak benar-benar menyetir rencana, dengan mengganti
 *  fungsi ongkos LP (jarak vs. ongkos datar vs. keduanya) dan melihat apakah
 *  rencananya bergeser.
 *
 *  BATASNYA (field `keterbatasan`, wajib disertakan setiap kali `ruteBerubah`
 *  ditampilkan): eksperimen ini hanya bisa mengatakan sesuatu tentang MODEL
 *  ini, bukan logistik pangan Indonesia sungguhan — jarak per km adalah
 *  satu-satunya suku ongkos yang berubah per rute di LP ini, sehingga
 *  eksperimen ini tidak bisa membedakan "jarak tidak penting secara ekonomi"
 *  dari "kami hanya memodelkan jarak". Ketika `tetapDegenerate` true, objektif
 *  ongkos-datar tidak punya preferensi sama sekali — himpunan rute yang
 *  dikembalikan solver pada pasangan itu adalah artefak pemecah LP, bukan
 *  preferensi ekonomi. */
export interface UjiOngkos {
  postur: string
  komoditas: string[]
  struktur: {
    jarak: StrukturOngkos
    tetap: StrukturOngkos
    tetapPlusJarak: StrukturOngkos
  }
  ruteBerubah: number
  ruteBerubahTetapPlusJarak: number
  ongkosTetapTerkalibrasi: number
  tetapDegenerate: boolean
  degenerasiTetapDetail: Record<string, DegenerasiKomoditas>
  statusPerKomoditas: {
    jarak: Record<string, string>
    tetap: Record<string, string>
    tetapPlusJarak: Record<string, string>
  }
  keterbatasan: string
  /** Persen tonase yang mengalir ke provinsi IKP sepertiga terbawah di bawah
   *  struktur jarak/tetap — diratakan dari `struktur.jarak`/`struktur.tetap`
   *  di batas ekspor untuk teks kerangka pemerintah. `null` mengikuti
   *  `persenKeSepertigaBawah` di atas: tidak diketahui, bukan nol. */
  persenBawahJarak: number | null
  persenBawahTetap: number | null
}

/** Konversi tonase rencana menjadi jumlah kegiatan Gerakan Pangan Murah, dan
 *  kapasitas tahunan instrumen itu sebagai pembanding. Angkanya INDIKATIF dan
 *  mewarisi tiga peringatan yang sudah melekat pada Kecukupan GPM: GPM satu
 *  instrumen di antara beberapa, anggaran per kegiatan adalah rencana 2027
 *  atas realisasi 2026, dan GPM menjual beberapa komoditas sekaligus. */
export interface SetaraKegiatan {
  ton: number
  nilaiRp: number
  kegiatan: number
  kapasitasTahunan: number
  persenKapasitas: number
}

/** Satu pasar WFP yang tercatat di sebuah provinsi. BATASNYA: ini tempat
 *  harga DIAMATI, bukan jaminan barang tersedia di sana — tidak ada data
 *  pasokan tingkat pasar. */
export interface PasarProvinsi {
  nama: string
  kabupaten: string
}

/** Modal yang terkunci di satu provinsi asal, dan imbal hasilnya. BATASNYA:
 *  `imbalHasilPersen` adalah imbal hasil SATU TRANSAKSI, bukan setahun, dan
 *  bersandar pada kenaikan harga yang diprediksi benar-benar terjadi. `null`
 *  berarti modal nol (tidak diketahui), bukan imbal hasil nol atau tak hingga. */
export interface ModalRute {
  dari: string
  ton: number
  modalRp: number
  marjinRp: number
  imbalHasilPersen: number | null
}

/** Jalur tindakan pembaca setelah membaca rencana redistribusi (Bagian 5):
 *  instrumen dan kapasitasnya, pasar bernama per provinsi, dan modal-imbal
 *  hasil. `modal` sudah diurutkan menurun menurut `imbalHasilPersen` — bukan
 *  menurut modal — karena pembaca yang memutuskan memindahkan barang ingin
 *  tahu rute mana yang paling menghasilkan per rupiah yang dikunci.
 *
 *  `modal`/`pasar` adalah agregat LINTAS SELURUH ENAM KOMODITAS pada postur
 *  "seimbang" -- dipertahankan untuk pemakai yang genuinely butuh pandangan
 *  lintas komoditas itu. `modalPerKomoditas`/`pasarPerKomoditas` adalah yang
 *  WAJIB dipakai kerangka pedagang: laporan untuk satu komoditas tidak boleh
 *  menyandingkan modal atau menyebut pasar milik komoditas lain sebagai
 *  miliknya sendiri -- itulah persis klaim ("harga KOMODITAS INI diamati di
 *  sini") yang definisi `pasar` (registri pasar, tanpa kolom komoditas)
 *  tidak dukung.
 *
 *  `modalPerKomoditas` keyed DUA tingkat, postur lalu komoditas
 *  (`modalPerKomoditas["aman_pangan"]["Telur Ayam"]`): modal dan marjin
 *  harapan berasal dari `flows.parquet`, yang genuinely berbeda per postur
 *  (rute dan volumenya berbeda) -- menyamakan seluruh postur ke angka
 *  "seimbang" adalah persis defek yang sama dengan klaim pasar di atas,
 *  hanya dalam dimensi berbeda: sebuah rencana Aman Pangan menampilkan
 *  imbal hasil yang sebenarnya milik rencana Seimbang. Postur/komoditas yang
 *  rutenya nol (mis. Bawang Merah dan Minyak Goreng, di kedua postur yang
 *  punya rute sama sekali) memetakan ke array kosong, bukan dihilangkan
 *  ataupun jatuh balik ke postur lain -- lihat dokumentasi
 *  `modal_imbal_hasil()` di `supplai/tindakan.py`.
 *
 *  `pasarPerKomoditas` keyed SATU tingkat, komoditas saja (TANPA postur):
 *  pasar bernama adalah tempat harga PERNAH DIAMATI secara historis
 *  (`wfp_food_prices_idn.csv`), sama sekali tidak bergantung pada rencana
 *  redistribusi mana yang kami pilih -- `pasar_provinsi_komoditas()` bahkan
 *  tidak menerima parameter postur. Menambah dimensi postur di sini akan
 *  menyiratkan ketergantungan yang tidak ada pada datanya.
 *
 *  `setaraKegiatanPerKomoditas` keyed DUA tingkat, postur lalu komoditas --
 *  pola yang SAMA dengan `modalPerKomoditas`, ditambahkan pada ronde
 *  perbaikan yang menutup celah yang sama untuk kapasitas instrumen: Bagian
 *  08 kerangka pemerintah sebelumnya menampilkan `setaraKegiatan` agregat
 *  (gabungan enam komoditas, postur "seimbang" selalu) di bawah judul
 *  komoditas dan postur laporan yang berbeda. `setaraKegiatan()` menerima
 *  parameter `komoditas` sejak ronde ini (lihat `supplai/tindakan.py`);
 *  pasangan postur-komoditas yang rutenya nol memetakan ke nilai NOL apa
 *  adanya (fakta terukur "tidak mengirim", bukan ketiadaan data) lewat
 *  `.sum()` pandas atas seleksi kosong -- bukan dihilangkan, dan bukan
 *  jatuh balik ke komoditas lain. `kapasitasTahunan` di setiap entri TETAP
 *  1.888: itu konstanta program nasional, tidak ikut disaring per
 *  komoditas -- hanya pembilangnya (`ton`/`nilaiRp`/`kegiatan`/
 *  `persenKapasitas`) yang genuinely berbeda per komoditas. */
export interface Tindakan {
  setaraKegiatan: SetaraKegiatan
  setaraKegiatanPerKomoditas: Record<Postur, Record<string, SetaraKegiatan>>
  modal: ModalRute[]
  modalPerKomoditas: Record<Postur, Record<string, ModalRute[]>>
  pasar: Record<string, PasarProvinsi[]>
  pasarPerKomoditas: Record<string, Record<string, PasarProvinsi[]>>
}
