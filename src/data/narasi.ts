import type { Postur } from "@/lib/types"
import generated from "./generated/narasi.json"

type NarasiFile = {
  model: string
  prompt_version: string
  redistribusi: Record<string, string>
  eksekutif: string | null
}

const data = generated as NarasiFile

/** WFP commodity names, the keys narasi.json uses. */
const NAMA: Record<string, string> = {
  beras: "Beras Medium",
  "bawang-merah": "Bawang Merah",
  "bawang-putih": "Bawang Putih",
  "daging-ayam": "Daging Ayam",
  "telur-ayam": "Telur Ayam",
  "minyak-goreng": "Minyak Goreng",
}

/** null where no narrative exists — an empty plan, or one whose text failed
 *  verification twice and was dropped. The caller renders nothing, not a
 *  placeholder. */
export function narasiRedistribusi(komoditas: string, postur: Postur): string | null {
  const nama = NAMA[komoditas]
  if (!nama) return null
  return data.redistribusi[`${nama}|${postur}`] ?? null
}

export const narasiEksekutif = data.eksekutif
export const narasiModel = data.model
