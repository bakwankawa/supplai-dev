import { describe, expect, it } from "vitest"
import { commodities } from "./commodities"
import { getRedistributionData } from "./redistribution"

describe("getRedistributionData", () => {
  it("serves every commodity in the catalogue under every posture", () => {
    for (const c of commodities) {
      for (const p of ["konservatif", "seimbang", "aman_pangan"] as const) {
        expect(getRedistributionData(c.id, p).summary.status, `${c.id}/${p}`).toBeTruthy()
      }
    }
  })

  it("still serves the deliberate six-commodity aggregate when none is named", () => {
    expect(getRedistributionData(undefined, "seimbang").routes.length).toBeGreaterThan(0)
  })

  it("throws for an unknown commodity instead of substituting the aggregate", () => {
    // ?commodity=kopi used to answer with all six commodities' tonnage under
    // the caller's own heading. A substitute is worse than a failure here:
    // the reader has no way to tell it apart from an answer about coffee.
    expect(() => getRedistributionData("kopi", "seimbang")).toThrow(/kopi/)
    expect(() => getRedistributionData("kopi", "seimbang")).toThrow(/tidak ada/i)
  })

  it("names what is available in the error, so the caller can correct it", () => {
    try {
      getRedistributionData("cabai-rawit", "seimbang")
      expect.unreachable("expected a throw")
    } catch (e) {
      expect((e as Error).message).toContain("beras")
    }
  })
})
