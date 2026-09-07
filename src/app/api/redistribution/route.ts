import { NextRequest, NextResponse } from "next/server"
import { commodities } from "@/data/commodities"
import { getRedistributionData } from "@/data/redistribution"
import { POSTUR, isPostur } from "@/lib/redistribusi/postur"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const commodity = searchParams.get("commodity")
  const postur = searchParams.get("postur")

  // Serving a different posture than the one asked for would show tonnages
  // that are not the ones on screen. Fail instead.
  if (postur !== null && !isPostur(postur)) {
    return NextResponse.json(
      { error: `Postur '${postur}' tidak dikenal. Pilih salah satu: ${POSTUR.join(", ")}.` },
      { status: 400 },
    )
  }

  // Same rule, same reason, on the other parameter. An unknown commodity used
  // to answer 200 with the six-commodity aggregate under the caller's own
  // heading: ?commodity=kopi returned every commodity's tonnage as if it were
  // coffee. Omitting the parameter still asks for the aggregate deliberately.
  if (commodity !== null && commodity !== "" && !commodities.some((c) => c.id === commodity)) {
    return NextResponse.json(
      {
        error: `Komoditas '${commodity}' tidak dikenal. Pilih salah satu: ${commodities
          .map((c) => c.id)
          .join(", ")}.`,
      },
      { status: 400 },
    )
  }

  const data = getRedistributionData(commodity || undefined, postur ?? "default")
  return NextResponse.json(data)
}
