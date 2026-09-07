const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export interface JendelaWaktu {
  /** "2026-09" */
  bulanSasaran: string
  /** "September 2026" */
  labelBulan: string
  /** Hari tersisa sampai AWAL bulan sasaran. Negatif setelah bulan berjalan. */
  sisaHari: number
  sudahLewat: boolean
}

/**
 * Sisa waktu sampai tenggat tindakan.
 *
 * Tenggatnya adalah awal bulan sasaran, bukan akhirnya: intervensi harus
 * terjadi sebelum bulan berjalan agar memengaruhi harganya. Menghitung ke
 * akhir bulan memberi hampir sebulan kelonggaran yang tidak ada.
 *
 * `sekarang` dilewatkan, bukan diambil dari `new Date()` di dalam, supaya
 * bisa diuji dan supaya pemanggilnya jelas menyatakan bahwa angka ini milik
 * saat render — bukan milik artefaknya.
 */
export function jendelaWaktu(bulanPrediksi: string, sekarang: Date): JendelaWaktu {
  const tahun = Number(bulanPrediksi.slice(0, 4))
  const bulan = Number(bulanPrediksi.slice(5, 7))
  const tenggat = Date.UTC(tahun, bulan - 1, 1)
  const hariIni = Date.UTC(
    sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate(),
  )
  const sisaHari = Math.round((tenggat - hariIni) / 86_400_000)
  return {
    bulanSasaran: `${tahun}-${String(bulan).padStart(2, "0")}`,
    labelBulan: `${NAMA_BULAN[bulan - 1]} ${tahun}`,
    sisaHari,
    sudahLewat: sisaHari < 0,
  }
}
