"use client";

import { LandingText, useLandingLanguage } from "./language";


import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, ArrowUp } from "lucide-react";

export function FooterSection() {
  const { t } = useLandingLanguage();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="bg-brand-bgSubtle border-t border-brand-border font-sans text-brand-textMain pt-20 pb-8 px-6 md:px-12 relative overflow-hidden">

      {/* KONTEN UTAMA FOOTER GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16">

        {/* KOLOM KIRI: Logo Besar, Nama Brand, Deskripsi, & Sosmed (5/12 lebar) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col items-start">
          <Link href="/" onClick={scrollToTop} className="flex items-center gap-4 group cursor-pointer">
            {/* Logo Ukuran Lebih Besar Sesuai Permintaan (w-20 h-20) */}
            <img
              src="/images/logo.png"
              alt={t("supplAi Logo")}
              className="w-30 h-30 object-contain group-hover:scale-105 transition-transform"
            />
          </Link>



          {/* Ikon Sosial Media Melingkar Minimalis (Gaya ReturnQueen) */}
          <div className="flex items-center gap-3 pt-2">
            {[
              { icon: Facebook, href: "#" },
              { icon: Twitter, href: "#" },
              { icon: Instagram, href: "#" },
              { icon: Linkedin, href: "#" }
            ].map((social, idx) => {
              const Icon = social.icon;
              return (
                <a
                  key={idx}
                  href={social.href}
                  className="w-9 h-9 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-brand-textMuted hover:text-brand-primary hover:border-brand-primary/40 shadow-sm transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN 1: Kategori Products (3/12 lebar) */}
        <div className="lg:col-span-3 lg:col-start-7 space-y-4">
          <h4 className="text-xs font-mono font-black tracking-widest text-brand-textMain uppercase border-l-2 border-brand-primary pl-2.5"> <LandingText text="Products" /> </h4>
          <ul className="space-y-3 font-medium text-sm text-brand-textMuted">
            <li>
              <Link href="/dashboard" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                <span><LandingText text="Dashboard" /></span>
              </Link>
            </li>
            <li>
              <Link href="#modules" className="hover:text-brand-primary transition-colors"> <LandingText text="API Integration" /> </Link>
            </li>
          </ul>
        </div>

        {/* KOLOM KANAN 2: Kategori Partnership & Support (3/12 lebar) */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-xs font-mono font-black tracking-widest text-brand-textMain uppercase border-l-2 border-brand-primary pl-2.5"> <LandingText text="Partnership" /> </h4>
          <ul className="space-y-3 font-medium text-sm text-brand-textMuted">
            <li>
              <Link href="#contact-us" className="hover:text-brand-primary transition-colors"> <LandingText text="Contact Us" /> </Link>
            </li>
            <li>
              <Link href="#faq" className="hover:text-brand-primary transition-colors"> <LandingText text="FAQ" /> </Link>
            </li>
          </ul>
        </div>

      </div>

      {/* ================================================================= */}
      {/* BARIS SUB-FOOTER: Copyright & Ketentuan Bawah                      */}
      {/* ================================================================= */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-brand-border/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-brand-textMuted/70">
        <div> <LandingText text="© 2026 supplAi. All Rights Reserved." /> </div>

        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-brand-primary transition-colors"><LandingText text="Terms & Conditions" /></a>
          <a href="#" className="hover:text-brand-primary transition-colors"><LandingText text="Privacy Policy" /></a>

          {/* Tombol Back-to-Top Kecil */}
          <button
            onClick={scrollToTop}
            className="p-2 bg-brand-card border border-brand-border rounded-xl text-brand-textMuted hover:text-brand-primary hover:border-brand-primary/30 shadow-sm transition-all cursor-pointer"
            title={t("Kembali ke atas")}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </section>
  );
}