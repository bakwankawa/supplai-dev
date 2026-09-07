import { describe, expect, it } from "vitest"
import { getRedistributionData } from "@/data/redistribution"
import { analyzeRedistribusi } from "./analysis"
import type { SebaranKelompokResult } from "./kesenjangan"
import { teksJendela, teksPenekananHarga, teksMarjin, teksKesenjangan } from "./teks"

const contoh = () =>
  analyzeRedistribusi(
    getRedistributionData("telur-ayam", "seimbang"), "telur-ayam", "seimbang",
  )

describe("teksJendela", () => {
  it("menyebut bulan sasaran di kepala laporan", () => {
    const teks = teksJendela("2026-09-01", new Date("2026-08-20T00:00:00Z")).join(" ")
    expect(teks).toContain("September 2026")
  })

  it("membuka dengan pernyataan ketika jendelanya sudah lewat", () => {
    // Di badan laporan, bukan catatan kaki: ia menentukan apakah laporan ini
    // masih boleh dipakai sama sekali.
    const teks = teksJendela("2026-09-01", new Date("2026-09-07T00:00:00Z")).join(" ")
    expect(teks.toLowerCase()).toContain("jendela")
    expect(teks.toLowerCase()).toContain("lewat")
  })
})

describe("teksMarjin", () => {
  it("menyatakan marjin sebagai whole-route total, conditional pada prediksi, bukan keuntungan keseluruhan per-kg", () => {
    // Marjin harapan adalah TOTAL RUTE (bukan per-kg) dengan kondisionalitas pada
    // prediksi kenaikan. Dua kesalahan yang terpisah:
    // 1. Menyebut sebagai per-kg ketika sebenarnya total rute
    // 2. Menyebut sebagai pasti hari ini, bukan conditional
    // Kalimat yang lolos test conditionality lama tapi masih salah:
    // "Marjin harapan adalah keuntungan pedagang. Angka ini terwujud hanya bila
    // kenaikan yang diprediksi benar-benar terjadi. Marjin negatif ditampilkan
    // apa adanya." — punya "terwujud hanya bila" tapi tidak menyatakan ini adalah
    // total rute dan berbeda dari margin/kg. Jadi test harus meminta keduanya.
    const teks = teksMarjin()
    // Menyatakan ini adalah total rute, bukan per-kg
    expect(teks).toContain("total rute")
    // Frasa kunci kondisionalitas: terwujud HANYA BILA prediksi terjadi
    expect(teks).toContain("terwujud hanya bila")
    // Menyatakan perbedaan antara dua kolom margin
    expect(teks).toContain("dua besaran berbeda")
    // Menolak frasa yang menyatakan keuntungan pasti hari ini
    expect(teks).not.toContain("sudah pasti")
    expect(teks).not.toContain("terlepas dari")
    // Label "Hemat" tetap ditolak
    expect(teks).not.toContain("Hemat")
  })
})

