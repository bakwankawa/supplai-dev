"use client";

import { LandingText } from "./language";


import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "motion/react";
import { Database, Zap, Rocket, CheckCircle2 } from "lucide-react";

const modulesData = [
  {
    id: "predict",
    step: "INPUT",
    stepLabel: "Integrasi Data Multi-Sektoral",
    title: "SupplAi Predict",
    description: "Mengintegrasikan data PIHPS BI, Panel Bapanas, cuaca BMKG, dan data produksi Kementan untuk memproyeksikan pergerakan harga pokok 1–3 bulan ke depan.",
    icon: Database,
    imageBg: "from-brand-primary/10 to-emerald-500/5",
    mockupContent: (
      <div className="w-full h-full flex flex-col justify-between p-6 text-brand-textMuted font-mono text-xs bg-brand-card">
        <div className="flex items-center justify-between border-b border-brand-border pb-2">
          <span className="font-semibold text-brand-textMain"><LandingText text="LightGBM + LSTM Engine" /></span>
          <span className="text-brand-primary font-bold"><LandingText text="● Active" /></span>
        </div>
        <div className="space-y-2 my-auto">
          <p className="text-brand-textMuted/50"><LandingText text="// Menghitung tren 1–3 bulan ke depan" /></p>
          <p className="text-cyan-700 font-semibold"><LandingText text="Executing: model.predict(target_date)" /></p>
          <div className="h-16 w-full bg-brand-bgSubtle rounded border border-brand-border p-2 flex items-end gap-1">
            <div className="w-full bg-brand-primary/30 h-1/3 rounded-t"></div>
            <div className="w-full bg-brand-primary/50 h-1/2 rounded-t"></div>
            <div className="w-full bg-brand-primary/70 h-3/4 rounded-t"></div>
            <div className="w-full bg-brand-primary h-full rounded-t animate-pulse"></div>
          </div>
        </div>
        <div className="text-right text-brand-primary font-bold"><LandingText text="Akurasi: 95.2%" /></div>
      </div>
    )
  },
  {
    id: "match",
    step: "PROSES",
    stepLabel: "AI & Matchmaking Engine",
    title: "SupplAi Match",
    description: "Algoritma optimasi matematis menganalisis fluktuasi harga secara real-time dan otomatis memetakan titik pasokan surplus untuk dialirkan ke wilayah defisit.",
    icon: Zap,
    imageBg: "from-teal-500/10 to-brand-primary/5",
    mockupContent: (
      <div className="w-full h-full flex flex-col justify-between p-6 text-brand-textMuted font-mono text-xs bg-brand-card">
        <div className="flex items-center justify-between border-b border-brand-border pb-2">
          <span className="font-semibold text-brand-textMain"><LandingText text="Optimasi Jalur Distribusi" /></span>
        </div>
        <div className="space-y-3 my-auto">
          <div className="flex items-center justify-between bg-brand-primary/10 border border-brand-primary/20 p-2 rounded-xl">
            <span className="text-brand-accentDark font-bold"><LandingText text="Wilayah Surplus" /></span>
            <span className="font-bold text-brand-textMain"><LandingText text="Kediri (+12T)" /></span>
          </div>
          <div className="flex justify-center text-brand-textMuted/40 text-[10px]"><LandingText text="↓↓ Proses Alokasi Jalur ↓↓" /></div>
          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
            <span className="text-rose-600 font-bold"><LandingText text="Wilayah Defisit" /></span>
            <span className="font-bold text-brand-textMain"><LandingText text="Surabaya (-8T)" /></span>
          </div>
        </div>
        <div className="text-center text-brand-accentDark font-bold"><LandingText text="Biaya Logistik minimum didapatkan" /></div>
      </div>
    )
  },
  {
    id: "agent",
    step: "OUTPUT",
    stepLabel: "Aksi Cepat & Peringatan",
    title: "SupplAi Agent",
    description: "Sistem otomatisasi yang menyajikan peta disparitas spasial nasional serta mengirimkan alarm Push-Alert darurat langsung ke 500 instansi TPID daerah.",
    icon: Rocket,
    imageBg: "from-emerald-500/10 to-cyan-500/5",
    mockupContent: (
      <div className="w-full h-full flex flex-col justify-between p-6 text-brand-textMuted font-mono text-xs bg-brand-card">
        <div className="flex items-center justify-between border-b border-brand-border pb-2">
          <span className="font-semibold text-brand-textMain"><LandingText text="TPID AI Agent Report" /></span>
          <span className="bg-brand-primary text-[10px] px-1.5 py-0.5 rounded-md text-white font-sans font-bold"><LandingText text="Autonomous" /></span>
        </div>
        <div className="space-y-2 my-auto text-left w-full">
          <div className="p-2 bg-brand-bgSubtle rounded-xl border border-brand-border flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
            <span><LandingText text="Early Warning System Aktif" /></span>
          </div>
          <div className="p-2 bg-brand-bgSubtle rounded-xl border border-brand-border flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
            <span><LandingText text="Peta Disparitas Terdistribusi" /></span>
          </div>
        </div>
        <div className="text-xs text-brand-textMuted/60 italic text-left"><LandingText text="Notification broadcast completed successfully." /></div>
      </div>
    )
  }
];

