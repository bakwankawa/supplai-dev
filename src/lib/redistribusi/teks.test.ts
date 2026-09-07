import { describe, expect, it } from "vitest"
import { getRedistributionData } from "@/data/redistribution"
import { analyzeRedistribusi } from "./analysis"
import { teksJendela, teksPenekananHarga } from "./teks"

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
    const tanpaData = { ...contoh(), dampak: { ditahanPpRata: null, fraksiRata: null } }
    const teksTanpaData = teksPenekananHarga(tanpaData).join(" ")
    expect(teksTanpaData).not.toMatch(/-?\d[\d.,]*%/)
    expect(teksTanpaData.toLowerCase()).toContain("tidak diketahui")
    expect(teksTanpaData.toLowerCase()).toContain("bukan nol")
  })
})
