import type { Postur } from "@/lib/types"
import { POSTUR_LABEL } from "./postur"

/** Turn the solver's own status string into something a reader can act on.
 *
 *  The table used to explain every empty plan with one sentence — "model
 *  memproyeksikan harga stabil atau menurun" — which was false for all ten
 *  empty combinations. Bawang Merah and Minyak Goreng are empty because no
 *  source/destination pairing formed at all; the other four are empty under
 *  konservatif because the p10 reading of the rise puts required volume at
 *  zero, even though those destinations were still flagged as at risk.
 */
export function jelaskanStatus(
  status: string,
  postur: Postur,
  komoditas: string,
): { judul: string; alasan: string } {
  if (status.startsWith("solver gagal")) {
    return {
      judul: "Optimasi tidak menghasilkan solusi.",
      alasan: `Pemecah rute berhenti dengan pesan: "${status}". Ini kegagalan teknis, bukan pernyataan tentang harga ${komoditas}.`,
    }
  }

  switch (status) {
    case "tidak ada pasangan surplus-defisit":
      return {
        judul: "Tidak ada pasangan wilayah yang dapat dibentuk.",
        alasan: `Untuk ${komoditas}, tidak ada provinsi yang memenuhi syarat sebagai asal (harga di bawah median nasional dan tidak sedang naik) berpasangan dengan provinsi tujuan (naik minimal 2% dan harga di atas median). Penyebabnya bukan prediksi harga yang datar, melainkan pemasangan wilayah yang tidak terbentuk — dan itu sama di ketiga postur.`,
      }
    case "tidak perlu intervensi":
      return {
        judul: "Wilayah berisiko tetap terdeteksi, tetapi kebutuhannya nol pada postur ini.",
        alasan: `Postur ${POSTUR_LABEL[postur].nama} membaca batas bawah selang prediksi. Pada pembacaan itu kenaikan ${komoditas} dapat bernilai nol, sehingga volume yang dibutuhkan menjadi nol. Provinsi tujuannya sendiri tetap tertandai berisiko. Pilih postur Seimbang untuk melihat rencana pada prediksi titik.`,
      }
    case "tidak ada kebutuhan terukur":
      return {
        judul: "Kebutuhan tidak dapat diukur untuk komoditas ini.",
        alasan: `Tidak tersedia koefisien konsumsi per kapita untuk ${komoditas} di provinsi tujuan, sehingga volume tidak dapat dihitung dari populasi. Rencana dikosongkan, bukan ditaksir.`,
      }
    case "tidak ada rute ekonomis":
      return {
        judul: "Kebutuhan ada, rutenya tidak.",
        alasan: `Kebutuhan ${komoditas} terhitung, tetapi tidak ada jalur yang ongkos angkutnya tertutup oleh selisih harga antar-provinsi.`,
      }
    case "kosong":
      return {
        judul: "Tidak ada rute pada gabungan komoditas.",
        alasan: `Tidak ada satu pun komoditas yang menghasilkan rute pada postur ${POSTUR_LABEL[postur].nama}.`,
      }
    default:
      return {
        judul: "Rencana kosong dengan sebab yang belum dipetakan.",
        alasan: `Pemecah rute mengembalikan status "${status}", yang belum punya penjelasan di antarmuka ini. Status ditampilkan apa adanya agar tidak digantikan keterangan yang keliru.`,
      }
  }
}