describe("teksPenekananHarga", () => {
  it("menyatakan penekanan harga sebagai selisih terhadap tanpa-intervensi", () => {
    // "Menekan harga X%" tanpa pembanding terbaca sebagai penurunan mutlak.
    // Yang benar: harga berakhir X% lebih rendah dibanding tanpa intervensi.
    const teks = teksPenekananHarga(contoh()).join(" ")
    expect(teks).toContain("tanpa intervensi")
  })

  it("memisahkan rute terukur dari diasumsikan, dan tidak mencetak angka atau nol ketika dampak gabungannya tidak diketahui", () => {
    const teks = teksPenekananHarga(contoh()).join(" ")
    expect(teks).toContain("diasumsikan")

    // Ketika satu saja rute dalam seleksi tidak punya data konsumsi pendukung,
    // analyzeRedistribusi mengembalikan dampak null (lihat rataBobotVolume di
    // ./analysis). Laporan tidak boleh mencetak angka di sini, dan tidak boleh
    // diam-diam mencetak nol -- nol berarti "kami tahu rencana ini tidak
    // menahan apa-apa", null berarti "kami tidak tahu". Ini adalah bagian yang
    // dipatok oleh tes: hilangnya kalimat ini tidak cukup, harus jelas kenapa.
    const tanpaData = {
      ...contoh(),
      dampak: { ditahanPpRata: null, fraksiRata: null, kenaikanRata: null },
    }
    const teksTanpaData = teksPenekananHarga(tanpaData).join(" ")
    expect(teksTanpaData).not.toMatch(/-?\d[\d.,]*%/)
    expect(teksTanpaData.toLowerCase()).toContain("tidak diketahui")
    expect(teksTanpaData.toLowerCase()).toContain("bukan nol")
  })

  it("poin persen dan persen dari harga akhir adalah besaran berbeda: hanya yang kedua bertanda %", () => {
    // ditahanPpRata adalah POIN PERSEN dari kenaikan yang diprediksi; membubuhi
    // tanda % di situ menyatakan besaran yang berbeda dan lebih kecil (lihat
    // dokumentasi teksPenekananHarga). fraksiRata dan harga akhir yang "lebih
    // rendah" genuinely adalah persentase, dan harus bertanda %.
    const teks = teksPenekananHarga(contoh()).join(" ")

    const poinPersen = teks.match(/rata-rata ([\d.,]+) poin persen/)
    expect(poinPersen).not.toBeNull()
    expect(poinPersen![0]).not.toContain("%")

    const lebihRendah = teks.match(/([\d.,]+%) lebih rendah dibanding tanpa intervensi/)
    expect(lebihRendah).not.toBeNull()
    expect(lebihRendah![1]).toContain("%")
  })

  it("tidak menyatakan klaim penekanan harga ketika rencananya tidak memuat satu pun rute", () => {
    // Pola yang sama sudah dipakai "Dasar takaran" untuk rencana kosong: bukan
    // mencetak 0,00% seakan itu hasil pengukuran, tapi menyatakan tidak ada
    // klaim yang bisa dibuat sama sekali.
    const kosong = analyzeRedistribusi(getRedistributionData("beras", "konservatif"), "beras", "konservatif")
    expect(kosong.totalRute).toBe(0)
    const teks = teksPenekananHarga(kosong).join(" ")
    expect(teks).not.toMatch(/-?\d[\d.,]*%/)
    expect(teks.toLowerCase()).toContain("tidak ada klaim")
  })
})

describe("teksKesenjangan", () => {
  // sebaranKelompok (./kesenjangan) mengembalikan objek { kelompok, tanpaTingkatan },
  // bukan array telanjang seperti versi lama fungsi ini -- lihat catatan di
  // kesenjangan.ts. Tes di bawah membangun objek itu langsung, tanpa
  // tanpaTingkatan aktif kecuali dinyatakan.
  const kosongTanpaTingkatan = { ton: 0, persen: 0, provinsi: [] as string[] }

  it("menyebut kelompok dengan namanya sendiri, bukan sebutan resmi", () => {
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
        { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "atas", ton: 30, persen: 75, nProvinsi: 1 },
      ],
      tanpaTingkatan: kosongTanpaTingkatan,
    }
    const teks = teksKesenjangan(sebaran, ["Papua Pegunungan"]).join(" ")
    expect(teks.toLowerCase()).not.toContain("tertinggal")
    expect(teks).toContain("IKP Bapanas 2025")
  })

  it("menyatakan provinsi ber-IKP terendah yang di luar jangkauan model", () => {
    // Alat pemerataan yang tidak bisa melihat daerah paling rentan adalah hal yang
    // wajib diketahui pemakainya, bukan cacat yang disembunyikan.
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
        { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "atas", ton: 30, persen: 75, nProvinsi: 1 },
      ],
      tanpaTingkatan: kosongTanpaTingkatan,
    }
    const teks = teksKesenjangan(sebaran, ["Papua Pegunungan", "Papua Tengah"]).join(" ")
    expect(teks).toContain("Papua Pegunungan")
    expect(teks).toContain("di luar jangkauan")
  })

  it("menyebut kelompok yang tidak menerima apa pun, dan tonase yang tidak masuk sebaran mana pun", () => {
    // Dua kalimat bersyarat berbeda dalam satu tes: kelompok bernilai nol
    // (persyaratan brief), dan tujuan tanpa skor IKP pada rencana ini --
    // rute.ton yang jatuh di sebaran.tanpaTingkatan, bukan ikpTanpaHarga.
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "atas", ton: 40, persen: 88.89, nProvinsi: 2 },
      ],
      tanpaTingkatan: { ton: 5, persen: 11.11, provinsi: ["Wakanda"] },
    }
    const teks = teksKesenjangan(sebaran, []).join(" ")
    expect(teks).toMatch(/tidak menerima|nol/i)
    expect(teks).toContain("Wakanda")
  })
})
