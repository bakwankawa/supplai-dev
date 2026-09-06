import { NextRequest, NextResponse } from "next/server"
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

  const data = getRedistributionData(commodity || undefined, postur ?? "default")
  return NextResponse.json(data)
}
