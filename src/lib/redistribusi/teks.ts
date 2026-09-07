import type { RedistribusiAnalysis } from "./analysis"
import { angka, persen } from "./format"
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

/** Bagian "Penekanan harga": klaim utama, dasar takarannya, lalu asumsi
 *  terbesar yang menopang angka itu -- diucapkan sebelum ditanya, bukan
 *  ditunggu sampai ditanya.
 *
 *  `a.dampak.ditahanPpRata` / `fraksiRata` bisa `null`, dan nol bukan hal
 *  yang sama dengan null di sini (lihat `rataBobotVolume` di `./analysis`):
 *  nol berarti kami TAHU rencana ini tidak menahan apa-apa, null berarti
 *  kami TIDAK TAHU -- karena sedikitnya satu rute dalam seleksi ini menuju
 *  provinsi tujuan tanpa data konsumsi pendukung. Kasus null di sini tidak
 *  mencetak angka dan tidak mencetak nol; ia menyatakan mengapa angkanya
 *  tidak ada. Ini meniru pilihan yang sudah diambil `rataBobotVolume` dan
 *  blok fakta Python yang sama-sama menghilangkan figur ini seluruhnya
 *  dalam situasi yang sama, alih-alih diam-diam merata-ratakan sisa rute
 *  yang datanya ada -- dua lapisan yang membaca sumber yang sama tidak
 *  boleh berselisih pendapat soal apa arti "tidak diketahui".
 *
 *  Satu angka, dua besaran: `ditahanPpRata` adalah POIN PERSEN dari kenaikan
 *  yang diprediksi, dirender dengan `angka` (tanpa tanda %) karena unitnya
 *  sudah disebut dalam kata "poin persen" di sampingnya -- menambahkan %
 *  akan menyatakan besaran yang berbeda dan lebih kecil (X% DARI kenaikan,
 *  bukan X poin persen DARInya). `fraksiRata` genuinely adalah pecahan 0..1
 *  dari kenaikan itu, jadi ia dan harga akhir yang "lebih rendah" memang
 *  berhak atas tanda %, dirender dengan `persen`. */
export function teksPenekananHarga(a: RedistribusiAnalysis): string[] {
  const { ditahanPpRata, fraksiRata } = a.dampak
  const klaim =
    a.totalRute === 0
      ? "Rencana ini tidak memuat satu pun rute, sehingga tidak ada klaim " +
        "penekanan harga yang dapat dinyatakan."
      : ditahanPpRata === null || fraksiRata === null
        ? "Rencana ini tidak menghasilkan angka penekanan harga gabungan: " +
          "setidaknya satu rute dalam seleksi ini menuju provinsi tujuan tanpa " +
          "data konsumsi pendukung, sehingga seberapa jauh harga akhirnya lebih " +
          "rendah dibanding tanpa intervensi tidak diketahui — bukan nol. Rute " +
          "yang datanya tersedia sengaja tidak dirata-ratakan sendirian, karena " +
          "itu akan diam-diam menyembunyikan rute yang tidak diketahui itu."
        : `Rencana ini menahan rata-rata ${angka(ditahanPpRata)} poin persen ` +
          `dari kenaikan yang diprediksi, atau sekitar ${persen(fraksiRata * 100)} ` +
          `dari kenaikan itu. Artinya harga di provinsi tujuan berakhir sekitar ` +
          `${persen(ditahanPpRata)} lebih rendah dibanding tanpa intervensi — ` +
          `bukan turun sebesar itu dari harga hari ini.`

  const takaran =
    `Angka ini mewarisi dasar takaran rutenya: ${a.terukur} rute bersandar ` +
    `pada kebutuhan terukur, ${a.diasumsikan} rute pada heuristik sisi ` +
    `pasokan. Untuk rute yang diasumsikan, dampak harganya juga diasumsikan.`

  const basis =
    `Efek harga berlaku atas seluruh konsumsi bulanan provinsi tujuan, bukan ` +
    `hanya atas tonase yang dikirim. Itulah sebabnya volume kecil dapat ` +
    `menggeser harga untuk semua pembeli, dan itu pula asumsi terbesar dalam ` +
    `angka di atas.`

  return [klaim, takaran, basis]
}

/** Kerangka pedagang: penjelasan tentang marjin harapan. Ia adalah selisih
 *  antara harga tujuan SETELAH kenaikan yang diprediksi dan harga asal hari
 *  ini, dikurangi ongkos angkut. Penting untuk menyatakan bahwa ia harapan
 *  (conditional pada kenaikan yang terjadi) dan bukan penghematan (yang sudah
 *  terwujud). */
export function teksMarjin(): string {
  return (
    `Marjin harapan adalah selisih antara harga tujuan setelah kenaikan yang ` +
    `diprediksi dan harga asal hari ini, dikurangi ongkos angkut. Ia bukan ` +
    `penghematan: angka ini terwujud hanya bila kenaikan yang diprediksi ` +
    `benar-benar terjadi. Marjin negatif ditampilkan apa adanya.`
  )
}
