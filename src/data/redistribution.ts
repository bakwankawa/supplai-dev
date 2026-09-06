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
 */
export function getRedistributionData(
  commodity?: string,
  postur: Postur | "default" = "default",
): RedistributionResponse {
  const byKomoditas = data[postur] ?? data["default"]
  return byKomoditas[commodity ?? "all"] ?? byKomoditas["all"]
}
