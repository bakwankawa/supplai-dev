import { describe, it, expect } from "vitest";
import { jendelaWaktu } from "./waktu";

describe("jendelaWaktu", () => {
  it("menghitung sampai hari pertama bulan sasaran, bukan akhirnya", () => {
    // Intervensi harus terjadi sebelum bulan berjalan agar memengaruhi harganya,
    // jadi tenggatnya awal bulan. Menghitung ke akhir bulan memberi 30 hari
    // kelonggaran yang tidak ada.
    const j = jendelaWaktu("2026-09-01", new Date(2026, 7, 25));
    expect(j.sisaHari).toBe(7);
    expect(j.sudahLewat).toBe(false);
  });

  it("menandai jendela sudah lewat begitu bulan sasaran berjalan", () => {
    const j = jendelaWaktu("2026-09-01", new Date(2026, 8, 7));
    expect(j.sudahLewat).toBe(true);
    expect(j.sisaHari).toBe(-6);
  });

  it("bergantung pada tanggal render, bukan pada artefak", () => {
    // Menyimpan sisa waktu ke artefak akan membekukan angka yang harus terus
    // berubah: laporan yang sama dibaca dua hari berbeda harus berbeda.
    const a = jendelaWaktu("2026-09-01", new Date(2026, 7, 1));
    const b = jendelaWaktu("2026-09-01", new Date(2026, 7, 20));
    expect(a.sisaHari).not.toBe(b.sisaHari);
  });

  it("memberi label bulan dalam bahasa Indonesia", () => {
    expect(jendelaWaktu("2026-09-01", new Date(2026, 7, 1)).labelBulan)
      .toBe("September 2026");
  });
});
