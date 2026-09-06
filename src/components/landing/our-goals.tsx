"use client";

import { LandingText } from "./language";


import { motion } from "motion/react";
import { Gauge, BarChart3, Handshake } from "lucide-react";

export function OurGoalsSection() {
    return (
        <section id="our-goals" className="py-24 px-6 md:px-12 bg-brand-bg font-sans text-brand-textMain">
            <div className="max-w-7xl mx-auto space-y-32">

                {/* ================================================================= */}
                {/* BAGIAN A: OUR STRATEGIC VISION (3 CARDS HORIZONTAL)               */}
                {/* ================================================================= */}
                <div className="space-y-12">
                    {/* Header Konten */}
                    <div className="max-w-4xl space-y-3 relative">
                        <span className="font-mono text-xs font-bold tracking-widest text-brand-accentDark uppercase"> <LandingText text="OUR GOALS" /> </span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight"> <LandingText text="Mengubah pendekatan pengendalian inflasi pangan" /> <span className="text-brand-primary"><LandingText text="reaktif menjadi prediktif" /></span>.
                        </h2>
                    </div>

                    {/* Grid 3 Kartu Visi */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                        {/* Kartu 1: Efisiensi Birokrasi */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="bg-brand-card border border-brand-border rounded-2xl p-8 flex flex-col justify-between shadow-sm min-h-[300px]"
                        >
                            <div className="space-y-6">
                                <div className="w-12 h-12 rounded-xl bg-brand-bgSubtle flex items-center justify-center text-brand-accentDark">
                                    <Gauge className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <span className="font-mono text-xs font-bold tracking-wider text-brand-textMuted uppercase block"> <LandingText text="INSIGHT PREDIKTIF" /> </span>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black tracking-tight">1-3</span>
                                        <span className="text-xl font-medium text-brand-textMuted"><LandingText text="Bulan" /></span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-brand-border pt-6 mt-6">
                                <p className="text-brand-textMuted text-sm font-normal leading-relaxed"> <LandingText text="Prediksi harga komoditas hingga 90 Hari ke Depan untuk mencegah inflasi pangan." /> </p>
                            </div>
                        </motion.div>

                        {/* Kartu 2: Akurasi Prediksi */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="bg-brand-card border border-brand-border rounded-2xl p-8 flex flex-col justify-between shadow-sm min-h-[300px]"
                        >
                            <div className="space-y-6">
                                <div className="w-12 h-12 rounded-xl bg-brand-bgSubtle flex items-center justify-center text-brand-accentDark">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <span className="font-mono text-xs font-bold tracking-wider text-brand-textMuted uppercase block"> <LandingText text="AKURASI PREDIKSI" /> </span>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black tracking-tight"><LandingText text="&lt; 10%" /></span>
                                        <span className="text-xl font-medium text-brand-textMuted"><LandingText text="Error" /></span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-brand-border pt-6 mt-6">
                                <p className="text-brand-textMuted text-sm font-normal leading-relaxed"> <LandingText text="Prediksi harga dan stok akurat di seluruh 514 kabupaten/kota di Indonesia." /> </p>
                            </div>
                        </motion.div>

                        {/* Kartu 3: Kemitraan Strategis */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="bg-brand-card border border-brand-border rounded-2xl p-8 flex flex-col justify-between shadow-sm min-h-[300px]"
                        >
                            <div className="space-y-6">
                                <div className="w-12 h-12 rounded-xl bg-brand-bgSubtle flex items-center justify-center text-brand-accentDark">
                                    <Handshake className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <span className="font-mono text-xs font-bold tracking-wider text-brand-textMuted uppercase block"> <LandingText text="KEMITRAAN STRATEGIS" /> </span>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-5xl font-black tracking-tight">335</span>
                                        <span className="text-xl font-medium text-brand-textMuted"><LandingText text="Triliun" /></span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-brand-border pt-6 mt-6">
                                <p className="text-brand-textMuted text-sm font-normal leading-relaxed"> <LandingText text="Target potensi serapan melalui 500+ satuan TPID nasional." /> </p>
                            </div>
                        </motion.div>

                    </div>

                </div>

            </div>
        </section>
    );
}