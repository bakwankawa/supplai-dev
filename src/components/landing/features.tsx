"use client";

import { LandingText } from "./language";


import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart2, Map, GitCommit, Bell, ArrowUpRight, ShieldAlert } from "lucide-react";

const featuresData = [
    {
        id: "dashboard",
        tabLabel: "Prediction",
        title: "Dashboard Analitik & Prediksi Harga Pangan",
        desc: "Antarmuka interaktif yang memproyeksikan pergerakan harga komoditas pangan pokok dalam rentang 1–3 bulan ke depan sebagai basis kebijakan strategis.",
        icon: BarChart2,
        mockup: (
            <div className="w-full h-[380px] bg-white p-3 sm:p-6 rounded-2xl border border-brand-border flex flex-col justify-between shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold text-brand-primary uppercase"><LandingText text="Analytics View" /></span>
                        <h4 className="text-xs sm:text-sm font-bold text-brand-textMain"><LandingText text="Tren Harga Beras Premium (Nasional)" /></h4>
                    </div>
                    <span className="text-[10px] font-mono bg-brand-bgSubtle px-2 py-1 rounded-md text-brand-textMuted border border-brand-border font-semibold shrink-0"><LandingText text="14 Days Window" /></span>
                </div>

                {/* Metrik Grid Atas */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Harga Hari Ini", val: "Rp14.500", diff: "0.0%", color: "text-brand-textMuted" },
                        { label: "Prediksi H+7", val: "Rp14.850", diff: "+2.4%", color: "text-amber-600" },
                        { label: "Prediksi H+14", val: "Rp15.200", diff: "+4.8%", color: "text-rose-600" }
                    ].map((card) => (
                        <div key={card.label} className="p-2 sm:p-3 bg-brand-bgSubtle rounded-xl border border-brand-border space-y-0.5">
                            <span className="text-[10px] text-brand-textMuted font-medium block truncate"><LandingText text={card.label} /></span>
                            <p className="text-xs sm:text-base font-black text-brand-textMain">{card.val}</p>
                            <span className={`text-[9px] font-mono font-bold ${card.color}`}>{card.diff}</span>
                        </div>
                    ))}
                </div>

                {/* Grafik SVG */}
                <div className="h-28 bg-brand-bgSubtle/40 rounded-xl border border-brand-border p-3 relative flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-40">
                        <div className="w-full border-b border-brand-border" />
                        <div className="w-full border-b border-brand-border" />
                        <div className="w-full border-b border-brand-border" />
                    </div>

                    <div className="w-full h-full relative z-10">
                        <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                            <motion.path
                                d="M 0 60 Q 60 55 120 52 T 250 45"
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                            <circle cx="250" cy="45" r="4" fill="#2563eb" className="animate-pulse" />
                            <motion.path
                                d="M 250 45 Q 310 40 370 36 T 500 30"
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="2.5"
                                strokeDasharray="4 4"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                            />
                        </svg>

                        <div className="absolute left-[40%] top-[5%] bg-brand-card border border-brand-border shadow-md rounded-lg px-2 py-1 text-[9px] font-mono font-bold text-brand-textMain pointer-events-none flex flex-col">
                            <span className="text-brand-textMuted text-[8px]"><LandingText text="16/03 (Hari Ini)" /></span>
                            <span className="text-blue-600"><LandingText text="● Aktual: Rp14.500" /></span>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-1 text-[9px] font-mono font-bold text-brand-textMuted/60 pt-1 border-t border-brand-border relative z-10">
                        <span>06/03</span>
                        <span>12/03</span>
                        <span>16/03</span>
                        <span>22/03</span>
                        <span>30/03</span>
                    </div>
                </div>

                {/* Legenda Grafik */}
                <div className="flex justify-center items-center gap-6 font-mono text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                        <span><LandingText text="Harga Aktual" /></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-orange-500">
                        <span className="w-3 h-0.5 bg-orange-500 border-t border-dashed inline-block" />
                        <span><LandingText text="Harga Prediksi" /></span>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "heatmap",
        tabLabel: "Heatmap",
        title: "Peta Disparitas & Pemetaan Spasial Makro",
        desc: "Pemetaan geografis riil untuk memantau wilayah mana saja yang sedang mengalami lonjakan harga ekstrem (merah) atau kelebihan pasokan (hijau).",
        icon: Map,
        mockup: (
            <div className="w-full h-[380px] bg-white p-3 sm:p-5 rounded-2xl border border-brand-border flex flex-col justify-between shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-brand-primary rounded-full" />
                        <h4 className="text-xs font-bold text-brand-textMain"><LandingText text="National Supply Density Heatmap" /></h4>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping" /> <LandingText text="Live Sync" /> </span>
                </div>

                <div className="relative w-full h-[220px] rounded-xl border border-brand-border overflow-hidden bg-brand-bgSubtle flex items-center justify-center">
                    <img
                        src="/indonesia.svg"
                        alt="Indonesia"
                        className="w-full h-auto opacity-50 pointer-events-none select-none object-contain"
                        draggable={false}
                    />

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 792.5 316.7" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <radialGradient id="landing-heat-red" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                                <stop offset="35%" stopColor="rgba(249, 115, 22, 0.45)" />
                                <stop offset="70%" stopColor="rgba(234, 179, 8, 0.15)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                            </radialGradient>
                            <radialGradient id="landing-heat-green" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.7)" />
                                <stop offset="45%" stopColor="rgba(52, 211, 153, 0.3)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                            </radialGradient>
                            <radialGradient id="landing-heat-blue" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
                                <stop offset="50%" stopColor="rgba(147, 197, 253, 0.2)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                            </radialGradient>
                        </defs>

                        <circle cx="310" cy="245" r="38" fill="url(#landing-heat-red)" />
                        <circle cx="255" cy="237" r="32" fill="url(#landing-heat-red)" />
                        <circle cx="290" cy="155" r="40" fill="url(#landing-heat-green)" />
                        <circle cx="110" cy="130" r="35" fill="url(#landing-heat-green)" />
                        <circle cx="155" cy="175" r="28" fill="url(#landing-heat-green)" />
                        <circle cx="450" cy="165" r="30" fill="url(#landing-heat-blue)" />
                        <circle cx="350" cy="260" r="22" fill="url(#landing-heat-blue)" />
                        <circle cx="650" cy="190" r="35" fill="url(#landing-heat-blue)" />

                        {[
                            { x: 60, y: 72, label: "Aceh" },
                            { x: 95, y: 108, label: "Medan" },
                            { x: 220, y: 232, label: "Jakarta" },
                            { x: 265, y: 242, label: "Bandung" },
                            { x: 310, y: 250, label: "Surabaya" },
                            { x: 290, y: 140, label: "Pontianak" },
                            { x: 370, y: 135, label: "Samarinda" },
                            { x: 450, y: 150, label: "Manado" },
                            { x: 650, y: 195, label: "Papua" },
                        ].map((p) => (
                            <g key={p.label}>
                                <circle cx={p.x} cy={p.y} r="2.5" fill="#0f172a" />
                                <text x={p.x + 5} y={p.y + 3} fontSize="7" fontWeight="600" fill="#0f172a" style={{ textShadow: "0 0 3px white" }}><LandingText text={p.label} /></text>
                            </g>
                        ))}
                    </svg>
                </div>

                <div className="flex items-center justify-between bg-brand-bgSubtle border border-brand-border rounded-xl px-4 py-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold font-mono text-brand-textMuted">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span><LandingText text="Surplus" /></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span><LandingText text="Stabil" /></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span><LandingText text="Defisit" /></span>
                        </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-brand-textMuted"><LandingText text="34 Provinsi Terpantau" /></span>
                </div>
            </div>
        )
    },
    {
        id: "redistribution",
        tabLabel: "Redistribution",
        title: "Algoritma Pencocokan Rute Logistik Pintar",
        desc: "Menghitung volume ideal alokasi logistik pangan dari daerah surplus menuju wilayah defisit guna menekan biaya angkut serendah mungkin.",
        icon: GitCommit,
        mockup: (
            <div className="w-full h-[380px] bg-white p-3 sm:p-6 rounded-2xl border border-brand-border flex flex-col justify-between shadow-sm font-mono text-xs text-brand-textMuted">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
                    <span className="font-bold text-brand-textMain"><LandingText text="Matchmaking Optimization Log" /></span>
                    <span className="text-brand-primary font-bold"><LandingText text="Linear Solver OK" /></span>
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div className="p-3 bg-brand-bgSubtle rounded-lg border border-brand-border flex flex-wrap justify-between items-center gap-1">
                        <span className="text-brand-textMain font-semibold"><LandingText text="Origin Supply:" /></span>
                        <span><LandingText text="Subang Rice Hub (150 Tons)" /></span>
                    </div>
                    <div className="p-3 bg-brand-bgSubtle rounded-lg border border-brand-border flex flex-wrap justify-between items-center gap-1">
                        <span className="text-brand-textMain font-semibold"><LandingText text="Target Demand:" /></span>
                        <span><LandingText text="Bandung Core Market (120 Tons)" /></span>
                    </div>
                    <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex flex-wrap justify-between items-center gap-1 text-brand-accentDark font-bold">
                        <span><LandingText text="Optimized Cost:" /></span>
                        <span><LandingText text="Saved ~18.4% vs Manual Route" /></span>
                    </div>
                </div>
                <div className="pt-2 border-t border-brand-border flex flex-wrap justify-between items-center gap-1 text-[10px]">
                    <span><LandingText text="Status: Route Computed" /></span>
                    <span className="text-emerald-600 font-bold"><LandingText text="● Operational" /></span>
                </div>
            </div>
        )
    },
    {
        id: "ews",
        tabLabel: "Alerts",
        title: "Early Warning System & Broadcast Alert Center",
        desc: "Pusat peringatan otomatis yang langsung mengirimkan alarm push-notification sesaat sebelum harga pasar melampaui ambang batas aman nasional.",
        icon: Bell,
        mockup: (
            <div className="w-full h-[380px] bg-white p-3 sm:p-6 rounded-2xl border border-brand-border flex flex-col justify-between shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
                    <h4 className="text-xs font-bold text-brand-textMain"><LandingText text="Alert Broadcast Center" /></h4>
                    <span className="text-[10px] font-mono bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-md font-bold"><LandingText text="CRITICAL RISK" /></span>
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div className="border border-rose-100 bg-rose-50/30 rounded-xl p-4 flex gap-4 items-start">
                        <div className="p-2 rounded-lg bg-rose-500 text-white flex-shrink-0">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 text-xs">
                            <p className="font-bold text-brand-textMain"><LandingText text="Anomali Lonjakan Harga Terdeteksi" /></p>
                            <p className="text-brand-textMuted leading-relaxed"><LandingText text="Komoditas Bawang Merah di Kluster Wilayah Cirebon melampaui HAP sebesar 14.2%." /></p>
                        </div>
                    </div>
                    <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-3 flex gap-3 items-start">
                        <div className="p-1.5 rounded-lg bg-amber-500 text-white flex-shrink-0">
                            <ShieldAlert className="w-3.5 h-3.5" />
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                            <p className="font-bold text-brand-textMain"><LandingText text="Warning Stok Beras" /></p>
                            <p className="text-brand-textMuted leading-relaxed"><LandingText text="Proyeksi penurunan stok -8% H+30 di NTT." /></p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end text-[11px] font-mono font-bold pt-2 border-t border-brand-border">
                    <span className="px-2.5 py-1 bg-brand-bgSubtle rounded border border-brand-border text-brand-textMuted"><LandingText text="Ignore" /></span>
                    <span className="px-2.5 py-1 bg-brand-primary rounded text-white shadow-sm cursor-pointer flex items-center gap-1"> <LandingText text="Dispatch TPID Action" /> <ArrowUpRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        )
    }
];

