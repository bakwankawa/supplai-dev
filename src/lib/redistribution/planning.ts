import type { RedistributionRoute } from "@/lib/types";

export const shelfLifeByCommodity: Record<string, { duration: string; handling: string }> = {
  beras: { duration: "6-12 bulan", handling: "Jaga kemasan tetap kering, tertutup, dan bebas hama." },
  "bawang-merah": { duration: "4-8 minggu", handling: "Gunakan ruang berventilasi dan hindari kelembapan tinggi." },
  "bawang-putih": { duration: "3-6 bulan", handling: "Simpan pada kondisi kering dengan sirkulasi udara yang baik." },
  "daging-ayam": { duration: "1-2 hari dingin / 6-12 bulan beku", handling: "Gunakan rantai dingin untuk rute antardaerah." },
  "telur-ayam": { duration: "3-5 minggu", handling: "Gunakan kemasan bersekat dan suhu stabil untuk menekan kerusakan." },
  "minyak-goreng": { duration: "12-24 bulan", handling: "Lindungi kemasan dari panas langsung dan benturan selama perjalanan." },
};

export const redistributionVehicles = [
  { id: "box", name: "Truk boks", capacity: 10, multiplier: 1, speed: 55, note: "Muatan umum terlindung cuaca" },
  { id: "reefer", name: "Truk berpendingin", capacity: 8, multiplier: 1.45, speed: 50, note: "Rantai dingin untuk komoditas mudah rusak" },
  { id: "tronton", name: "Truk tronton", capacity: 20, multiplier: 0.88, speed: 50, note: "Kapasitas besar untuk koridor darat" },
  { id: "multimoda", name: "Kontainer multimoda", capacity: 26, multiplier: 0.75, speed: 38, note: "Efisien untuk rute jauh dan antarpulau" },
] as const;

export function recommendedVehicleId(commodity: string, route: RedistributionRoute) {
  if (commodity === "daging-ayam") return "reefer";
  if (route.distance >= 1_200) return "multimoda";
  if (route.volume >= 150) return "tronton";
  return "box";
}

export function calculateRouteEstimate(route: RedistributionRoute, vehicleId: string) {
  const vehicle = redistributionVehicles.find((item) => item.id === vehicleId) ?? redistributionVehicles[0];
  const volume = route.volumeTon ?? route.volume;
  const total = Math.round(route.cost * vehicle.multiplier);
  return {
    vehicle,
    volume,
    effectiveRate: route.cost / volume / route.distance,
    total,
    adjustment: total - route.cost,
    trips: Math.ceil(volume / vehicle.capacity),
    days: Math.max(1, Math.ceil(route.distance / vehicle.speed / 8)),
    costPerKg: total / (volume * 1000),
  };
}