export function ModulesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = modulesData[activeIndex];
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const isPlaying = isInView && pageVisible && !reducedMotion;

  const handleTabClick = (index: number) => setActiveIndex(index);

  return (
    <section ref={sectionRef} id="modules" className="w-full bg-brand-bg font-sans py-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Header Bersama */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-textMain"> <LandingText text="How we Works?" /> </h2>
          <p className="text-brand-textMuted text-base md:text-lg max-w-2xl mx-auto"> <LandingText text="Integrasi sistematis alur end-to-end dari input hulu hingga aksi hilir secara prediktif." /> </p>
        </div>

        {/* Grid Utama */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* KIRI: Wadah Visual/Mockup Dinamis */}
          <div className="lg:col-span-6 w-full aspect-[4/3] bg-brand-bgSubtle rounded-3xl border border-brand-border p-5 flex flex-col relative overflow-hidden shadow-sm">
            <div className={`absolute inset-0 bg-gradient-to-br ${activeTab.imageBg} opacity-100 transition-all duration-700`} />

            <div className="relative z-20 flex gap-1.5 pb-3">
              <div className="w-3 h-3 rounded-full bg-rose-400/40" />
              <div className="w-3 h-3 rounded-full bg-amber-400/40" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/40" />
            </div>

            <div className="relative z-10 w-full h-full bg-brand-card rounded-2xl border border-brand-border shadow-md overflow-hidden flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  {activeTab.mockupContent}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* KANAN: Menu Alur Langkah Input -> Proses -> Output */}
          <div className="lg:col-span-6 space-y-4 relative border-l border-brand-border/60 pl-6 ml-2 lg:ml-0">
            {modulesData.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = activeIndex === index;

              return (
                <div
                  key={item.id}
                  className="relative cursor-pointer group py-4 transition-all duration-300 select-none"
                  onClick={() => handleTabClick(index)}
                >
                  {/* CONTAINER UTAMA TRACK LINER ABU-ABU DI LOKASI GARIS AKTIF */}
                  {isActive && (
                    <div className="absolute left-[-26px] top-0 bottom-0 w-[3px] bg-brand-border rounded-full overflow-hidden">
                      {/* ANIMASI PROGRESS BAR HIJAU DARI ATAS KE BAWAH */}
                      <motion.div
                        className="w-full bg-brand-primary origin-top rounded-full"
                        key={`${activeIndex}-${isPlaying}`}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: isPlaying ? 1 : 0 }}
                        style={{ height: "100%" }}
                        transition={{ duration: isPlaying ? 5 : 0, ease: "linear" }}
                        onAnimationComplete={() => {
                          if (isPlaying) setActiveIndex((index) => (index + 1) % modulesData.length);
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Tahapan Label Arsitektur (JetBrains Mono) */}
                    <span className={`font-mono text-xs font-bold tracking-widest uppercase block ${isActive ? "text-brand-primary" : "text-brand-textMuted/40 group-hover:text-brand-textMuted/70"
                      }`}>
                      <LandingText text={item.step} /> : <LandingText text={item.stepLabel} />
                    </span>

                    <div className="flex items-center gap-3 mt-1">
                      <div className={`p-2 rounded-xl border transition-all duration-300 ${isActive
                        ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-sm"
                        : "bg-brand-card border-brand-border text-brand-textMuted group-hover:text-brand-textMain"
                        }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h3 className={`text-xl font-bold tracking-tight transition-colors duration-300 ${isActive ? "text-brand-textMain" : "text-brand-textMuted/50 group-hover:text-brand-textMain"
                        }`}>
                        <LandingText text={item.title} />
                      </h3>
                    </div>

                    <p className={`text-sm leading-relaxed transition-colors duration-300 max-w-xl ${isActive ? "text-brand-textMuted" : "text-brand-textMuted/30 group-hover:text-brand-textMuted/60"
                      }`}>
                      <LandingText text={item.description} />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
