import type { BukuBesarEntry } from "@/lib/types"

export type BukuBesarStatus = "terukur" | "diasumsikan" | "diturunkan"

export const BUKU_BESAR_STATUS_LABEL: Record<
  BukuBesarStatus,
  { label: string; deskripsi: string; badgeVariant: "default" | "outline" }
> = {
  terukur: {
    label: "Terukur",
    deskripsi: "Diukur atau dipublikasikan dari sumber data yang terpercaya.",
    badgeVariant: "default",
  },
  diasumsikan: {
    label: "Diasumsikan",
    deskripsi: "Angka yang kami pilih berdasarkan penilaian profesional.",
    badgeVariant: "outline",
  },
  diturunkan: {
    label: "Diturunkan",
    deskripsi: "Dihitung dari input lain dan mewarisi tingkat kepercayaan mereka.",
    badgeVariant: "outline",
  },
}

export function countByStatus(
  entries: BukuBesarEntry[],
  status: BukuBesarStatus,
): number {
  return entries.filter((e) => e.status === status).length
}
