import { describe, it, expect } from "vitest";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi, ONGKOS_RP_PER_KG_KM, rataBobotVolume } from "./analysis";

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

  it("reports the market share without claiming the shipment has no price effect", () => {
    // The volume is sized precisely to move the destination price. A report
    // cannot size for a price effect and then assert there is none.
    const a = analyzeRedistribusi(getRedistributionData("beras", "seimbang"), "beras", "seimbang");
    expect(a.ringkasan).toMatch(/pasar bulanan/);
    expect(a.ringkasan).toMatch(/tidak kami ukur/);
    expect(a.ringkasan).not.toMatch(/tidak menggantikan perdagangan/);
  });

  it("carries the solver's reason through for an empty plan", () => {
    const a = analyzeRedistribusi(
      getRedistributionData("bawang-merah", "seimbang"), "bawang-merah", "seimbang");
    expect(a.totalRute).toBe(0);
    expect(a.ringkasan).toMatch(/pasangan/);
  });

  it("membobot dengan volume, bukan merata-rata baris", () => {
    // Rata-rata baris memberi bobot sama pada rute 5 ton dan rute 500 ton.
    // Yang menekan harga adalah tonasenya, bukan banyaknya baris.
    const rute = [
      { volumeTon: 100, nilai: 4 },
      { volumeTon: 1, nilai: 0 },
    ];
    expect(rataBobotVolume(rute, (r) => r.nilai)).toBeCloseTo(400 / 101, 6);
  });

  it("mengembalikan nol untuk rencana kosong, bukan NaN", () => {
    // Pembagian dengan total bobot nol menghasilkan NaN, yang lolos setiap
    // pemeriksaan rentang dan muncul di PDF sebagai "NaN%".
    expect(rataBobotVolume([] as { volumeTon: number; nilai: number }[], (r) => r.nilai)).toBe(0);
  });

  it("dampak rata berada di antara nilai rute terkecil dan terbesar, dan tidak diketahui bila satu saja rute null", () => {
    // Sanity check pada data nyata: selama tidak ada rute yang null (data hari
    // ini tidak punya satupun), rata-rata dibobot volume tidak boleh jatuh di
    // luar rentang nilai per-rutenya.
    for (const a of all("seimbang")) {
      if (a.routes.length === 0) continue;
      expect(a.routes.every((r) => r.ditahanPp !== null)).toBe(true);
      const lo = Math.min(...a.routes.map((r) => r.ditahanPp as number));
      const hi = Math.max(...a.routes.map((r) => r.ditahanPp as number));
      expect(a.dampak.ditahanPpRata).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(a.dampak.ditahanPpRata).toBeLessThanOrEqual(hi + 1e-9);
    }

    // Tidak ada rute null hari ini, jadi kasus null dibangun dari potongan
    // data nyata: satu dari 12 rute daging ayam dibuat null, meniru provinsi
    // tujuan tanpa data konsumsi pendukung.
    const asli = getRedistributionData("daging-ayam", "seimbang");
    expect(asli.routes.length).toBeGreaterThan(1);
    const ruteDenganNull = asli.routes.map((r, i) => (i === 0 ? { ...r, ditahanPp: null } : r));

    // Satu rute null meniadakan seluruh rata-rata -- bukan rata-rata dari
    // rute yang diketahui saja. Ini menyamakan sikap dengan blok fakta Python
    // yang menghilangkan angka dampaknya seluruhnya dalam situasi yang sama.
    expect(rataBobotVolume(ruteDenganNull, (r) => r.ditahanPp)).toBeNull();

    const a = analyzeRedistribusi({ ...asli, routes: ruteDenganNull }, "daging-ayam", "seimbang");
    expect(a.dampak.ditahanPpRata).toBeNull();
    // fraksiDitahan rute itu masih ada -- dua kolom yang tidak diketahui
    // secara independen, bukan satu null menulari kolom yang lain.
    expect(a.dampak.fraksiRata).not.toBeNull();
    // Nilai per-rute tetap tampil di tabel walau rata-ratanya tidak diketahui.
    expect(a.routes[0].ditahanPp).toBeNull();
  });
});
