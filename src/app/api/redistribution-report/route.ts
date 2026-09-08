import { NextRequest, NextResponse } from "next/server";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi } from "@/lib/redistribusi/analysis";
import { createRedistribusiReport, PEMBACA, type Pembaca } from "@/lib/redistribusi/report";
import { isPostur, POSTUR } from "@/lib/redistribusi/postur";
import { commodities } from "@/data/commodities";
import { normalizeReportGenerator } from "@/lib/report-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isPembaca = (v: string): v is Pembaca => (PEMBACA as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const commodity = params.get("commodity") ?? "";
  const postur = params.get("postur") ?? "";
  const pembaca = params.get("pembaca") ?? "";
  const region = params.get("region")?.trim() ?? "";
  const generatedBy = normalizeReportGenerator(params.get("generatedBy"));

  const komoditas = commodities.find((c) => c.id === commodity);
  if (!komoditas || !isPostur(postur) || !isPembaca(pembaca)) {
    return NextResponse.json(
      { error: `Pilih komoditas yang tersedia, postur (${POSTUR.join(", ")}), dan pembaca (${PEMBACA.join(", ")}).` },
      { status: 400 },
    );
  }

  const source = getRedistributionData(commodity, postur);
  const relatedRoutes = region
    ? source.routes.filter((route) => route.from === region || route.to === region)
    : source.routes;
  const relevantProvinceNames = new Set(relatedRoutes.flatMap((route) => [route.from, route.to]));
  const reportData = region
    ? {
        ...source,
        routes: relatedRoutes,
        provinces: source.provinces.filter((province) => relevantProvinceNames.has(province.name)),
        summary: {
          ...source.summary,
          totalRoutes: relatedRoutes.length,
          totalVolume: relatedRoutes.reduce((sum, route) => sum + route.volumeTon, 0),
          estimatedCost: relatedRoutes.reduce((sum, route) => sum + route.cost, 0),
        },
      }
    : source;
  const analysis = analyzeRedistribusi(reportData, komoditas.name, postur);
  const pdf = createRedistribusiReport(analysis, pembaca, new Date(), generatedBy);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-Redistribusi-${commodity}-${postur}-${pembaca}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
