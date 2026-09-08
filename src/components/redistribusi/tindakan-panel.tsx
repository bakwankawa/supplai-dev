"use client";

import tindakanData from "@/data/generated/tindakan.json";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import { angka, persen } from "@/lib/redistribusi/format";
import { AMBANG_IMBAL_HASIL_LAYAK_PERSEN, teksInstrumen, teksModal } from "@/lib/redistribusi/teks";
import type { Postur, Tindakan } from "@/lib/types";

const TINDAKAN = tindakanData as unknown as Tindakan;

interface TindakanPanelProps {
  postur: Postur;
  /** Nama komoditas seperti dipakai `commodities.json` ("Beras Medium", dst.)
   *  -- sama persis dengan yang dikirim ke <RouteTable komoditas=... />, dan
   *  sama persis dengan kunci `TINDAKAN.setaraKegiatanPerKomoditas`/
   *  `modalPerKomoditas`. */
  komoditas: string;
  /** Jumlah rute rencana ini, postur dan komoditas laporan ini -- BUKAN
   *  `MUATAN_BALIK[postur].nRute`, yang lintas enam komoditas. Ini gerbang
   *  yang sama dengan `a.routes.length === 0` di report.ts Bagian 08/06:
   *  rencana tanpa rute tidak punya setara kegiatan maupun modal-imbal hasil
   *  untuk dinyatakan, jadi panel ini berhenti sebelum menyentuh data
   *  Tindakan sama sekali -- termasuk pada postur `konservatif`, yang nol
   *  rute untuk SETIAP komoditas. */
  nRute: number;
  loading: boolean;
}

/** Panel "Jalur tindakan": setara kegiatan GPM beserta kapasitas tahunannya
 *  (Bagian 08 kerangka pemerintah), dan tabel modal-imbal hasil diurutkan
 *  menurun menurut imbal hasil dengan rute di bawah ambang layak ditandai
 *  (Bagian 06 kerangka pedagang).
 *
 *  Kedua struktur data dibaca lewat kunci `[postur][komoditas]` yang SAMA
 *  dengan report.ts -- lihat dokumentasi TINDAKAN di ./report.ts dan
 *  Tindakan di @/lib/types. `TINDAKAN.setaraKegiatan`/`TINDAKAN.modal`
 *  (tanpa akhiran) TIDAK PERNAH dibaca di sini: keduanya agregat lintas
 *  enam komoditas pada postur "seimbang" saja, dan menampilkannya di bawah
 *  judul komoditas/postur laporan ini adalah persis defek yang membuat
 *  Task 7 dan 8 dikembalikan. */
