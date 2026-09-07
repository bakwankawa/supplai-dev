import { describe, expect, it } from "vitest"
import { getRedistributionData } from "@/data/redistribution"
import { analyzeRedistribusi } from "./analysis"
import type { SebaranKelompokResult } from "./kesenjangan"
import { teksJendela, teksPenekananHarga, teksMarjin, teksKesenjangan, teksLanskap } from "./teks"

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

  it("menyebut kelompok dengan namanya sendiri, bukan sebutan resmi ataupun kunci mentahnya", () => {
    // ikpTanpaHarga sengaja [] di sini: kalimat "IKP Bapanas 2025" hanya bisa
    // datang dari LABEL_KELOMPOK pada kalimat utama, bukan "kebetulan" muncul
    // lewat kalimat jangkauan model yang juga memuat frasa itu. Reviewer
    // membuktikan lewat mutasi bahwa toContain("IKP Bapanas 2025") saja lolos
    // meski peta labelnya dihapus dan kunci mentah "bawah"/"tengah"/"atas"
    // dicetak apa adanya -- karena frasa itu tetap ada di kalimat LAIN. Di
    // sini diisolasi, dan diperiksa label lengkap per kelompok, plus kunci
    // mentah dipastikan TIDAK muncul.
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
        { kelompok: "tengah", ton: 5, persen: 12.5, nProvinsi: 1 },
        { kelompok: "atas", ton: 25, persen: 62.5, nProvinsi: 1 },
      ],
      tanpaTingkatan: kosongTanpaTingkatan,
    }
    const teks = teksKesenjangan(sebaran, []).join(" ")
    expect(teks.toLowerCase()).not.toContain("tertinggal")
    expect(teks).toContain("Sepertiga terbawah IKP Bapanas 2025")
    expect(teks).toContain("Sepertiga tengah IKP Bapanas 2025")
    expect(teks).toContain("Sepertiga teratas IKP Bapanas 2025")
    // Kunci mentah tidak boleh bocor sebagai pengganti labelnya
    expect(teks).not.toMatch(/\bke bawah\b/)
    expect(teks).not.toMatch(/\bke tengah\b/)
    expect(teks).not.toMatch(/\bke atas\b/)
  })

  it("menyatakan peringkat provinsi ber-IKP terendah yang di luar jangkauan model, sebagai kalimat kedua yang berdiri sendiri", () => {
    // Alat pemerataan yang tidak bisa melihat daerah paling rentan adalah hal yang
    // wajib diketahui pemakainya, bukan cacat yang disembunyikan. Empat nama saja
    // tidak cukup -- pembaca harus tahu SEBERAPA rentan provinsi yang hilang itu,
    // jadi kalimatnya menyebut peringkat IKP-nya (dari tingkatan.json: Papua
    // Pegunungan peringkat 38 dari 38, IKP terendah di Indonesia).
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
        { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "atas", ton: 30, persen: 75, nProvinsi: 1 },
      ],
      tanpaTingkatan: kosongTanpaTingkatan,
    }
    const teksArr = teksKesenjangan(sebaran, ["Papua Pegunungan", "Papua Tengah"])
    const teks = teksArr.join(" ")
    expect(teks).toContain("Papua Pegunungan")
    expect(teks).toContain("di luar jangkauan")
    expect(teks).toContain("38 dari 38")
    // Kontrak urutan yang disandarkan report.ts: kalimat jangkauan model
    // adalah elemen array KEDUA (indeks 1) begitu ikpTanpaHarga tidak kosong,
    // supaya report.ts bisa mencetaknya senormal kalimat utama tanpa menebak
    // dari isi teksnya.
    expect(teksArr[1]).toContain("di luar jangkauan")
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

  it("tidak pernah menggabung kalimat jangkauan model dengan kalimat tanpa-tingkatan jadi satu", () => {
    // Reviewer membuktikan lewat mutasi bahwa menggabung dua kalimat ini
    // jadi satu string (sambil tetap menyimpan kedua substring yang dicek
    // tes lain) tetap lolos semua tes -- karena tak ada tes yang memeriksa
    // KEDUANYA berada di elemen array yang BERBEDA. Di sini keduanya dipicu
    // bersamaan dan dipastikan tidak pernah jadi elemen yang sama, dan tidak
    // saling membocorkan nama provinsi milik kalimat lain.
    const sebaran: SebaranKelompokResult = {
      kelompok: [
        { kelompok: "bawah", ton: 10, persen: 50, nProvinsi: 1 },
        { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
        { kelompok: "atas", ton: 10, persen: 50, nProvinsi: 1 },
      ],
      tanpaTingkatan: { ton: 5, persen: 20, provinsi: ["Wakanda"] },
    }
    const teksArr = teksKesenjangan(sebaran, ["Papua Pegunungan"])
    const kalimatJangkauan = teksArr.find((t) => t.includes("di luar jangkauan"))
    const kalimatTanpaTingkatan = teksArr.find((t) => t.includes("tidak masuk sebaran kelompok mana pun"))

    expect(kalimatJangkauan).toBeDefined()
    expect(kalimatTanpaTingkatan).toBeDefined()
    // Properti inti: dua kalimat berbeda, bukan satu kalimat gabungan
    expect(kalimatJangkauan).not.toBe(kalimatTanpaTingkatan)
    expect(kalimatJangkauan).not.toContain("Wakanda")
    expect(kalimatTanpaTingkatan).not.toContain("Papua Pegunungan")
  })
})

describe("teksLanskap", () => {
  const LANSKAP = [
    { komoditas: "Beras Medium", provinsi: "Papua", harga: 16000, medianNasional: 14000, relatifPersen: 14.29, posisi: "di atas median" as const },
    { komoditas: "Gula Pasir", provinsi: "Papua", harga: 17000, medianNasional: 18000, relatifPersen: -5.56, posisi: "di bawah median" as const },
    { komoditas: "Beras Medium", provinsi: "Aceh", harga: 13000, medianNasional: 14000, relatifPersen: -7.14, posisi: "di bawah median" as const },
  ]

  it("menyatakan dirinya bacaan harga, bukan bacaan pasokan", () => {
    // Surplus di produk ini berarti harga di bawah median, bukan kelebihan produksi
    // terukur. Buku besarnya sudah mencatat bahwa data produksi per provinsi tidak
    // tersedia bagi kami; kalimat ini menjaga layar dan PDF sepakat dengan itu.
    const teks = teksLanskap(LANSKAP, "Papua").join(" ")
    expect(teks).toContain("bacaan harga")
    expect(teks.toLowerCase()).not.toMatch(/kelebihan produksi|surplus produksi/)
  })

  it("memisahkan komoditas yang diramalkan dari yang hanya dibaca harganya", () => {
    const teks = teksLanskap(LANSKAP, "Papua").join(" ")
    expect(teks).toContain("Gula Pasir")
    expect(teks).toMatch(/tidak kami ramalkan|di luar enam/)
  })

  it("hanya memakai baris provinsi yang diminta", () => {
    const teks = teksLanskap(LANSKAP, "Papua").join(" ")
    expect(teks).not.toContain("Aceh")
  })
})
