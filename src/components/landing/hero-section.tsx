"use client";

import { LandingText, useLandingLanguage } from "./language";
import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "./hero-video";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  const { t } = useLandingLanguage();
  return (
    <section id="hero" className="relative overflow-hidden px-5 pt-40 sm:px-8 sm:pt-44">
      <HeroVideo />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <h1 className="text-[clamp(2.5rem,5.7vw,4.75rem)] font-semibold leading-[1.12] tracking-[-0.045em] text-slate-900"> <LandingText text="Antisipasi harga pangan." /><br />
            <span className="text-brand-accentDark"><LandingText text="Rencanakan langkah ke depan." /></span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8"> <LandingText text="Dari prediksi harga hingga rekomendasi distribusi. SupplAI membantu bisnis dan lembaga melihat perubahan lebih awal, untuk keputusan pangan yang lebih terukur." /> </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link prefetch={false} href="/login" className="inline-flex h-12 w-full sm:w-48 items-center justify-center gap-3 rounded-xl bg-brand-accentDark px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900"> <LandingText text="Buka Dashboard" /> <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#modules" className="inline-flex h-12 w-full sm:w-48 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white"><LandingText text="Lihat Cara Kerja" /></a>
          </div>

        </div>

        <div id="dashboard-preview" className="relative mx-auto mt-12 max-w-6xl rounded-2xl border border-slate-300/80 bg-white/70 p-2 shadow-[0_18px_60px_-30px_rgba(6,78,59,0.3)] sm:mt-16 sm:p-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image src="/images/prediction-dashboard-preview.png" alt={t("Dashboard Prediksi Harga Komoditas SupplAI, menampilkan filter wilayah, harga acuan, hasil prediksi, MAPE, dan grafik harga.")} width={2902} height={1740} unoptimized sizes="(max-width: 1200px) 100vw, 1152px" priority className="h-auto w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
