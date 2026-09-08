"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarClock, CheckCircle2, Download, Layers3, Route, X } from "lucide-react";
import { getAlertById } from "@/data/alerts";
import { commodities } from "@/data/commodities";
import { getRedistributionData } from "@/data/redistribution";
import { narasiRedistribusi } from "@/data/narasi";
import { BukuBesarPanel } from "@/components/redistribusi/buku-besar-panel";
import { SurplusPanel, MethodPanel } from "@/components/redistribusi/info-panels";
import { KesenjanganPanel } from "@/components/redistribusi/kesenjangan-panel";
import { LanskapPanel } from "@/components/redistribusi/lanskap-panel";
import { MuatanBalikPanel } from "@/components/redistribusi/muatan-balik-panel";
import { PostureSwitch } from "@/components/redistribusi/posture-switch";
import { RouteTable } from "@/components/redistribusi/route-table";
import { RedistributionSectionNavigator } from "@/components/redistribusi/section-navigator";
import { TindakanPanel } from "@/components/redistribusi/tindakan-panel";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Narasi } from "@/components/ui/narasi";
import { getBrowserReportGenerator } from "@/lib/report-generator";
import { POSTUR_LABEL } from "@/lib/redistribusi/postur";
import { jendelaWaktu } from "@/lib/redistribusi/waktu";
import type { Postur } from "@/lib/types";

const ClientIndonesiaMap = dynamic(
  () => import("@/components/redistribusi/indonesia-map").then((module) => module.IndonesiaMap),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-slate-50" /> },
);
const ClientAlertPredictionPanel = dynamic(
  () => import("@/components/alerts/alert-prediction-panel").then((module) => module.AlertPredictionPanel),
  { ssr: false, loading: () => <div className="h-[520px] animate-pulse rounded-xl bg-slate-50" /> },
);
const SEVERITY = {
  kritis: { label: "KRITIS", className: "bg-rose-600 text-white" },
  tinggi: { label: "WASPADA", className: "bg-amber-500 text-white" },
  sedang: { label: "PANTAU", className: "bg-sky-500 text-white" },
  rendah: { label: "INFORMASI", className: "bg-slate-500 text-white" },
} as const;

function SectionCard({ id, title, tooltip, icon, children }: {
  id: string;
  title: string;
  tooltip?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 15 }}
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
        {icon ?? <div className="h-5 w-2 rounded-full bg-[#006c4a]" />}
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {children}
    </motion.section>
  );
}

