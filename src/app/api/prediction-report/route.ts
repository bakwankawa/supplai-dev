import { NextRequest, NextResponse } from "next/server";
import { generatedTimeSeriesMaster } from "@/data/prediction-chart";
import { analyzePrediction } from "@/lib/prediction/analysis";
import { createPredictionReport } from "@/lib/prediction/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const commodityId = params.get("commodity") ?? "";
  const regions = params.getAll("region");
  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";
  const group = Object.hasOwn(generatedTimeSeriesMaster, commodityId) ? generatedTimeSeriesMaster[commodityId] : null;
  if (!group || regions.length < 1 || regions.length > 3 || new Set(regions).size !== regions.length || regions.some((region) => !Object.hasOwn(group, region)) || !isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    return NextResponse.json({ error: "Pilih komoditas, 1-3 wilayah, dan rentang tanggal yang valid." }, { status: 400 });
  }
  const pdf = createPredictionReport(analyzePrediction({ commodityId, regions, startDate, endDate }));
  return new Response(pdf, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="Laporan-Prediksi-${commodityId}-${endDate}.pdf"`,
    "Cache-Control": "no-store",
  } });
}
