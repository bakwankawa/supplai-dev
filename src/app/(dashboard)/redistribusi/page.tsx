"use client";

import { Suspense, useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useApi } from "@/hooks/use-api";
import { commodities } from "@/data/commodities";
import type { RedistributionResponse, Postur } from "@/lib/types";
import { IndonesiaMap } from "@/components/redistribusi/indonesia-map";
import { RouteTable } from "@/components/redistribusi/route-table";
import { PostureSwitch } from "@/components/redistribusi/posture-switch";
import { SurplusPanel, MethodPanel } from "@/components/redistribusi/info-panels";
import { BukuBesarPanel } from "@/components/redistribusi/buku-besar-panel";
import { KesenjanganPanel } from "@/components/redistribusi/kesenjangan-panel";
import { LanskapPanel } from "@/components/redistribusi/lanskap-panel";
import { MuatanBalikPanel } from "@/components/redistribusi/muatan-balik-panel";
import { TindakanPanel } from "@/components/redistribusi/tindakan-panel";
import { RedistributionSectionNavigator } from "@/components/redistribusi/section-navigator";
import { Skeleton } from "@/components/ui/skeleton";
import { Narasi } from "@/components/ui/narasi";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { narasiRedistribusi } from "@/data/narasi";
import { isPostur, POSTUR_LABEL } from "@/lib/redistribusi/postur";
import { jendelaWaktu } from "@/lib/redistribusi/waktu";
import { getBrowserReportGenerator } from "@/lib/report-generator";
import { AlertTriangle, CheckCircle2, ChevronDown, Route, Layers3, Search, Download, X } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
} as const;

function StickyRedistributionGuide({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -top-6 z-30 -mx-6 space-y-2 bg-slate-50 px-6 py-2">
      {children}
    </div>
  );
}

