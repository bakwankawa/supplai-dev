import type { TingkatanProvinsi } from "@/lib/types";

export const KELOMPOK = ["bawah", "tengah", "atas"] as const;
export type Kelompok = (typeof KELOMPOK)[number];

export interface BagianKelompok {
  kelompok: Kelompok;
  ton: number;
  persen: number;
  nProvinsi: number;
}

export interface SebaranKelompokResult {
  kelompok: BagianKelompok[];
  tanpaTingkatan: {
    ton: number;
    persen: number;
    provinsi: string[];
  };
}

/**
 * Berapa banyak rencana ini sampai ke tiap kelompok IKP.
 *
 * Diukur dari provinsi TUJUAN: kesenjangan adalah soal siapa yang menerima.
 * Ketiga kelompok selalu dikembalikan, termasuk yang menerima nol — sebuah
 * kelompok yang tidak menerima apa pun adalah temuan yang harus terbaca, bukan
 * baris yang hilang dari tabel.
 *
 * Rute dengan tujuan yang tidak punya skor IKP dikembalikan dalam tanpaTingkatan.
 * Volumenya ada di sini, bukan di salah satu kelompok, jadi persentase ketiga
 * kelompok dapat berjumlah kurang dari 100.
 */
export function sebaranKelompok(
  rute: { ke: string; volumeTon: number }[],
  tingkatan: TingkatanProvinsi[],
): SebaranKelompokResult {
  const peta = new Map(tingkatan.map((t) => [t.provinsi, t.kelompok]));
  const total = rute.reduce((s, r) => s + r.volumeTon, 0);

  const kelompok = KELOMPOK.map((k) => {
    const cocok = rute.filter((r) => peta.get(r.ke) === k);
    const ton = cocok.reduce((s, r) => s + r.volumeTon, 0);
    return {
      kelompok: k,
      ton,
      persen: total > 0 ? (ton / total) * 100 : 0,
      nProvinsi: new Set(cocok.map((r) => r.ke)).size,
    };
  });

  const tanpaProvinsi = [...new Set(rute.map((r) => r.ke))].filter(
    (p) => !peta.has(p),
  );
  const tanpaVolume = rute
    .filter((r) => tanpaProvinsi.includes(r.ke))
    .reduce((s, r) => s + r.volumeTon, 0);

  return {
    kelompok,
    tanpaTingkatan: {
      ton: tanpaVolume,
      persen: total > 0 ? (tanpaVolume / total) * 100 : 0,
      provinsi: tanpaProvinsi.sort(),
    },
  };
}
