import { jendelaWaktu } from "./waktu"

/** Kepala laporan: bulan sasaran dan sisa waktu. Baris pertama selalu ada;
 *  baris kedua berubah bunyinya ketika jendelanya sudah lewat.
 *
 *  `sekarang` diwajibkan, bukan diambil dari `new Date()` di sini, supaya
 *  tidak ada jalur yang diam-diam membaca jam saat fungsi ini diuji. */
export function teksJendela(bulanPrediksi: string, sekarang: Date): string[] {
  const jendela = jendelaWaktu(bulanPrediksi, sekarang)
  const baris1 =
    `Berlaku untuk ${jendela.labelBulan} · Dibuat ${sekarang.toLocaleDateString("id-ID")}`
  const baris2 = jendela.sudahLewat
    ? `Jendela tindakan rencana ini sudah lewat ${Math.abs(jendela.sisaHari)} hari lalu. ` +
      `Intervensi harus terjadi sebelum ${jendela.labelBulan} berjalan agar memengaruhi ` +
      `harganya. Rencana ini perlu dibangun ulang dari ramalan terbaru sebelum dipakai.`
    : `Sisa waktu sampai tenggat: ${jendela.sisaHari} hari. Tenggatnya awal ` +
      `${jendela.labelBulan}, bukan akhirnya.`
  return [baris1, baris2]
}
