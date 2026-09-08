"use client";

import muatanBalikData from "@/data/generated/muatan_balik.json";
import { angka, persen, ton } from "@/lib/redistribusi/format";
import { teksMuatanBalik } from "@/lib/redistribusi/teks";
import type { MuatanBalikByPostur, Postur } from "@/lib/types";

const MUATAN_BALIK = muatanBalikData as unknown as MuatanBalikByPostur;

interface MuatanBalikPanelProps {
  postur: Postur;
}

/** Panel "Muatan balik": nol pasangan rute bolak-balik pada rencana ini, dan
 *  apa yang ada sebagai gantinya -- rantai lewat provinsi yang sekaligus
 *  menerima dan mengirim komoditas berbeda.
 *
 *  BUKAN diberi prop komoditas: rantai adalah satu-satunya bagian dari jalur
 *  tindakan yang genuinely LINTAS ENAM KOMODITAS by design, dihitung sekali
 *  per postur atas seluruh rencana (lihat dokumentasi MUATAN_BALIK di
 *  ./report.ts dan RantaiMuatan di @/lib/types) -- menambah prop komoditas di
 *  sini akan menyiratkan penyaringan yang tidak ada pada datanya. Data ini
 *  statis per build (sama seperti lanskap.json), jadi panel ini tidak
 *  menunggu fetch apa pun dan tidak butuh prop `loading`.
 *
 *  `konservatif` tidak mengirim satu rute pun sama sekali (lihat
 *  `nRute === 0` di bawah): `teksMuatanBalik` mengembalikan satu kalimat
 *  saja untuk kasus itu, dan panel ini berhenti di situ -- tidak ada kartu,
 *  tidak ada tabel rantai yang dirender dari rencana yang tidak pernah ada. */
export function MuatanBalikPanel({ postur }: MuatanBalikPanelProps) {
  const d = MUATAN_BALIK[postur];
  const teks = teksMuatanBalik(d);

  if (d.nRute === 0) {
    return (
      <p className="text-xs font-medium text-slate-500 py-6 text-center italic">{teks[0]}</p>
    );
  }

  const [temuan, perantaian, batasKendaraan] = teks;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{temuan}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Pasangan bolak-balik
          </span>
          <p className="text-base font-black text-slate-800 tracking-tight">
            {angka(d.pasanganBolakBalik, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Ton-km kaki pulang bila khusus
          </span>
          <p className="text-base font-black text-slate-800 tracking-tight">
            {d.tonKm === null ? "Tidak diketahui" : `${angka(d.tonKm, 0)} ton-km`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Tonase dirantai (lantai, bukan langit-langit)
          </span>
          <p className="text-base font-black text-[#006c4a] tracking-tight">
            {d.tonDirantai === null || d.persenDirantai === null
              ? "Tidak diketahui"
              : `${ton(d.tonDirantai)} (${persen(d.persenDirantai)})`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Ton-km kosong terhindar via rantai
          </span>
          <p className="text-base font-black text-slate-800 tracking-tight">
            {d.tonKmKosongDihindari === null ? "Tidak diketahui" : `${angka(d.tonKmKosongDihindari, 0)} ton-km`}
          </p>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-slate-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
        {perantaian}
      </p>

      {d.simpul.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.simpul.map((s) => (
            <span
              key={s}
              className="rounded-full bg-emerald-50 text-[#006c4a] text-[10px] font-bold px-2.5 py-1"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {d.rantai.length === 0 ? (
        <p className="text-xs font-medium text-slate-500 py-4 text-center italic">
          Tidak ada rantai yang tercatat untuk postur ini.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Simpul</th>
                <th className="py-2 pr-2">Dari</th>
                <th className="py-2 pr-2">Ke</th>
                <th className="py-2 pr-2">Komoditas masuk</th>
                <th className="py-2 pr-2">Komoditas keluar</th>
                <th className="py-2 pr-2 text-right">Ton dirantai</th>
              </tr>
            </thead>
            <tbody>
              {d.rantai.map((r, idx) => (
                <tr key={`${r.hub}-${r.dari}-${r.ke}-${idx}`} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-2 font-bold text-slate-700 whitespace-nowrap">{r.hub}</td>
                  <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{r.dari}</td>
                  <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{r.ke}</td>
                  <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{r.komoditasMasuk}</td>
                  <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{r.komoditasKeluar}</td>
                  <td className="py-2 pr-2 text-right font-bold text-[#006c4a] whitespace-nowrap">
                    {r.tonDirantai === null ? "Tidak diketahui" : ton(r.tonDirantai)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">{batasKendaraan}</p>
    </div>
  );
}
