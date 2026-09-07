import type { Postur } from "@/lib/types"

export const POSTUR: readonly Postur[] = ["konservatif", "seimbang", "aman_pangan"] as const

/** What each posture reads, in words a non-technical reader can act on. The
 *  postures are not "levels of caution" in the abstract — each one reads a
 *  different path of the same calibrated forecast interval. */
export const POSTUR_LABEL: Record<Postur, { nama: string; arti: string }> = {
  konservatif: {
    nama: "Konservatif",
    arti: "Membaca batas bawah selang prediksi. Kirim hanya jika kenaikan tetap muncul pada pembacaan paling hati-hati.",
  },
  seimbang: {
    nama: "Seimbang",
    arti: "Membaca prediksi titik. Volume mengikuti kenaikan yang paling mungkin terjadi.",
  },
  aman_pangan: {
    nama: "Aman Pangan",
    arti: "Membaca batas atas selang prediksi. Kirim seolah kenaikan terburuk yang akan terjadi.",
  },
}

export function isPostur(value: string): value is Postur {
  return (POSTUR as readonly string[]).includes(value)
}
