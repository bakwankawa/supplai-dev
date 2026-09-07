"use client";

import { LandingText } from "./language";


import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqData = [
  {
    question: "Bagaimana SupplAi memproyeksikan harga pangan 1–3 bulan ke depan?",
    answer: "SupplAi menggabungkan LightGBM (gradient boosting) yang menangkap pola harga lintas wilayah dengan jaringan saraf tiruan LSTM (Long Short-Term Memory) yang mempelajari ritme pergerakan harga antarwaktu. Keduanya digabung memakai bobot per komoditas, lalu diuji melalui backtest rolling-origin pada data historis 2016–2026."
  },
  {
    question: "Dari mana saja sumber data yang diolah oleh sistem?",
    answer: "Tidak ada integrasi API dan tidak ada penarikan data otomatis. Harga berasal dari panel bulanan WFP Food Prices for Indonesia (HDX) — kompilasi BPS dan PIHPS/Bank Indonesia — yang kami olah sebagai berkas. Sisanya rujukan statis terbitan resmi, seluruhnya tercatat pada buku besar asal-usul angka di dasbor: konsumsi per kapita (Statistik Konsumsi Pangan 2024, Kementan Pusdatin, dari Susenas Maret BPS), populasi provinsi BPS, elastisitas harga dari tesis QUAIDS atas Susenas 2018, dan neraca ketersediaan dan kebutuhan nasional Bapanas. Prakiraan cuaca BMKG dan proyeksi panen Kementan tidak kami pakai."
  },
  {
    question: "Apakah rekomendasi rute distribusi SupplAi memperhitungkan biaya logistik?",
    answer: "Ya. Algoritma Matchmaking Engine kami menggunakan pendekatan Linear Programming untuk mencari efisiensi volume distribusi maksimal dengan total biaya angkut (navigasi logistik) paling minimum dari wilayah surplus ke wilayah defisit."
  },
  {
    question: "Bagaimana instansi menindaklanjuti peringatan harga?",
    answer: "Pengguna dapat meninjau komoditas dan wilayah yang melewati ambang pemantauan melalui pusat peringatan pada dasbor. Ringkasan analisis dan laporan prediksi mendukung verifikasi kondisi serta koordinasi tindak lanjut."
  }
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 md:px-12 bg-brand-bg font-sans text-brand-textMain border-t border-brand-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* SISI KIRI: Judul FAQ Statis */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight"> <LandingText text="Frequently asked questions" /> </h2>
          <p className="text-brand-textMuted text-sm font-normal max-w-xs"> <LandingText text="Punya pertanyaan mengenai sistem kerja otomatisasi SupplAi? Temukan jawabannya di sini." /> </p>
        </div>

        {/* SISI KANAN: Akordeon Interaktif */}
        <div className="lg:col-span-8 border-t border-brand-border/60 divide-y divide-brand-border/60">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-5">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left font-bold text-base md:text-lg hover:text-brand-primary transition-colors cursor-pointer group py-2"
                >
                  <span className="pr-4 tracking-tight"><LandingText text={item.question} /></span>
                  <div className="p-1.5 rounded-full bg-brand-bgSubtle border border-brand-border/50 text-brand-textMuted group-hover:text-brand-primary group-hover:border-brand-primary/30 flex-shrink-0 transition-all">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {/* Konten Jawaban Terbuka/Tertutup Lembut */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 pb-2 text-brand-textMuted text-sm leading-relaxed max-w-3xl font-normal">
                        <LandingText text={item.answer} />
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}