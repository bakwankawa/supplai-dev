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
  posisi: "di bawah median" | "di atas median"
}
