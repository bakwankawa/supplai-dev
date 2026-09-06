import { describe, it, expect } from "vitest";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi, ONGKOS_RP_PER_KG_KM } from "./analysis";

const all = (postur: "seimbang" | "aman_pangan" | "konservatif") =>
  ["beras", "bawang-merah", "bawang-putih", "daging-ayam", "telur-ayam", "minyak-goreng"]
    .map((k) => analyzeRedistribusi(getRedistributionData(k, postur), k, postur));

describe("analyzeRedistribusi", () => {
  it("counts the measured/assumed split the JSON actually holds", () => {
    const s = all("seimbang");
    expect(s.reduce((n, a) => n + a.terukur, 0)).toBe(14);
    expect(s.reduce((n, a) => n + a.diasumsikan, 0)).toBe(22);
    const a = all("aman_pangan");
    expect(a.reduce((n, x) => n + x.terukur, 0)).toBe(1);
    expect(a.reduce((n, x) => n + x.diasumsikan, 0)).toBe(35);
  });

  it("finds 30 of 36 routes covering freight in the balanced plan", () => {
    const s = all("seimbang");
    expect(s.reduce((n, a) => n + a.routes.length, 0)).toBe(36);
    expect(s.reduce((n, a) => n + a.menutup, 0)).toBe(30);
  });

  it("never marks a route as covering freight when its margin is negative", () => {
    for (const a of all("seimbang")) {
      for (const r of a.routes) {
        expect(r.menutupOngkos).toBe(r.marginRpPerKg > 0);
        expect(r.marginRpPerKg).toBeCloseTo(r.selisihRpPerKg - r.ongkosRpPerKg, 6);
      }
    }
  });

  it("computes freight at Rp2,5 per kg per km", () => {
    const a = analyzeRedistribusi(getRedistributionData("beras", "seimbang"), "beras", "seimbang");
    const r = a.routes[0];
    expect(ONGKOS_RP_PER_KG_KM).toBe(2.5);
    expect(r.ongkosRpPerKg).toBeCloseTo(r.distance * 2.5, 6);
  });

  it("keeps the six routes that do not cover freight rather than dropping them", () => {
    const worst = all("seimbang")
      .flatMap((a) => a.routes)
      .filter((r) => !r.menutupOngkos)
      .sort((x, y) => x.marginRpPerKg - y.marginRpPerKg);
    expect(worst).toHaveLength(6);
    expect(worst[0].from).toBe("Sumatera Selatan");
    expect(worst[0].to).toBe("Sulawesi Tenggara");
  });

  it("states that the sign of the gap is structural, not a finding", () => {
    const a = analyzeRedistribusi(getRedistributionData("beras", "seimbang"), "beras", "seimbang");
    expect(a.catatanPedagang).toMatch(/median/);
    // Zero of the 36 routes has a negative gap, which is what "structural" means.
    const negatives = all("seimbang").flatMap((x) => x.routes).filter((r) => r.selisihRpPerKg <= 0);
    expect(negatives).toHaveLength(0);
  });

  it("carries the solver's reason through for an empty plan", () => {
    const a = analyzeRedistribusi(
      getRedistributionData("bawang-merah", "seimbang"), "bawang-merah", "seimbang");
    expect(a.totalRute).toBe(0);
    expect(a.ringkasan).toMatch(/pasangan/);
  });
});
