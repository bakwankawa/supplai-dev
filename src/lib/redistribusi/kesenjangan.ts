import type { TingkatanProvinsi } from "@/lib/types";

export const KELOMPOK = ["bawah", "tengah", "atas"] as const;
export type Kelompok = (typeof KELOMPOK)[number];

export interface BagianKelompok {
  kelompok: Kelompok;
  ton: number;
  persen: number;
  nProvinsi: number;
}

/**
 * Berapa banyak rencana ini sampai ke tiap kelompok IKP.
 *
 * Diukur dari provinsi TUJUAN: kesenjangan adalah soal siapa yang menerima.
 * Ketiga kelompok selalu dikembalikan, termasuk yang menerima nol — sebuah
 * kelompok yang tidak menerima apa pun adalah temuan yang harus terbaca, bukan
 * baris yang hilang dari tabel.
 */
export function sebaranKelompok(
  rute: { ke: string; volumeTon: number }[],
  tingkatan: TingkatanProvinsi[],
): BagianKelompok[] {
  const peta = new Map(tingkatan.map((t) => [t.provinsi, t.kelompok]));
  const total = rute.reduce((s, r) => s + r.volumeTon, 0);
  return KELOMPOK.map((k) => {
    const cocok = rute.filter((r) => peta.get(r.ke) === k);
    const ton = cocok.reduce((s, r) => s + r.volumeTon, 0);
    return {
      kelompok: k,
      ton,
      persen: total > 0 ? (ton / total) * 100 : 0,
      nProvinsi: new Set(cocok.map((r) => r.ke)).size,
    };
  });
}

/**
 * Tujuan yang tidak punya skor IKP.
 *
 * Dinamai, bukan dihitung diam-diam ke salah satu kelompok. Tonase yang jatuh
 * ke sini tidak muncul di sebaran mana pun, dan pembaca berhak tahu bahwa
 * jumlahnya tidak genap.
 */
export function provinsiTanpaTingkatan(
  rute: { ke: string }[],
  tingkatan: TingkatanProvinsi[],
): string[] {
  const punya = new Set(tingkatan.map((t) => t.provinsi));
  return [...new Set(rute.map((r) => r.ke))].filter((p) => !punya.has(p)).sort();
}
