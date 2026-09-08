const FALLBACK_GENERATOR = "Pengguna SupplAI";

export function normalizeReportGenerator(value: string | null | undefined) {
  const cleaned = value?.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || FALLBACK_GENERATOR;
}

export function getBrowserReportGenerator() {
  if (typeof window === "undefined") return FALLBACK_GENERATOR;
  if (sessionStorage.getItem("authMode") === "guest") return "Tamu";

  const savedEmail = sessionStorage.getItem("userEmail") || localStorage.getItem("userEmail");
  if (!savedEmail) return "Tim PP0703";
  const namePart = savedEmail.includes("@") ? savedEmail.split("@")[0] : savedEmail;
  return normalizeReportGenerator(namePart.charAt(0).toUpperCase() + namePart.slice(1));
}