export function TindakanPanel({ postur, komoditas, nRute, loading }: TindakanPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (nRute === 0) {
    return (
      <p className="text-xs font-medium text-slate-500 py-6 text-center italic">
        Rencana ini tidak memuat satu pun rute, sehingga tidak ada setara kegiatan GPM
        maupun modal dan imbal hasil yang dapat dinyatakan untuk komoditas dan postur ini.
      </p>
    );
  }

  const setaraKomoditas = TINDAKAN.setaraKegiatanPerKomoditas[postur]?.[komoditas];
  const modalKomoditas = TINDAKAN.modalPerKomoditas[postur]?.[komoditas] ?? [];

  // Diurutkan menurun menurut imbal hasil, bukan menurut modal (lihat catatan
  // Task 6 di brief: tabel modal di spec keliru diurutkan menurut modal,
  // menaruh Sulawesi Barat 17,2% di atas Kepulauan Riau 39,9%). `null`
  // (modal nol pada rute itu, bukan imbal hasil nol atau tak hingga) ditaruh
  // di dasar, tidak ikut dibandingkan secara numerik dengan yang diketahui.
  const modalTerurut = [...modalKomoditas].sort((x, y) => {
    if (x.imbalHasilPersen === null && y.imbalHasilPersen === null) return 0;
    if (x.imbalHasilPersen === null) return 1;
    if (y.imbalHasilPersen === null) return -1;
    return y.imbalHasilPersen - x.imbalHasilPersen;
  });
  const [caveatModal] = teksModal(modalTerurut);

  const instrumen = setaraKomoditas ? teksInstrumen(setaraKomoditas) : null;
  const akanMelewatiTahunan = setaraKomoditas ? setaraKomoditas.persenKapasitas * 12 > 100 : false;

  return (
    <div className="space-y-6">
      {/* ===== Setara kegiatan GPM ===== */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800">Setara kegiatan GPM</h4>
        {!setaraKomoditas || !instrumen ? (
          <p className="text-xs font-medium text-slate-500 py-4 text-center italic">
            Data setara kegiatan GPM untuk komoditas dan postur ini tidak diketahui.
          </p>
        ) : (
          <>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{instrumen[0]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Setara kegiatan
                </span>
                <p className="text-base font-black text-slate-800 tracking-tight">
                  {angka(setaraKomoditas.kegiatan, 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Nilai</span>
                <p className="text-base font-black text-slate-800 tracking-tight">
                  {formatRupiah(setaraKomoditas.nilaiRp)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Kapasitas tahunan GPM
                </span>
                <p className="text-base font-black text-slate-800 tracking-tight">
                  {angka(setaraKomoditas.kapasitasTahunan, 0)}
                </p>
              </div>
              <div
                className={`rounded-xl border p-3 space-y-1 ${
                  akanMelewatiTahunan ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Bagian kapasitas tahunan
                </span>
                <p
                  className={`text-base font-black tracking-tight ${
                    akanMelewatiTahunan ? "text-rose-600" : "text-slate-800"
                  }`}
                >
                  {persen(setaraKomoditas.persenKapasitas)}
                </p>
              </div>
            </div>
            <p
              className={`text-[11px] font-semibold leading-relaxed rounded-xl border p-3 ${
                akanMelewatiTahunan
                  ? "text-rose-700 bg-rose-50 border-rose-100"
                  : "text-slate-700 bg-amber-50 border-amber-100"
              }`}
            >
              {instrumen[1]}
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">{instrumen[2]}</p>
          </>
        )}
      </div>

      {/* ===== Modal dan imbal hasil ===== */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800">Modal dan imbal hasil</h4>
        {modalTerurut.length === 0 ? (
          <p className="text-xs font-medium text-slate-500 py-4 text-center italic">
            Tidak ada rute dengan modal dan imbal hasil yang dapat dinyatakan di sini.
          </p>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-slate-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
              {caveatModal}
            </p>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-2">Dari</th>
                    <th className="py-2 pr-2 text-right">Modal terkunci</th>
                    <th className="py-2 pr-2 text-right">Marjin harapan</th>
                    <th className="py-2 pr-2 text-right">Imbal hasil</th>
                    <th className="py-2 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modalTerurut.map((m, idx) => {
                    const diketahui = m.imbalHasilPersen !== null;
                    const layak = diketahui && (m.imbalHasilPersen as number) >= AMBANG_IMBAL_HASIL_LAYAK_PERSEN;
                    return (
                      <tr key={`${m.dari}-${idx}`} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-2 font-bold text-slate-700 whitespace-nowrap">{m.dari}</td>
                        <td className="py-2 pr-2 text-right text-slate-600 whitespace-nowrap">
                          {formatRupiah(m.modalRp)}
                        </td>
                        <td className="py-2 pr-2 text-right text-slate-600 whitespace-nowrap">
                          {formatRupiah(m.marjinRp)}
                        </td>
                        <td className="py-2 pr-2 text-right font-bold text-slate-700 whitespace-nowrap">
                          {diketahui ? persen(m.imbalHasilPersen as number) : "Tidak diketahui"}
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {!diketahui ? (
                            <span className="rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">
                              Tidak diketahui
                            </span>
                          ) : layak ? (
                            <span className="rounded-full bg-emerald-50 text-[#006c4a] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">
                              Layak
                            </span>
                          ) : (
                            <span className="rounded-full bg-rose-50 text-rose-600 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">
                              Di bawah ambang
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
