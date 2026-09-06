"use client";

import { LandingText } from "./language";


import Image from "next/image";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";

export function ContactUsSection() {
  return (
    <section id="contact-us" className="pb-24 pt-4 px-6 md:px-12 bg-brand-bg font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* BANNER UTAMA DENGAN ELEMEN GROUP & OVERFLOW-HIDDEN */}
        <div className="relative w-full rounded-3xl overflow-hidden border border-brand-border shadow-xl min-h-[340px] md:min-h-[380px] flex items-center p-8 md:p-16 lg:p-20 group bg-brand-bgSubtle">
          
          {/* DIV GAMBAR KHUSUS UNTUK EFEK LITTLE ZOOM SAAT HOVER */}
          <Image
            src="/images/contact-us.png"
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Layer Overlay Gradasi Warna Ungu Langit Premium */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#dcd6f7]/95 via-[#f4eeff]/85 to-transparent mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-purple-500/10 pointer-events-none" />

          {/* KONTEN TEKS & CTA BUTTON */}
          <div className="relative z-10 max-w-2xl space-y-6 flex flex-col items-start text-left">
            <div className="space-y-3">
              <span className="font-mono text-xs font-black tracking-widest text-[#5c3db5] uppercase"> <LandingText text="CONTACT US" /> </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#2a1b54] tracking-tight leading-tight"> <LandingText text="Anda tidak bisa mendikte pasar." /><br />
                <span className="text-[#10B981]"><LandingText text="Namun Anda bisa memprediksinya." /></span>
              </h2>
              <p className="text-[#5b4d82] text-sm md:text-base font-medium max-w-xl leading-relaxed"> <LandingText text="Hubungi pusat koordinasi SupplAi untuk demonstrasi integrasi sistem data, kemitraan TPID daerah, atau uji coba platform mitigasi intervensi logistik." /> </p>
            </div>

            {/* Tombol Aksi Catchy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="pt-2"
            >
              <a href="https://wa.me/6281995992282" target="_blank" rel="noopener noreferrer">
                <motion.button
                  whileHover={{ scale: 1.03, backgroundColor: "#0e9f6e" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2.5 bg-[#10B981] text-white font-bold px-6 py-3.5 rounded-xl text-xs shadow-md shadow-emerald-900/20 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> <LandingText text="Hubungi via WhatsApp" /> </motion.button>
              </a>
            </motion.div>
          </div>

        </div>

      </div>
    </section>
  );
}