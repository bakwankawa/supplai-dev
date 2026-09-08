import { describe, it, expect } from "vitest";
import { sebaranKelompok } from "./kesenjangan";

const TIER = [
  { provinsi: "Papua", ikp: 57.45, peringkat: 33, kelompok: "bawah" as const },
  { provinsi: "Jawa Barat", ikp: 74.95, peringkat: 10, kelompok: "atas" as const },
  { provinsi: "Sulawesi Utara", ikp: 65.0, peringkat: 20, kelompok: "tengah" as const },
];

describe("sebaranKelompok", () => {
  it("membagi tonase menurut kelompok provinsi TUJUAN, mencakup atas dan nProvinsi", () => {
    // Kesenjangan diukur dari siapa yang menerima, bukan siapa yang mengirim.
    const rute = [
      { ke: "Papua", volumeTon: 10 },
      { ke: "Jawa Barat", volumeTon: 30 },
    ];
    const result = sebaranKelompok(rute as never, TIER);
    const bawah = result.kelompok.find((x) => x.kelompok === "bawah")!;
    const atas = result.kelompok.find((x) => x.kelompok === "atas")!;

    expect(bawah.ton).toBe(10);
    expect(bawah.persen).toBeCloseTo(25, 6);
    expect(bawah.nProvinsi).toBe(1);

    expect(atas.ton).toBe(30);
    expect(atas.persen).toBeCloseTo(75, 6);
    expect(atas.nProvinsi).toBe(1);
  });

  it("selalu mengembalikan ketiga kelompok, termasuk yang nol", () => {
    // Kelompok yang tidak menerima apa pun adalah temuan, bukan baris yang hilang.
    const result = sebaranKelompok([{ ke: "Papua", volumeTon: 5 }] as never, TIER);
    expect(result.kelompok.map((x) => x.kelompok).sort()).toEqual(["atas", "bawah", "tengah"]);
    expect(result.kelompok.find((x) => x.kelompok === "tengah")!.ton).toBe(0);
  });

  it("rencana kosong memberi nol persen, bukan NaN", () => {
    const result = sebaranKelompok([] as never, TIER);
    expect(result.kelompok.every((x) => x.persen === 0)).toBe(true);
    expect(result.tanpaTingkatan.persen).toBe(0);
  });

  it("campuran tujuan berperingkat dan tanpa peringkat: persentase berjumlah 100", () => {
    // Tujuan dengan peringkat IKP dan yang tidak, volumenya harus tercakup di ketiga
    // kelompok atau di tanpaTingkatan, tidak hilang.
    const rute = [
      { ke: "Papua", volumeTon: 20 },           // bawah
      { ke: "Jawa Barat", volumeTon: 30 },     // atas
      { ke: "Sulawesi Utara", volumeTon: 10 }, // tengah
      { ke: "Wakanda", volumeTon: 40 },        // tanpaTingkatan
    ];
    const result = sebaranKelompok(rute as never, TIER);

    const kelompokSum = result.kelompok.reduce((s, k) => s + k.persen, 0);
    const total = kelompokSum + result.tanpaTingkatan.persen;

    expect(total).toBeCloseTo(100, 6);
    expect(result.tanpaTingkatan.provinsi).toEqual(["Wakanda"]);
    expect(result.tanpaTingkatan.ton).toBe(40);
    expect(result.tanpaTingkatan.persen).toBeCloseTo(40, 6);
  });
});
