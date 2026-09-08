"use client";

import tingkatanData from "@/data/generated/tingkatan.json";
import { Skeleton } from "@/components/ui/skeleton";
import { sebaranKelompok, KELOMPOK, type Kelompok } from "@/lib/redistribusi/kesenjangan";
import { teksKesenjangan } from "@/lib/redistribusi/teks";
import { ton, persen } from "@/lib/redistribusi/format";
import type { RedistributionRoute, TingkatanProvinsi } from "@/lib/types";

const TINGKATAN_IKP = tingkatanData.provinsi as TingkatanProvinsi[];
const LABEL_KELOMPOK = tingkatanData.label as Record<Kelompok, string>;
const IKP_TANPA_HARGA = tingkatanData.cakupan.ikpTanpaHarga as string[];

interface KesenjanganPanelProps {
  routes: Pick<RedistributionRoute, "to" | "volumeTon">[];
  loading: boolean;
}

/** Kartu warna netral: kelompok bawah/tengah/atas tidak diberi warna
 *  semafor (merah/hijau) karena "bawah IKP" bukan hal yang buruk yang perlu
 *  ditandai merah -- ia hanya posisi dalam pemeringkatan. */
export function KesenjanganPanel({ routes, loading }: KesenjanganPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {KELOMPOK.map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Rencana tanpa rute tidak punya sebaran untuk dinyatakan. sebaranKelompok([])
  // akan mengembalikan 0,00% ke ketiga kelompok -- angka yang sah secara
  // aritmetika tapi salah dibaca di sini: itu akan terbaca sebagai HASIL UKUR
  // (rencana ini mengukur nol distribusi), padahal yang benar adalah TIDAK ADA
  // KLAIM yang bisa dibuat (tidak ada rencana untuk diukur sama sekali).
  // report.ts membuat pembedaan yang sama persis untuk bagian "Kesenjangan IKP".
  if (routes.length === 0) {
    return (
      <p className="text-xs font-medium text-slate-500 py-6 text-center italic">
        Rencana ini tidak memuat satu pun rute, sehingga tidak ada sebaran kelompok IKP yang dapat dinyatakan.
      </p>
    );
  }

  const sebaran = sebaranKelompok(
    routes.map((r) => ({ ke: r.to, volumeTon: r.volumeTon })),
    TINGKATAN_IKP,
  );

  // teksKesenjangan menjamin urutan: [kalimat utama, kalimat jangkauan model
  // (HANYA bila IKP_TANPA_HARGA tidak kosong), lalu sisanya apa adanya]. Lihat
  // dokumentasi teksKesenjangan di lib/redistribusi/teks.ts.
  const teks = teksKesenjangan(sebaran, IKP_TANPA_HARGA);
  let i = 0;
  const utama = teks[i++];
  const jangkauanModel = IKP_TANPA_HARGA.length > 0 ? teks[i++] : null;
  const sisanya = teks.slice(i);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-6 text-slate-600">{utama}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sebaran.kelompok.map((k) => (
          <div key={k.kelompok} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {LABEL_KELOMPOK[k.kelompok]}
            </span>
            <p className="text-base font-black text-slate-800 tracking-tight">{ton(k.ton)}</p>
            <p className="text-sm font-bold text-[#006c4a]">{persen(k.persen)} dari total rencana</p>
            <p className="text-xs text-slate-500">{k.nProvinsi} provinsi tujuan</p>
          </div>
        ))}
      </div>

      {/* Baris di bawah tiga kelompok: provinsi ber-IKP yang tidak akan pernah
       *  terjangkau produk ini sama sekali. Ini BUKAN aside -- ia menyatakan
       *  batas jangkauan model, senormal ketiga kartu di atasnya, bukan
       *  catatan kaki abu-abu seperti kalimat kondisional lain di bawahnya. */}
      {jangkauanModel && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold leading-6 text-slate-700">
          {jangkauanModel}
        </p>
      )}

      {sisanya.map((kalimat, idx) => (
        <p key={idx} className="text-xs leading-5 text-slate-500">
          {kalimat}
        </p>
      ))}
    </div>
  );
}
