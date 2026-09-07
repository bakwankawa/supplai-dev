import { describe, expect, it } from "vitest"
import { bukuBesar } from "@/data/buku-besar"
import { commodities } from "@/data/commodities"
import { getRedistributionData } from "@/data/redistribution"
import { analyzeRedistribusi } from "./analysis"
import { POSTUR } from "./postur"
import { createRedistribusiReport, PEMBACA, KERANGKA_PEMERINTAH_RUTE_WIDTH, KERANGKA_PEDAGANG_WIDTH } from "./report"

const analisis = (id: string, postur: (typeof POSTUR)[number]) =>
  analyzeRedistribusi(
    getRedistributionData(id, postur),
    commodities.find((c) => c.id === id)!.name,
    postur,
  )

const head = (pdf: Uint8Array) => new TextDecoder().decode(pdf.slice(0, 5))

describe("createRedistribusiReport", () => {
  /** Ten of the eighteen commodity/posture combinations produce no routes at
   *  all. A report that throws on those is a report the offtaker cannot open in
   *  a meeting, so every combination is generated here, not just the ones with
   *  a table to draw. */
  it("produces a readable PDF for every commodity, posture, and reader", () => {
    for (const commodity of commodities) {
      for (const postur of POSTUR) {
        const a = analisis(commodity.id, postur)
        for (const pembaca of PEMBACA) {
          const pdf = createRedistribusiReport(a, pembaca)
          expect(head(pdf), `${commodity.id}/${postur}/${pembaca}`).toBe("%PDF-")
          expect(pdf.byteLength, `${commodity.id}/${postur}/${pembaca}`).toBeGreaterThan(2000)
        }
      }
    }
  })

  it("does not lose routes between the analysis and the trader framing", () => {
    const a = analisis("telur-ayam", "seimbang")
    expect(a.totalRute).toBe(13)
    expect(a.menutup).toBe(9)
    expect(a.totalRute - a.menutup).toBe(4)
  })

  /** The trader framing rests entirely on an assumed freight rate, so the
   *  ledger row declaring it as assumed is part of the report, not an extra.
   *  report.ts throws without it; this pins the row it looks for, so a rename
   *  upstream fails here with a name rather than at a reader's desk. */
  it("keeps the freight ledger row the trader report is required to print", () => {
    const ongkos = bukuBesar.filter((e) => e.input.toLowerCase().startsWith("ongkos angkut"))
    expect(ongkos).toHaveLength(1)
    expect(ongkos[0].status).toBe("diasumsikan")
    expect(() => createRedistribusiReport(analisis("telur-ayam", "seimbang"), "pedagang")).not.toThrow()
  })

  /** Table widths must sum to 174mm (the drawable page width) to prevent
   *  columns from overflowing past the A4 edge. This test pins that constraint
   *  so a future edit that adds columns without rebalancing will fail here, not
   *  silently at the reader's desk with columns drawn off the page. */
  it("all table width constants sum to the drawable width (174mm)", () => {
    const DRAWABLE_WIDTH = 174
    const pemeriksaanPemerintah = KERANGKA_PEMERINTAH_RUTE_WIDTH.reduce((sum, w) => sum + w, 0)
    const pemeriksaanPedagang = KERANGKA_PEDAGANG_WIDTH.reduce((sum, w) => sum + w, 0)
    expect(pemeriksaanPemerintah).toBe(DRAWABLE_WIDTH)
    expect(pemeriksaanPedagang).toBe(DRAWABLE_WIDTH)
  })
})
