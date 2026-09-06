import type { BukuBesarEntry } from "@/lib/types"
import generated from "./generated/buku_besar.json"

/** Every input behind the sizing, with its source and whether it was measured
 *  or declared. Ten entries: six measured, four assumed. */
export const bukuBesar = generated as BukuBesarEntry[]
