"use client";

import { useState } from "react";
import lanskapData from "@/data/generated/lanskap.json";
import { persen } from "@/lib/redistribusi/format";
import type { PosisiHarga } from "@/lib/types";

const BARIS = lanskapData.baris as PosisiHarga[];

// Sama seperti teksLanskap di lib/redistribusi/teks.ts: daftar tetap, bukan
// diturunkan dari baris yang lewat -- "tidak diramalkan" adalah properti
// produk (model mana yang kami latih), bukan properti baris data tertentu.
const KOMODITAS_TANPA_RAMALAN = new Set(["Daging Sapi", "Gula Pasir"]);

const PROVINSI_LANSKAP = [...new Set(BARIS.map((b) => b.provinsi))].sort((a, b) =>
  a.localeCompare(b, "id"),
);

interface LanskapPanelProps {
  /** Provinsi tujuan rute pertama rencana yang aktif saat ini, bila ada.
   *  Panel ini TIDAK butuh rute untuk bisa ditampilkan -- lanskap harga
   *  berlaku untuk seluruh 34 provinsi terlepas dari rencana yang mana --
   *  jadi ini murni kenyamanan: dropdown mengikuti tujuan rencana sampai
   *  pemakai memilih provinsi sendiri, lalu berhenti mengikuti. Kosong atau
   *  di luar cakupan lanskap.json berarti tetap pada pilihan yang berlaku. */
  provinsiAwal?: string;
  /** Batasi pilihan provinsi untuk konteks investigasi tertentu. Halaman
   *  redistribusi utama tidak mengirim prop ini dan tetap menampilkan semua
   *  provinsi yang tersedia. */
  provinsiPilihan?: string[];
  komoditasPilihan?: string[];
}

export function LanskapPanel({ provinsiAwal, provinsiPilihan, komoditasPilihan }: LanskapPanelProps) {
  const pilihan = provinsiPilihan
    ? PROVINSI_LANSKAP.filter((nama) => provinsiPilihan.includes(nama))
    : PROVINSI_LANSKAP;
  const opsiProvinsi = pilihan.length > 0 ? pilihan : PROVINSI_LANSKAP;
  const [provinsi, setProvinsi] = useState(
    provinsiAwal && opsiProvinsi.includes(provinsiAwal) ? provinsiAwal : opsiProvinsi[0],
  );
  // `useApi` resolves asynchronously, jadi render pertama SELALU melihat
  // `provinsiAwal` kosong (routes belum sampai) -- state awal di atas nyaris
  // tidak pernah menangkap tujuan yang sesungguhnya. Penyesuaian di bawah
  // menyusul begitu rencana selesai dimuat atau berganti (posture/komoditas),
  // tapi berhenti begitu pemakai memilih provinsi sendiri lewat dropdown.
  //
  // Dilakukan di badan render, bukan di useEffect: React sendiri
  // menganjurkan pola "simpan nilai render sebelumnya, bandingkan, panggil
  // setState langsung di badan render bila berubah" untuk kasus "sesuaikan
  // state ketika prop berubah" -- useEffect di sini hanya menambah satu
  // render ekstra yang tidak perlu untuk sinkronisasi murni antar-props.
  // `dipilihManual` adalah STATE, bukan ref: ref tidak boleh dibaca di badan
  // render (aturan react-hooks/refs), dan nilainya memang ikut menentukan
  // apa yang dirender di sini.
  const [dipilihManual, setDipilihManual] = useState(false);
  const [provinsiAwalSebelumnya, setProvinsiAwalSebelumnya] = useState(provinsiAwal);
  if (provinsiAwal !== provinsiAwalSebelumnya) {
    setProvinsiAwalSebelumnya(provinsiAwal);
    if (!dipilihManual && provinsiAwal && PROVINSI_LANSKAP.includes(provinsiAwal)) {
      setProvinsi(provinsiAwal);
    }
  }

  const baris = BARIS
    .filter((b) => b.provinsi === provinsi && (!komoditasPilihan || komoditasPilihan.includes(b.komoditas)))
    .sort((x, y) => x.komoditas.localeCompare(y.komoditas, "id"));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="max-w-md text-sm font-medium leading-6 text-slate-600">
          {komoditasPilihan
            ? "Posisi komoditas alert di wilayah terkait terhadap median nasional."
            : "Posisi kedelapan komoditas yang lanskap ini baca, di provinsi terpilih, terhadap median nasional."}{" "}
          Ini bacaan harga, bukan bacaan pasokan.
        </p>
        <select
          value={provinsi}
          onChange={(e) => {
            setDipilihManual(true);
            setProvinsi(e.target.value);
          }}
          className="text-xs font-bold text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none hover:border-slate-400 focus:border-[#006c4a] shadow-xs shrink-0"
        >
          {opsiProvinsi.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {baris.map((b) => {
          // Tiga status, bukan dua: "setara median" adalah kasus biasa untuk
          // harga berpatokan HET (persis Rp24.000 di tiga provinsi Minyak
          // Goreng, dsb.), bukan hasil aneh yang perlu dirutekan ke salah
          // satu warna alarm. Warnanya netral (slate) supaya berbeda kasat
          // mata dari "di bawah" (emerald) dan "di atas" (rose) TANPA
          // terbaca sebagai peringatan -- selisih 0,00% memang tidak
          // membuktikan arah manapun.
          const warna =
            b.posisi === "di atas median"
              ? { badge: "bg-rose-50 text-rose-600", angka: "text-rose-600", label: "Di atas" }
              : b.posisi === "setara median"
                ? { badge: "bg-slate-200 text-slate-600", angka: "text-slate-600", label: "Setara" }
                : { badge: "bg-emerald-50 text-[#006c4a]", angka: "text-[#006c4a]", label: "Di bawah" };
          const takDiramalkan = KOMODITAS_TANPA_RAMALAN.has(b.komoditas);
          return (
            <div
              key={b.komoditas}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-700 leading-tight">{b.komoditas}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${warna.badge}`}
                >
                  {warna.label}
                </span>
              </div>
              <p className={`text-sm font-black tabular-nums ${warna.angka}`}>
                {persen(b.relatifPersen)}
              </p>
              {/* Penanda "tidak diramalkan" tepat di sebelah angkanya sendiri,
               *  bukan hanya di legenda: pembaca yang memindai satu kartu
               *  tidak menahan catatan dari bagian lain di kepalanya. Meniru
               *  pilihan yang sama di teksLanskap (lib/redistribusi/teks.ts). */}
              {takDiramalkan && (
                <p className="text-[9px] font-bold uppercase tracking-wide text-amber-600">
                  Tidak diramalkan
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
