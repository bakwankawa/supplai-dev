import type { Postur, RedistributionResponse, RedistributionRoute } from "@/lib/types"
import { jelaskanStatus } from "./status"
import { ton, persen } from "./format"

/** Rp per kg per km. The ledger carries Rp2.500 per ton-km; a tonne is 1.000 kg.
 *  This figure is `diasumsikan` — Indonesian inter-island freight runs roughly
 *  Rp2.000-4.000 per ton-km — and it carries the whole trader framing. */
export const ONGKOS_RP_PER_KG_KM = 2.5

export type RuteMargin = RedistributionRoute & {
  ongkosRpPerKg: number
  selisihRpPerKg: number
  marginRpPerKg: number
  menutupOngkos: boolean
}

export type RedistribusiAnalysis = {
  komoditas: string
  postur: Postur
  status: string
  /** Bulan yang diramal rencana ini, ISO "YYYY-MM-DD", diteruskan apa adanya
   *  dari `RedistributionResponse.summary.bulanPrediksi`. Tenggat tindakan
   *  adalah AWAL bulan ini, bukan akhirnya — lihat `jendelaWaktu` di `./waktu`. */
  bulanPrediksi: string
  totalRute: number
  totalTon: number
  totalBiaya: number
  anggaranNasionalTon: number | null
  terukur: number
  diasumsikan: number
  routes: RuteMargin[]
  menutup: number
  ringkasan: string
  catatanTakaran: string
  catatanPedagang: string
  /** Dampak harga dibobot volume, dirata dari seluruh rute. `null` — bukan
   *  rata-rata dari rute yang diketahui saja — bila SATU SAJA rute dalam
   *  rencana ini tidak punya data konsumsi pendukung (ditahanPp/fraksiDitahan
   *  null di sumbernya). Ini menjaga agar figur ini tidak berselisih dengan
   *  blok fakta Python yang menghilangkan angka dampaknya seluruhnya dalam
   *  situasi yang sama, alih-alih diam-diam merata-ratakan sisanya. */
  dampak: { ditahanPpRata: number | null; fraksiRata: number | null }
}

/**
 * Rata-rata dibobot tonase.
 *
 * Rata-rata baris memberi bobot sama pada rute 5 ton dan rute 500 ton; yang
 * menekan harga adalah tonasenya. Pembobotan ini juga membuat dua rute menuju
 * provinsi yang sama — yang membawa ditahanPp identik — tidak menggeser hasil
 * hanya karena mereka dua baris.
 *
 * Rencana kosong (atau bertotal bobot nol) mengembalikan 0, bukan NaN: NaN
 * lolos setiap pemeriksaan rentang dan muncul di PDF sebagai "NaN%". Ini
 * berbeda dari null: 0 berarti kami tahu rencana ini tidak menahan apa-apa,
 * null berarti kami tidak tahu.
 *
 * Mengembalikan `null` bila SATU SAJA rute dalam seleksi ini punya nilai null
 * untuk kolom yang diambil — bukan rata-rata dari rute yang diketahui saja.
 * Nilai null berasal dari provinsi tujuan tanpa data konsumsi pendukung, dan
 * blok fakta Python yang memberi angka ini ke laporan sudah membuat pilihan
 * yang sama: ia menghilangkan seluruh figur dampaknya, bukan diam-diam
 * merata-ratakan sisa rute yang datanya ada. Dua lapisan yang menampilkan
 * angka dari sumber yang sama tidak boleh berselisih pendapat soal apa arti
 * "tidak diketahui".
 */
export function rataBobotVolume<T extends { volumeTon: number }>(
  rute: T[],
  ambil: (r: T) => number | null,
): number | null {
  const total = rute.reduce((s, r) => s + r.volumeTon, 0)
  if (total <= 0) return 0
  if (rute.some((r) => ambil(r) === null)) return null
  return rute.reduce((s, r) => s + (ambil(r) as number) * r.volumeTon, 0) / total
}

export function analyzeRedistribusi(
  data: RedistributionResponse,
  komoditas: string,
  postur: Postur,
): RedistribusiAnalysis {
  const routes: RuteMargin[] = data.routes.map((r) => {
    const ongkosRpPerKg = r.distance * ONGKOS_RP_PER_KG_KM
    const selisihRpPerKg = r.hargaTujuan - r.hargaAsal
    const marginRpPerKg = selisihRpPerKg - ongkosRpPerKg
    return { ...r, ongkosRpPerKg, selisihRpPerKg, marginRpPerKg, menutupOngkos: marginRpPerKg > 0 }
  })

  const terukur = routes.filter((r) => r.dasarTakaran === "terukur").length
  const diasumsikan = routes.length - terukur
  const menutup = routes.filter((r) => r.menutupOngkos).length
  const status = data.summary.status

  // summary.totalVolume is rounded to whole tonnes for the dashboard tiles.
  // A report must not quote 57 t where the plan says 57,41 t.
  const totalTon = routes.reduce((sum, r) => sum + r.volumeTon, 0)
  const kosong = jelaskanStatus(status, postur, komoditas)

  const ringkasan =
    routes.length === 0
      ? `${kosong.judul} ${kosong.alasan}`
      : `Rencana ini memindahkan ${ton(totalTon)} ${komoditas} melalui ${routes.length} rute. ` +
        `Rute terbesar mengisi ${persen(Math.max(...routes.map((r) => r.persenPasar)))} pasar bulanan wilayah tujuannya ` +
        `— sebuah pangsa kecil, meskipun dampaknya terhadap harga setempat tidak kami ukur.`

  const catatanTakaran =
    routes.length === 0
      ? "Tidak ada rute, sehingga tidak ada takaran yang perlu dipertanggungjawabkan."
      : `${terukur} dari ${routes.length} rute volumenya ditetapkan dari kebutuhan terukur — populasi dikali konsumsi per kapita dikali elastisitas harga sendiri. ` +
        `${diasumsikan} sisanya dibatasi aturan yang kami tetapkan sendiri: sebuah provinsi asal hanya boleh mengirim maksimal 10% konsumsi bulanannya. ` +
        `Data produksi per provinsi tidak tersedia bagi kami, jadi batas itu bukan hasil pengukuran.`

  const catatanPedagang =
    `Ongkos angkut dihitung Rp${ONGKOS_RP_PER_KG_KM.toLocaleString("id-ID")}/kg/km, angka yang kami asumsikan, bukan kami ukur. ` +
    `Tanda selisih harganya sendiri bersifat bawaan: pemecah rute hanya menarik jalur dari provinsi berharga di bawah median nasional ke provinsi di atasnya, ` +
    `sehingga selisih positif sudah pasti ada sejak awal. Yang benar-benar diuji di sini adalah besar selisih itu terhadap ongkos angkut.`

  const dampak = {
    ditahanPpRata: rataBobotVolume(routes, (r) => r.ditahanPp),
    fraksiRata: rataBobotVolume(routes, (r) => r.fraksiDitahan),
  }

  return {
    komoditas,
    postur,
    status,
    bulanPrediksi: data.summary.bulanPrediksi,
    totalRute: routes.length,
    totalTon,
    totalBiaya: data.summary.estimatedCost,
    anggaranNasionalTon: data.summary.anggaranNasionalTon,
    terukur,
    diasumsikan,
    routes,
    menutup,
    ringkasan,
    catatanTakaran,
    catatanPedagang,
    dampak,
  }
}
