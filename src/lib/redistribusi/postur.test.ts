import { describe, it, expect } from "vitest";
import { POSTUR, POSTUR_LABEL, isPostur } from "./postur";

describe("isPostur", () => {
  it("accepts the three real postures", () => {
    expect(POSTUR).toEqual(["konservatif", "seimbang", "aman_pangan"]);
    for (const p of POSTUR) expect(isPostur(p)).toBe(true);
  });

  it("rejects anything else, including 'default'", () => {
    // "default" is a key in the JSON but not a posture a user may ask for:
    // it mirrors seimbang, and letting it through the query string would put
    // an undisclosed alias in the URL.
    for (const bad of ["default", "Seimbang", "", "aman pangan", "konservatiff"]) {
      expect(isPostur(bad)).toBe(false);
    }
  });

  it("labels every posture with a name and a plain-language meaning", () => {
    for (const p of POSTUR) {
      expect(POSTUR_LABEL[p].nama.length).toBeGreaterThan(0);
      expect(POSTUR_LABEL[p].arti.length).toBeGreaterThan(20);
    }
  });
});
