import { describe, expect, it } from "vitest"
import { commodities } from "@/data/commodities"
import { getRedistributionData } from "@/data/redistribution"
import { analyzeRedistribusi } from "./analysis"
import { POSTUR } from "./postur"
import { createRedistribusiReport, PEMBACA } from "./report"

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
})
