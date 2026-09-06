import { describe, it, expect } from "vitest";
import { jelaskanStatus } from "./status";

describe("jelaskanStatus", () => {
  it("gives different reasons for the two ways a plan can be empty", () => {
    const pair = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Bawang Merah");
    const zero = jelaskanStatus("tidak perlu intervensi", "konservatif", "Beras Medium");
    expect(pair.alasan).not.toBe(zero.alasan);
    expect(pair.judul).not.toBe(zero.judul);
  });

  it("never claims prices are projected stable when no pairing formed", () => {
    // The old single sentence said exactly this, and it was false: the cause
    // was that no province qualified as a source or a destination at all.
    const out = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Bawang Merah");
    expect(`${out.judul} ${out.alasan}`).not.toMatch(/stabil atau menurun/i);
  });

  it("says the destinations were still identified under konservatif", () => {
    const out = jelaskanStatus("tidak perlu intervensi", "konservatif", "Beras Medium");
    expect(out.alasan).toMatch(/batas bawah/i);
    expect(out.alasan).toMatch(/Seimbang/);
  });

  it("names the commodity it is talking about", () => {
    const out = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Minyak Goreng");
    expect(out.alasan).toContain("Minyak Goreng");
  });

  it("passes a solver failure message through instead of hiding it", () => {
    const out = jelaskanStatus("solver gagal: infeasible", "seimbang", "Beras Medium");
    expect(out.alasan).toContain("infeasible");
  });

  it("surfaces an unrecognised status verbatim rather than inventing one", () => {
    const out = jelaskanStatus("sesuatu yang baru", "seimbang", "Beras Medium");
    expect(out.alasan).toContain("sesuatu yang baru");
  });
});
