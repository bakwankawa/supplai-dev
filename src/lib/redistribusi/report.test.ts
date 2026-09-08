import zlib from "node:zlib"
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

/** Pulls the visible text back out of a jsPDF buffer, so a test can assert on
 *  what a reader actually sees instead of on the string arguments we happened
 *  to pass to `paragraph()`/`table()` -- a gate or a data-source swap that
 *  never reaches the rendered page is exactly the bug this helper exists to
 *  catch.
 *
 *  `createRedistribusiReport` builds its jsPDF document with `compress: true`,
 *  so every content stream is FlateDecode-d; this walks each `stream ...
 *  endstream` block, inflates it, and pulls text out of the `(...) Tj` /
 *  `[(...) ...] TJ` show-text operators. Streams that are not Flate (fonts,
 *  images) fail to inflate and are skipped, not fatal. */
function extractPdfText(pdf: Uint8Array): string {
  const bytes = Buffer.from(pdf)
  let out = ""
  let idx = 0
  for (;;) {
    const s = bytes.indexOf("stream", idx)
    if (s === -1) break
    let dataStart = s + "stream".length
    if (bytes[dataStart] === 0x0d) dataStart++
    if (bytes[dataStart] === 0x0a) dataStart++
    const e = bytes.indexOf("endstream", dataStart)
    if (e === -1) break
    try {
      const content = zlib.inflateSync(bytes.subarray(dataStart, e)).toString("latin1")
      for (const m of content.matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)) {
        out += m[1].replace(/\\(.)/g, "$1") + " "
      }
      for (const arr of content.matchAll(/\[((?:[^[\]]|\\.)*)\]\s*TJ/g)) {
        for (const part of arr[1].matchAll(/\(((?:\\.|[^()\\])*)\)/g)) {
          out += part[1].replace(/\\(.)/g, "$1")
        }
        out += " "
      }
    } catch {
      // Not a Flate stream (font/image data) -- expected, skip it.
    }
    idx = e + "endstream".length
  }
  return out
}

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

  /** Fix round 1, Critical #2: "konservatif" always has zero routes (every
   *  commodity), yet Section 06 used to read TINDAKAN.modal -- the "seimbang"
   *  plan's aggregate -- unconditionally, so a reader of a plan that ships
   *  nothing still saw a full Rupiah return table borrowed from a different
   *  plan. This renders the actual PDF and reads the text back, rather than
   *  asserting on report.ts's internals, so a regression that re-introduces
   *  the missing gate is caught here even if it takes a different shape. */
  it("prints no modal table for a posture whose own plan has zero routes", () => {
    const a = analisis("telur-ayam", "konservatif")
    expect(a.totalRute).toBe(0)
    const text = extractPdfText(createRedistribusiReport(a, "pedagang"))
    expect(text).toContain("06  Modal dan imbal hasil")
    expect(text).toContain("tidak ada modal atau imbal hasil")
    // None of the "seimbang" plan's per-province Rupiah figures (borrowed
    // from a totally different, non-empty plan) may leak onto this page.
    expect(text).not.toMatch(/mengunci Rp/)
    expect(text).not.toContain("Kepulauan Riau")
  })

  /** Fix round 1, Critical #1: pasar_provinsi() (the market REGISTRY) has no
   *  commodity join, so "harga komoditas ini diamati di ..." was false for
   *  every line -- Pasar Jodoh is registered in Kepulauan Riau but never once
   *  reports a Beras Medium price in wfp_food_prices_idn.csv. Section 05 now
   *  reads TINDAKAN.pasarPerKomoditas[a.komoditas], the commodity-filtered
   *  view built by pasar_provinsi_komoditas() (supplai/tindakan.py). This
   *  renders the actual PDF for a fixture whose commodity is "Beras Medium"
   *  and whose route touches Kepulauan Riau, and checks Pasar Jodoh -- which
   *  WOULD appear if Section 05 read the raw registry -- is absent. */
  it("names only markets that actually report this commodity's price, not the whole province registry", () => {
    const base = analisis("telur-ayam", "seimbang")
    expect(base.routes.length).toBeGreaterThan(0)
    const fixture = {
      ...base,
      komoditas: "Beras Medium",
      totalRute: 1,
      routes: [{ ...base.routes[0], from: "Kepulauan Riau" }],
    }
    const text = extractPdfText(createRedistribusiReport(fixture, "pedagang"))
    expect(text).toContain("Kepulauan Riau")
    expect(text).toMatch(/harga komoditas ini diamati di/)
    expect(text).not.toContain("Pasar Jodoh")
  })
})