function RedistribusiContent() {
  const searchParams = useSearchParams();
  const requestedCommodity = searchParams.get("commodity");
  const requestedPostur = searchParams.get("postur");
  const [commodity, setCommodity] = useState(() => commodities.some((item) => item.id === requestedCommodity) ? requestedCommodity! : "beras");
  const [postur, setPostur] = useState<Postur>(() => requestedPostur && isPostur(requestedPostur) ? requestedPostur : "seimbang");
  const [searchComm, setSearchComm] = useState("");
  const [isCommOpen, setIsCommOpen] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<"pemerintah" | "pedagang" | null>(null);
  const [reportError, setReportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState<{ url: string; filename: string } | null>(null);
  const commDropdownRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const downloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commDropdownRef.current && !commDropdownRef.current.contains(event.target as Node)) {
        setIsCommOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
  }, []);

  const filteredCommodities = useMemo(() => {
    return commodities.filter(c => c.name.toLowerCase().includes(searchComm.toLowerCase()));
  }, [searchComm]);

  const currentCommodityName = useMemo(() => {
    return commodities.find(c => c.id === commodity)?.name ?? "Beras Medium";
  }, [commodity]);

  const { data, loading, error } = useApi<RedistributionResponse>(
    `/api/redistribution?commodity=${commodity}&postur=${postur}`
  );

  // A failed load has no plan in it. Everything below the header describes a
  // plan — tonnages, a map, a machine-written paragraph, a route table — so
  // none of it may render from an answer that never arrived. The honesty
  // ledger stays: it is static and remains true whether the API answered.
  const gagalMuat = error ? error.message : null;

  const summary = data?.summary;
  const provinces = data?.provinces ?? [];
  const routes = data?.routes ?? [];
  const surplusProvinces = provinces.filter((p) => p.status === "surplus");
  const deficitProvinces = provinces.filter((p) => p.status === "deficit");

  const selectProducer = (name: string) => {
    setSelectedProducer(name);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
      const response = await fetch(
        `/api/redistribution-report?commodity=${commodity}&postur=${postur}&pembaca=${pembaca}&generatedBy=${encodeURIComponent(getBrowserReportGenerator())}`,
      );
      if (!response.ok) throw new Error("Laporan belum berhasil disiapkan. Silakan coba lagi.");

      const blob = await response.blob();
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const url = URL.createObjectURL(blob);
      const filename = `Laporan-Redistribusi-${commodity}-${postur}-${pembaca}.pdf`;
      downloadUrlRef.current = url;
      setDownloadNotice({ url, filename });
      triggerDownload(url, filename);
    } catch (downloadError) {
      setReportError(downloadError instanceof Error ? downloadError.message : "Laporan belum berhasil diunduh.");
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-[1600px] mx-auto font-sans pb-12 text-slate-800"
    >
      {/* ================= HEADER & CONTROLS SECTION ================= */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#065F46] tracking-tight">Optimasi Redistribusi Pangan</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Rekomendasi pergerakan logistik domestik dari wilayah surplus menuju wilayah defisit secara efisien.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto lg:mt-1">
          {(["pemerintah", "pedagang"] as const).map((pembaca) => (
            <button
              type="button"
              key={pembaca}
              onClick={() => downloadReport(pembaca)}
              disabled={downloadingReport !== null}
              className="h-10 inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 shadow-xs transition-all disabled:cursor-wait disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingReport === pembaca
                ? "Menyiapkan laporan…"
                : `Laporan ${pembaca === "pemerintah" ? "Pemerintah" : "Pedagang"}`}
            </button>
          ))}
        </div>
      </div>

      {reportError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {reportError}
        </div>
      )}

      <AnimatePresence>
        {downloadNotice && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            role="status"
            className="fixed bottom-6 right-6 z-[100] w-[min(24rem,calc(100vw-3rem))] rounded-xl border border-emerald-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006c4a]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">Dokumen telah terunduh</p>
                <button
                  type="button"
                  onClick={() => triggerDownload(downloadNotice.url, downloadNotice.filename)}
                  className="mt-1 text-left text-xs font-semibold leading-5 text-[#006c4a] underline decoration-[#006c4a]/30 underline-offset-2 hover:decoration-[#006c4a]"
                >
                  Klik di sini jika dokumen belum terunduh otomatis.
                </button>
              </div>
              <button
                type="button"
                onClick={closeDownloadNotice}
                aria-label="Tutup notifikasi unduhan"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= LOAD FAILURE (NOT AN EMPTY PLAN) ================= */}
      {gagalMuat ? (
        <motion.div
          variants={itemVariants}
          className="bg-white border border-rose-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-2 border-b border-rose-100 pb-4 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-lg font-bold text-slate-800">Rencana redistribusi gagal dimuat</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Permintaan ke <span className="font-mono">/api/redistribution</span> untuk{" "}
            <span className="font-bold">{currentCommodityName}</span> pada postur{" "}
            <span className="font-bold">{POSTUR_LABEL[postur].nama}</span> tidak berhasil:{" "}
            <span className="font-bold text-rose-700">{gagalMuat}</span>
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            Halaman ini sengaja tidak menampilkan angka apa pun sampai jawaban diterima.
            Nol rute, nol ton, dan peta kosong akan terbaca sebagai hasil perhitungan,
            padahal tidak ada perhitungan yang sampai ke sini.
          </p>
        </motion.div>
      ) : (
        <>
        <motion.div id="ringkasan-rencana" variants={itemVariants} className="relative scroll-mt-24 grid grid-cols-1 overflow-visible rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-[1.15fr_1.45fr_repeat(3,minmax(0,0.8fr))]">
          <div className={`relative min-w-0 p-4 ${isCommOpen ? "z-50" : "z-auto"}`} ref={commDropdownRef}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Komoditas dipilih</p>
            <button
              type="button"
              onClick={() => setIsCommOpen(!isCommOpen)}
              aria-expanded={isCommOpen}
              className="mt-1 flex w-full items-center justify-between gap-3 text-left text-base font-bold text-slate-800 outline-none hover:text-[#006c4a] focus-visible:ring-2 focus-visible:ring-[#006c4a]/30"
            >
              <span className="truncate">{currentCommodityName}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            <AnimatePresence>
              {isCommOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute left-4 right-4 top-full z-50 mt-1 space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input type="text" placeholder="Cari komoditas..." value={searchComm} onChange={(e) => setSearchComm(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-[#006c4a]" />
                  </div>
                  <div className="max-h-48 space-y-0.5 overflow-y-auto">
                    {filteredCommodities.map((c) => (
                      <button type="button" key={c.id} onClick={() => { setCommodity(c.id); setSelectedProducer(null); setIsCommOpen(false); setSearchComm(""); }} className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${c.id === commodity ? "bg-emerald-50 text-[#006c4a]" : "text-slate-600 hover:bg-slate-50"}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="min-w-0 border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe prediksi</p>
            <div className="mt-1">
              <PostureSwitch value={postur} onChange={setPostur} compact />
            </div>
          </div>
          {[
            ["Wilayah asal", `${surplusProvinces.length} wilayah`],
            ["Wilayah tujuan", `${deficitProvinces.length} wilayah`],
            ["Total saran rute", `${routes.length} alokasi`],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 border-t border-slate-200 p-4 sm:border-l sm:border-t-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              {loading ? <Skeleton className="mt-2 h-6 w-28" /> : <p className="mt-1 truncate text-base font-bold text-slate-800" title={value}>{value}</p>}
            </div>
          ))}
        </motion.div>

        {/* ================= NARRATION & SECTION NAVIGATION ================= */}
        <StickyRedistributionGuide>
          <Narasi teks={narasiRedistribusi(commodity, postur)} />
          <RedistributionSectionNavigator />
        </StickyRedistributionGuide>

        {/* ================= TARGET MONTH WINDOW BANNER ================= */}
        {loading ? (
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        ) : summary ? (() => {
          const j = jendelaWaktu(summary.bulanPrediksi, new Date());
          return (
            <div className={j.sudahLewat ? "border-l-2 border-red-500 py-2 pl-3" : "border-l-2 border-slate-300 py-2 pl-3"}>
              <p className="text-sm text-slate-700">
                Rencana untuk <strong>{j.labelBulan}</strong>
                {j.sudahLewat
                  ? ` — jendela tindakan sudah lewat ${Math.abs(j.sisaHari)} hari lalu.`
                  : ` — sisa ${j.sisaHari} hari sampai tenggat. Tenggatnya awal ${j.labelBulan}, bukan akhirnya.`}
              </p>
            </div>
          );
        })() : null}

        {/* ================= SPATIAL ALLOCATION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <motion.div id="peta-alokasi" ref={mapSectionRef} variants={itemVariants} className="scroll-mt-24 lg:col-span-8 bg-white border border-slate-200/80 rounded-xl p-6 flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <div className="w-2 h-5 bg-[#006c4a] rounded-full" />
              <h3 className="text-lg font-bold text-slate-800">Peta Aliran Distribusi Logistik</h3>
            </div>
            <div className="w-full flex-1 flex items-center justify-center">
              <IndonesiaMap
                provinces={provinces}
                routes={routes}
                loading={loading}
                selectedProvince={selectedProducer}
                onProvinceSelect={setSelectedProducer}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Layers3 className="w-4 h-4 text-[#006c4a]" />
              <h3 className="text-lg font-bold text-slate-800">Wilayah Asal (Surplus)</h3>
              <InfoTooltip text="Bukan kelebihan produksi yang terukur—data produksi per provinsi belum tersedia. Wilayah ini dipilih sebagai kandidat asal karena harga komoditasnya berada di bawah median nasional dan tidak diprediksi melonjak." />
            </div>
            <p className="mb-3 text-[11px] text-slate-500">Pilih wilayah untuk menandainya pada peta.</p>
            <SurplusPanel provinces={surplusProvinces} selectedProvince={selectedProducer} onSelect={selectProducer} />
          </motion.div>
        </div>

        {/* ================= ROUTE TABLE ================= */}
        <div>
          <motion.div id="matriks-rute" variants={itemVariants} className="scroll-mt-24 bg-white border border-slate-200/80 rounded-xl p-6 min-w-0">
            <div className="border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-[#006c4a]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-slate-800">Matriks Rute Distribusi Direkomendasikan</h3>
                  <InfoTooltip text="Setiap baris merupakan usulan pengiriman dari provinsi asal ke tujuan. Persentase pasar menunjukkan perbandingan kiriman dengan konsumsi bulanan tujuan. Menekan harga menunjukkan estimasi poin persentase kenaikan yang dapat ditahan. Dasar takaran menjelaskan apakah volume berasal dari kebutuhan terukur atau batas asumsi. Biaya memuat ongkos angkut dan jarak rute." />
                </div>
                <p className="mt-1 text-xs text-slate-500">Biaya dihitung otomatis berdasarkan formula komparatif Rp2.500/ton/km.</p>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <RouteTable
                routes={routes}
                loading={loading}
                status={summary?.status ?? null}
                gagalMuat={gagalMuat}
                postur={postur}
                komoditas={currentCommodityName}
                commodityId={commodity}
              />
            </div>
          </motion.div>
        </div>

        {/* ================= ROW 2.5: KESENJANGAN IKP (FULL WIDTH, OWN ROW) =================
         *  Halaman ini pernah mengalami regresi tata letak ketika sebuah panel
         *  disisipkan ke baris yang sudah terisi dan memotong tabel rute di
         *  atas -- panel ini karena itu diberi barisnya sendiri, bukan
         *  disisipkan ke grid Row 2. */}
        <motion.div id="kesenjangan-ikp" variants={itemVariants} className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="h-5 w-2 rounded-full bg-[#006c4a]" />
            <h3 className="text-lg font-bold text-slate-800">Kesenjangan Antarkelompok IKP</h3>
            <InfoTooltip text="Kelompok bawah, tengah, dan atas merupakan pembagian atas 38 provinsi yang memiliki skor IKP Bapanas 2025, bukan hanya 34 provinsi yang harganya dapat dimodelkan. Jumlah kecil dapat menunjukkan kelompok yang kecil atau keterbatasan jangkauan model." />
          </div>
          <KesenjanganPanel routes={routes} loading={loading} />
        </motion.div>

        {/* ================= ROW 2.6: LANSKAP KOMODITAS (FULL WIDTH, OWN ROW) ================= */}
        <motion.div id="lanskap-komoditas" variants={itemVariants} className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="h-5 w-2 rounded-full bg-[#006c4a]" />
            <h3 className="text-lg font-bold text-slate-800">Lanskap Komoditas</h3>
          </div>
          <LanskapPanel provinsiAwal={routes[0]?.to} />
        </motion.div>

        {/* ================= ROW 2.7: MUATAN BALIK (FULL WIDTH, OWN ROW) =================
         *  Barisnya sendiri, sama seperti Row 2.5/2.6 di atas -- lihat catatan
         *  di kedua baris itu soal regresi tata letak yang pernah terjadi
         *  ketika sebuah panel disisipkan ke baris yang sudah terisi. */}
        <motion.div id="muatan-balik" variants={itemVariants} className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="h-5 w-2 rounded-full bg-[#006c4a]" />
            <h3 className="text-lg font-bold text-slate-800">Muatan Balik</h3>
          </div>
          <p className="mb-3 text-sm font-medium leading-6 text-slate-500">
            Diagnosis ini mencakup seluruh rencana postur {POSTUR_LABEL[postur].nama} lintas
            enam komoditas yang kami modelkan, bukan hanya rute {currentCommodityName} yang
            sedang ditampilkan di atas.
          </p>
          <MuatanBalikPanel postur={postur} />
        </motion.div>

        {/* ================= ROW 2.8: JALUR TINDAKAN (FULL WIDTH, OWN ROW) ================= */}
        <motion.div id="jalur-tindakan" variants={itemVariants} className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="h-5 w-2 rounded-full bg-[#006c4a]" />
            <h3 className="text-lg font-bold text-slate-800">Jalur Tindakan</h3>
          </div>
          <TindakanPanel postur={postur} komoditas={currentCommodityName} nRute={routes.length} loading={loading} />
        </motion.div>
        </>
      )}

      {/* ================= ROW 3: HONESTY LEDGER (FULL WIDTH) ================= */}
      <motion.div id="asal-usul-angka" variants={itemVariants} className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <div className="h-5 w-2 rounded-full bg-[#006c4a]" />
          <h3 className="text-lg font-bold text-slate-800">Asal-usul Angka</h3>
          <InfoTooltip text="Daftar ini menyebut setiap masukan perhitungan beserta sumber dan tahunnya agar dapat diperiksa, sekaligus membedakan angka yang diukur, diturunkan, dan ditetapkan melalui asumsi." />
        </div>
        <div>
          <BukuBesarPanel />
        </div>
      </motion.div>

      <motion.div id="metode-alokasi" variants={itemVariants} className="scroll-mt-24">
        <MethodPanel sources={surplusProvinces.length} destinations={deficitProvinces.length} />
      </motion.div>
    </motion.div>
  );
}

export default function RedistribusiPage() {
  return <Suspense fallback={<div className="text-sm text-slate-500">Memuat data redistribusi…</div>}><RedistribusiContent /></Suspense>;
}
