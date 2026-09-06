"use client";

import { LandingText, LanguageToggle, useLandingLanguage } from "./language";


import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const links = [
  { name: "Cara Kerja", href: "#modules" },
  { name: "Fitur", href: "#features" },
  { name: "Tujuan Kami", href: "#our-goals" },
  { name: "Hubungi Kami", href: "#contact-us" },
];

export function TopBar() {
  const { t } = useLandingLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  useEffect(() => {
    const update = () => setIsAtTop(window.scrollY < 24);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className={`fixed inset-x-0 z-50 transition-[top,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isAtTop ? "top-0" : "top-4 px-4 sm:top-5 sm:px-8"}`}>
      <nav aria-label={t("Navigasi utama")} className={`mx-auto w-full border border-slate-200 bg-white/95 px-4 shadow-sm sm:px-8 transition-[max-width,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isAtTop ? "max-w-[100vw] rounded-none" : "max-w-6xl rounded-xl"}`}>
        <div className="flex h-16 items-center justify-between gap-5 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/" prefetch={false} aria-label={t("SupplAI beranda")} className="shrink-0 justify-self-start">
            <Image src="/images/logo.png" alt={t("SupplAI")} width={96} height={64} className="h-14 w-24 object-contain" priority />
          </Link>
          <div className="hidden items-center gap-5 xl:gap-7 lg:flex">
            {links.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-slate-500 transition-colors hover:text-emerald-800"><LandingText text={link.name} /></a>)}
          </div>
          <div className="ml-auto flex items-center gap-3 justify-self-end">
            <LanguageToggle />
            <Link href="/login" prefetch={false} className="hidden items-center gap-2 whitespace-nowrap rounded-lg bg-brand-accentDark px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 lg:flex"><LandingText text="Buka Dashboard" /> <ArrowRight className="h-3.5 w-3.5" /></Link>
            <button type="button" aria-label={isOpen ? t("Tutup menu") : t("Buka menu")} aria-expanded={isOpen} aria-controls="landing-mobile-menu" onClick={() => setIsOpen(!isOpen)} className="rounded-lg p-2 text-slate-700 lg:hidden">{isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {isOpen && <div id="landing-mobile-menu" className="flex flex-col gap-1 border-t border-slate-100 pb-4 pt-2 lg:hidden">
          {links.map((link) => <a key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="rounded-lg px-2 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><LandingText text={link.name} /></a>)}
          <Link href="/login" prefetch={false} className="mt-2 rounded-lg bg-brand-accentDark px-4 py-3 text-center text-sm font-semibold text-white"><LandingText text="Buka Dashboard" /></Link>
        </div>}
      </nav>
    </header>
  );
}