export function FeaturesSection() {
    const [activeTab, setActiveTab] = useState(featuresData[0]);

    return (
        <section id="features" className="py-24 px-6 md:px-12 bg-brand-card border-t border-brand-border relative">
            <div className="max-w-7xl mx-auto space-y-16 flex flex-col items-center">

                {/* Header Text — Dikembalikan ke Tengah (Center) */}
                <div className="text-center max-w-3xl space-y-3">
                    <span className="font-mono text-xs font-bold tracking-widest text-brand-primary uppercase"> <LandingText text="Our Features" /> </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-textMain"> <LandingText text="SupplAi in Action" /> </h2>
                    <p className="text-brand-textMuted text-base font-normal"> <LandingText text="Lihat bagaimana SupplAi mempermudah pengawasan, analisis, dan eksekusi ketahanan pangan." /> </p>
                </div>

                {/* 1. HORIZONTAL CAPSULE TAB BAR */}
                <div className="bg-brand-bgSubtle/80 border border-brand-border p-1.5 rounded-2xl grid grid-cols-2 sm:inline-flex sm:flex-wrap justify-center items-center gap-1 shadow-inner max-w-full w-fit">
                    {featuresData.map((tab) => {
                        const isActive = activeTab.id === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-3 py-2.5 sm:px-4 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer w-auto text-center ${isActive ? "text-brand-textMain" : "text-brand-textMuted/60 hover:text-brand-textMain"
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeHorizontalTab"
                                        className="absolute inset-0 bg-white border border-brand-border/40 shadow-sm rounded-xl -z-0"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <tab.icon className={`w-3.5 h-3.5 ${isActive ? "text-brand-primary" : ""}`} />
                                    <LandingText text={tab.tabLabel} />
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 2. PREVIEW CONTAINER */}
                <div className="w-full bg-brand-bg/40 border border-brand-border rounded-3xl p-6 md:p-10 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-6xl mt-6 relative overflow-hidden">

                    {/* Detail Teks Sebelah Kiri */}
                    <div className="lg:col-span-5 space-y-5 text-left">
                        <div className="inline-flex p-2.5 rounded-xl bg-brand-card border border-brand-border text-brand-primary shadow-sm">
                            <activeTab.icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black tracking-tight text-brand-textMain">
                                <LandingText text={activeTab.title} />
                            </h3>
                            <p className="text-brand-textMuted text-sm font-normal leading-relaxed">
                                <LandingText text={activeTab.desc} />
                            </p>
                        </div>
                    </div>

                    {/* Mini Version Dashboard Sebelah Kanan (Ukuran Konsisten h-[380px]) */}
                    <div className="lg:col-span-7 w-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent blur-3xl pointer-events-none" />

                        <div className="w-full relative z-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab.id}
                                    initial={{ opacity: 0, scale: 0.97, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.97, y: -15 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="w-full"
                                >
                                    {activeTab.mockup}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}