import { describe, expect, it } from "vitest"
import { teksJendela } from "./teks"

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
