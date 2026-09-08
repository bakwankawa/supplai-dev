import { NextRequest, NextResponse } from "next/server";
import { getRedistributionData } from "@/data/redistribution";
import { commodities } from "@/data/commodities";
import { redistributionVehicles } from "@/lib/redistribution/planning";
import { createRedistributionReport } from "@/lib/redistribution/report";
import { isPostur } from "@/lib/redistribusi/postur";
import { normalizeReportGenerator } from "@/lib/report-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const commodity = params.get("commodity") ?? "";
  const postur = params.get("postur") ?? "";
  const scope = params.get("scope") === "all" ? "all" : "selected";
  const vehicle = params.get("vehicle") ?? "box";
  const generatedBy = normalizeReportGenerator(params.get("generatedBy"));
  if (!commodities.some((item) => item.id === commodity) || !isPostur(postur) || !redistributionVehicles.some((item) => item.id === vehicle)) {
    return NextResponse.json({ error: "Komoditas, postur, atau kendaraan tidak valid." }, { status: 400 });
  }
  const data = getRedistributionData(commodity, postur);
  const routes = scope === "all" ? data.routes : data.routes.filter((item) => item.from === params.get("from") && item.to === params.get("to"));
  if (!routes.length) return NextResponse.json({ error: "Rute redistribusi tidak ditemukan." }, { status: 404 });
  const pdf = createRedistributionReport(commodity, routes, scope, vehicle, new Date(), generatedBy);
  return new Response(pdf, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="Laporan-Redistribusi-${commodity}-${postur}-${scope}.pdf"`,
    "Cache-Control": "no-store",
  } });
}