export default function AlertDetailPage() {
  const params = useParams();
  const alertId = String(params?.id ?? "");
  const alert = getAlertById(alertId);
  const [postur, setPostur] = useState<Postur>("seimbang");
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<"pemerintah" | "pedagang" | null>(null);
  const [reportError, setReportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState<{ url: string; filename: string } | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const mapSectionRef = useRef<HTMLElement>(null);

  const commodityName = commodities.find((item) => item.id === alert?.commodity)?.name ?? "Komoditas";
  const source = useMemo(() => alert ? getRedistributionData(alert.commodity, postur) : null, [alert, postur]);
  const routes = useMemo(
    () => alert && source
      ? source.routes.filter((route) => route.from === alert.region || route.to === alert.region)
      : [],
    [alert, source],
  );
  const relatedRegions = useMemo(() => {
    const names = new Set(routes.flatMap((route) => [route.from, route.to]));
    if (alert) names.add(alert.region);
    return [...names];
  }, [alert, routes]);
  const provinces = useMemo(
    () => source?.provinces.filter((province) => relatedRegions.includes(province.name)) ?? [],
    [relatedRegions, source],
  );
  const surplusProvinces = provinces.filter((province) => province.status === "surplus");
  const deficitProvinces = provinces.filter((province) => province.status === "deficit");
  const narrative = alert ? narasiRedistribusi(alert.commodity, postur) : null;
  const routeOrigins = [...new Set(routes.map((route) => route.from))];

  useEffect(() => setSelectedProducer(null), [alertId, postur]);
  useEffect(() => () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
  }, []);

  if (!alert || !source) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-bold text-slate-700">Peringatan {alertId} tidak ditemukan.</p>
        <Link href="/alerts" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#006c4a]">
          <ArrowLeft className="h-4 w-4" />Kembali ke pusat peringatan
        </Link>
      </div>
    );
  }

  const severity = SEVERITY[alert.severity];
  const totalVolume = routes.reduce((sum, route) => sum + route.volumeTon, 0);
  const timeWindow = jendelaWaktu(source.summary.bulanPrediksi, new Date());

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadReport = async (pembaca: "pemerintah" | "pedagang") => {
    setDownloadingReport(pembaca);
    setReportError("");
    try {
      const query = new URLSearchParams({
        commodity: alert.commodity,
        postur,
        pembaca,
        region: alert.region,
        generatedBy: getBrowserReportGenerator(),
      });
      const response = await fetch(`/api/redistribution-report?${query}`);
      if (!response.ok) throw new Error("Laporan investigasi belum berhasil disiapkan.");
      const url = URL.createObjectURL(await response.blob());
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const filename = `Laporan-Alert-${alert.commodity}-${alert.region}-${pembaca}.pdf`;
      downloadUrlRef.current = url;
      setDownloadNotice({ url, filename });
      triggerDownload(url, filename);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan belum berhasil diunduh.");
    } finally {
      setDownloadingReport(null);
    }
  };

  const closeDownloadNotice = () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
    setDownloadNotice(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1600px] space-y-6 pb-12 text-slate-800">
      <header className="border-b border-slate-200 pb-5">
        <Link href="/alerts" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Kembali ke pusat peringatan</Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-black tracking-wider ${severity.className}`}>{severity.label}</span>
              <span className="font-mono text-[10px] text-slate-400">{alert.id}</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400"><CalendarClock className="h-3.5 w-3.5" />Snapshot {new Date(alert.timestamp).toLocaleDateString("id-ID")}</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Investigasi {commodityName} — <span className="text-[#006c4a]">{alert.region}</span></h1>
            <p className="mt-1 text-sm text-slate-500">Analisis redistribusi berikut hanya memuat rute yang berasal dari atau menuju wilayah peringatan ini.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pemerintah", "pedagang"] as const).map((pembaca) => (
              <button key={pembaca} type="button" onClick={() => downloadReport(pembaca)} disabled={downloadingReport !== null} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:border-slate-500 disabled:cursor-wait disabled:opacity-60">
                <Download className="h-4 w-4" />{downloadingReport === pembaca ? "Menyiapkan…" : `Laporan ${pembaca === "pemerintah" ? "Pemerintah" : "Pedagang"}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {reportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{reportError}</p>}
      <AnimatePresence>
        {downloadNotice && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status" className="fixed bottom-6 right-6 z-[100] w-[min(24rem,calc(100vw-3rem))] rounded-xl border border-emerald-200 bg-white p-4 shadow-xl">
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006c4a]" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">Dokumen telah terunduh</p><button type="button" onClick={() => triggerDownload(downloadNotice.url, downloadNotice.filename)} className="mt-1 text-left text-xs font-semibold leading-5 text-[#006c4a] underline underline-offset-2">Klik di sini jika dokumen belum terunduh otomatis.</button></div><button type="button" onClick={closeDownloadNotice} aria-label="Tutup notifikasi unduhan" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="ringkasan-rencana" className="scroll-mt-24 grid overflow-visible rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-[1fr_1.65fr_repeat(3,minmax(0,0.75fr))]">
        <div className="min-w-0 p-4"><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Komoditas dipilih</p><p className="mt-1 truncate text-base font-bold text-slate-800" title={commodityName}>{commodityName}</p></div>
        <div className="min-w-0 border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe prediksi</p>
          <div className="mt-1"><PostureSwitch value={postur} onChange={setPostur} compact /></div>
        </div>
        {[
          ["Wilayah asal", `${surplusProvinces.length} wilayah`],
          ["Wilayah tujuan", `${deficitProvinces.length} wilayah`],
          ["Total saran rute", `${routes.length} alokasi`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-t border-slate-200 p-4 sm:border-l sm:border-t-0"><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-base font-bold text-slate-800" title={value}>{value}</p></div>
        ))}
      </section>

      <div className="sticky -top-6 z-30 -mx-6 space-y-2 bg-slate-50 px-6 py-2">
        {narrative ? <Narasi teks={narrative} /> : <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">Ringkasan model bahasa</h2><p className="mt-2 text-xs text-slate-500">Ringkasan model bahasa belum tersedia untuk komoditas ini.</p></section>}
        <p className="px-1 text-[11px] leading-5 text-slate-500">Ringkasan model bahasa mencakup seluruh rencana {commodityName} pada postur {POSTUR_LABEL[postur].nama}. Seluruh bagian investigasi di bawah difilter untuk {alert.region} dan wilayah yang terhubung langsung dengannya.</p>
        <RedistributionSectionNavigator includePrediction />
      </div>

      <div className={timeWindow.sudahLewat ? "border-l-2 border-red-500 py-2 pl-3" : "border-l-2 border-slate-300 py-2 pl-3"}><p className="text-sm text-slate-700">Rencana untuk <strong>{timeWindow.labelBulan}</strong>{timeWindow.sudahLewat ? ` — jendela tindakan sudah lewat ${Math.abs(timeWindow.sisaHari)} hari lalu.` : ` — sisa ${timeWindow.sisaHari} hari sampai tenggat.`}</p></div>

      <SectionCard id="prediksi-harga" title="Prediksi Harga">
        <ClientAlertPredictionPanel commodityId={alert.commodity} region={alert.region} />
      </SectionCard>

      {routes.length === 0 && <section className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="text-lg font-bold text-slate-900">Belum ada rekomendasi redistribusi terkait</h2><p className="mt-2 text-sm text-slate-500">Tidak ada rute {commodityName} pada postur {POSTUR_LABEL[postur].nama} yang berasal dari atau menuju {alert.region}. Bagian di bawah tetap tersedia sebagai referensi analisis.</p></section>}

      <div className="grid items-stretch gap-6 lg:grid-cols-12">
        <section id="peta-alokasi" ref={mapSectionRef} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8 sm:p-6">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4"><div className="h-5 w-2 rounded-full bg-[#006c4a]" /><h2 className="text-lg font-bold text-slate-800">Peta Aliran Distribusi Logistik</h2></div>
          <ClientIndonesiaMap provinces={provinces} routes={routes} loading={false} selectedProvince={selectedProducer} onProvinceSelect={setSelectedProducer} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4"><Layers3 className="h-4 w-4 text-[#006c4a]" /><h2 className="text-lg font-bold text-slate-800">Wilayah Asal (Surplus)</h2><InfoTooltip text="Wilayah asal yang muncul hanya yang memiliki rute langsung dari atau menuju wilayah alert. Status surplus mengikuti hasil perhitungan redistribusi untuk komoditas ini." /></div>
          <p className="mb-3 text-[11px] text-slate-500">Pilih wilayah untuk menandainya pada peta.</p>
          <SurplusPanel provinces={surplusProvinces} selectedProvince={selectedProducer} onSelect={(name) => { setSelectedProducer(name); mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
        </section>
      </div>

      <SectionCard id="matriks-rute" title="Matriks Rute Distribusi Direkomendasikan" icon={<Route className="h-5 w-5 text-[#006c4a]" />} tooltip="Setiap baris adalah rute yang berasal dari atau menuju wilayah alert. Persentase pasar membandingkan kiriman dengan konsumsi bulanan tujuan. Biaya memuat ongkos angkut dan jarak rute.">
        <p className="mb-4 text-xs text-slate-500">Biaya dihitung otomatis berdasarkan formula komparatif Rp2.500/ton/km.</p>
        <div className="w-full overflow-x-auto"><RouteTable routes={routes} loading={false} status={source.summary.status} postur={postur} komoditas={commodityName} commodityId={alert.commodity} emptyState={{ title: "Belum ada rute yang terkait dengan alert ini.", reason: `Rencana ${commodityName} tidak memuat rute yang berasal dari atau menuju ${alert.region}.` }} /></div>
      </SectionCard>

      <SectionCard id="kesenjangan-ikp" title="Kesenjangan Antarkelompok IKP" tooltip="Perhitungan bagian ini hanya memakai tujuan dari rute yang terhubung dengan wilayah alert."><KesenjanganPanel routes={routes} loading={false} /></SectionCard>
      <SectionCard id="lanskap-komoditas" title="Lanskap Komoditas"><LanskapPanel key={`${alert.id}-${postur}`} provinsiAwal={alert.region} provinsiPilihan={relatedRegions} komoditasPilihan={[commodityName]} /></SectionCard>
      <SectionCard id="muatan-balik" title="Muatan Balik"><MuatanBalikPanel postur={postur} relevantRegions={relatedRegions} commodityName={commodityName} routeCount={routes.length} totalRouteVolume={totalVolume} /></SectionCard>
      <SectionCard id="jalur-tindakan" title="Jalur Tindakan"><TindakanPanel postur={postur} komoditas={commodityName} nRute={routes.length} loading={false} relevantOrigins={routeOrigins} /></SectionCard>
      <SectionCard id="asal-usul-angka" title="Asal-usul Angka" tooltip="Daftar ini menyebut masukan perhitungan beserta sumber dan tahunnya agar dapat diperiksa, sekaligus membedakan angka yang diukur, diturunkan, dan ditetapkan melalui asumsi."><BukuBesarPanel /></SectionCard>
      <section id="metode-alokasi" className="scroll-mt-24"><MethodPanel sources={surplusProvinces.length} destinations={deficitProvinces.length} /></section>
    </motion.div>
  );
}
