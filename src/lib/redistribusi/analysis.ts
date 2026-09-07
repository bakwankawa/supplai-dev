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

  return {
    komoditas,
    postur,
    status,
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
  }
}
