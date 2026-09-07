import { NextRequest, NextResponse } from "next/server";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi } from "@/lib/redistribusi/analysis";
import { createRedistribusiReport, PEMBACA, type Pembaca } from "@/lib/redistribusi/report";
import { isPostur, POSTUR } from "@/lib/redistribusi/postur";
import { commodities } from "@/data/commodities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isPembaca = (v: string): v is Pembaca => (PEMBACA as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const commodity = params.get("commodity") ?? "";
  const postur = params.get("postur") ?? "";
  const pembaca = params.get("pembaca") ?? "";

  const komoditas = commodities.find((c) => c.id === commodity);
  if (!komoditas || !isPostur(postur) || !isPembaca(pembaca)) {
    return NextResponse.json(
      { error: `Pilih komoditas yang tersedia, postur (${POSTUR.join(", ")}), dan pembaca (${PEMBACA.join(", ")}).` },
      { status: 400 },
    );
  }

  const analysis = analyzeRedistribusi(
    getRedistributionData(commodity, postur), komoditas.name, postur);
  const pdf = createRedistribusiReport(analysis, pembaca);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-Redistribusi-${commodity}-${postur}-${pembaca}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
