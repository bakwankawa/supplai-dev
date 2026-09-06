import { describe, it, expect } from "vitest";
import { ton, persen, SKALA_PERSEN_PASAR, takaranLabel } from "./format";

describe("Indonesian number formatting", () => {
  it("uses a comma for decimals, not a dot", () => {
    // A dot decimal reads as a thousands separator in Indonesian: "1.298"
    // is one thousand two hundred ninety-eight, not 1.298.
    expect(ton(57.41)).toBe("57,41 t");
    expect(persen(1.298)).toBe("1,30%");
  });

  it("uses a dot for thousands", () => {
    expect(ton(4424)).toBe("4.424,00 t");
  });

  it("keeps percentages above 100 intact", () => {
    // kecukupanPersen reaches 168,1% — a shipment that more than covers the
    // requirement. Clamping it would hide a real result.
    expect(persen(168.1, 1)).toBe("168,1%");
  });
});

describe("the % pasar scale", () => {
  it("is 5, which contains every observed value", () => {
    // seimbang runs 0,023% to 3,642%. The old heuristic's 18,08% runs off the
    // scale, and should.
    expect(SKALA_PERSEN_PASAR).toBe(5);
    expect(3.642).toBeLessThan(SKALA_PERSEN_PASAR);
  });
});

describe("takaranLabel", () => {
  it("distinguishes the two bases and explains each", () => {
    expect(takaranLabel("terukur").teks).toBe("Terukur");
    expect(takaranLabel("diasumsikan").teks).toBe("Diasumsikan");
    expect(takaranLabel("terukur").keterangan).not.toBe(takaranLabel("diasumsikan").keterangan);
    expect(takaranLabel("diasumsikan").keterangan).toMatch(/10%/);
  });
});
