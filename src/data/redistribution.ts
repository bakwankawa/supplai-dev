import type {
  Postur,
  RedistributionByPostur,
  RedistributionResponse,
} from "@/lib/types"
import generated from "./generated/redistribution.json"

const data = generated as unknown as RedistributionByPostur

/**
 * A posture that produced no routes still has an entry, with empty route lists —
 * `konservatif` currently ships nothing anywhere, and the UI must be able to say
 * so rather than fall through to another posture's numbers.
 *
 * Omitting `commodity` asks for the six-commodity aggregate and is legitimate.
 * Naming a commodity that is not in the data is not: it used to fall through to
 * that same aggregate, so `?commodity=kopi` answered 200 with every commodity's
 * tonnage under a heading the caller chose. That is the failure the posture
 * parameter was hardened against, and it throws here for the same reason —
 * validation in one API route cannot stop another caller reaching the data
 * layer directly.
 */
export function getRedistributionData(
  commodity?: string,
  postur: Postur | "default" = "default",
): RedistributionResponse {
  const byKomoditas = data[postur] ?? data["default"]
  const kunci = commodity ?? "all"
  const hasil = byKomoditas[kunci]
  if (!hasil) {
    throw new Error(
      `Komoditas '${kunci}' tidak ada dalam rencana redistribusi. ` +
      `Yang tersedia: ${Object.keys(byKomoditas).sort().join(", ")}.`,
    )
  }
  return hasil
}
