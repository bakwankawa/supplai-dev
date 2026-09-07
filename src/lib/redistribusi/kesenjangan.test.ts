import { describe, it, expect } from "vitest";
import { sebaranKelompok, provinsiTanpaTingkatan } from "./kesenjangan";

const TIER = [
  { provinsi: "Papua", ikp: 57.45, peringkat: 33, kelompok: "bawah" as const },
  { provinsi: "Jawa Barat", ikp: 74.95, peringkat: 10, kelompok: "atas" as const },
];

describe("sebaranKelompok", () => {
  it("membagi tonase menurut kelompok provinsi TUJUAN", () => {
    // Kesenjangan diukur dari siapa yang menerima, bukan siapa yang mengirim.
    const rute = [
      { ke: "Papua", volumeTon: 10 },
      { ke: "Jawa Barat", volumeTon: 30 },
    ];
    const s = sebaranKelompok(rute as never, TIER);
    const bawah = s.find((x) => x.kelompok === "bawah")!;
    expect(bawah.ton).toBe(10);
    expect(bawah.persen).toBeCloseTo(25, 6);
  });

  it("selalu mengembalikan ketiga kelompok, termasuk yang nol", () => {
    // Kelompok yang tidak menerima apa pun adalah temuan, bukan baris yang hilang.
    const s = sebaranKelompok([{ ke: "Papua", volumeTon: 5 }] as never, TIER);
    expect(s.map((x) => x.kelompok).sort()).toEqual(["atas", "bawah", "tengah"]);
    expect(s.find((x) => x.kelompok === "tengah")!.ton).toBe(0);
  });

  it("rencana kosong memberi nol persen, bukan NaN", () => {
    const s = sebaranKelompok([] as never, TIER);
    expect(s.every((x) => x.persen === 0)).toBe(true);
  });
});

describe("provinsiTanpaTingkatan", () => {
  it("menyebut tujuan yang tidak punya skor IKP alih-alih menghitungnya diam-diam", () => {
    const rute = [{ ke: "Papua", volumeTon: 1 }, { ke: "Wakanda", volumeTon: 1 }];
    expect(provinsiTanpaTingkatan(rute as never, TIER)).toEqual(["Wakanda"]);
  });
});
