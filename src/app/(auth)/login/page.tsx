"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserRound, Pause, Play } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const slideDuration = reducedMotion ? 0 : 0.6;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (document.hidden || reducedMotion || videoPaused) video.pause();
      else void video.play().catch(() => { });
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [reducedMotion, videoPaused]);

  useEffect(() => {
    if (!isRedirecting) return;
    statusRef.current?.focus();
    router.prefetch("/executive-summary");
    // Keep the full-screen loading state visible for at least three seconds.
    const timeout = window.setTimeout(() => router.replace("/executive-summary"), 3000 + slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [isRedirecting, router, slideDuration]);

  const enterDashboard = (guest: boolean) => {
    if (started.current) return;
    started.current = true;
    try {
      sessionStorage.setItem("authMode", guest ? "guest" : "demo");
      sessionStorage.setItem("userEmail", guest ? "Tamu" : email.trim());
      if (guest) localStorage.removeItem("userEmail");
      else localStorage.setItem("userEmail", email.trim());
    } catch { /* Navigation remains available when browser storage is disabled. */ }
    setIsRedirecting(true);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    enterDashboard(false);
  };

  return (
    <main className="relative min-h-svh overflow-hidden bg-emerald-950 font-sans">
      <div className="fixed inset-0">
        <video ref={videoRef} src="/videos/login-background.mp4" poster="/images/login-background.webp" muted loop playsInline preload="metadata" aria-hidden="true" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-emerald-950/30" />
      </div>

      <motion.section aria-hidden={isRedirecting} inert={isRedirecting} initial={false} animate={{ x: isRedirecting ? "-100%" : "0%" }} transition={{ duration: slideDuration, ease: [0.76, 0, 0.24, 1] }} className="relative z-20 flex min-h-svh w-full flex-col bg-white px-7 py-7 sm:px-12 sm:py-10 lg:w-1/2 lg:px-16 xl:px-24">
        <Link href="/" prefetch={false} aria-label="Kembali ke beranda SupplAI" className="w-fit">
          <Image src="/images/logo.png" alt="SupplAI" width={128} height={64} priority className="h-12 w-32 object-contain" />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mb-9">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Selamat datang kembali</h1>
            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">Akses analisis harga dan pasokan pangan untuk mendukung keputusan organisasi Anda.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Alamat email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@organisasi.id" className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Kata sandi</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
                <button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 rounded-md p-2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <button type="submit" disabled={isRedirecting} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 text-sm font-semibold text-white transition-colors hover:bg-emerald-950 disabled:opacity-60">Masuk <ArrowRight className="h-4 w-4" /></button>
          </form>
          <div className="my-6 flex items-center gap-4 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau<span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" disabled={isRedirecting} onClick={() => enterDashboard(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50 disabled:opacity-60"><UserRound className="h-4 w-4" />Masuk sebagai tamu</button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-400">Jelajahi dasbor tanpa mengisi kredensial.</p>
        </div>
        <p className="text-xs text-slate-400">© 2026 SupplAI. Seluruh hak dilindungi.</p>
      </motion.section>

      <motion.aside aria-hidden={isRedirecting} initial={false} animate={{ opacity: isRedirecting ? 0 : 1 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="absolute inset-y-0 right-0 hidden w-1/2 flex-col justify-center px-12 text-white lg:flex xl:px-20">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Intelijen pangan untuk organisasi</p>
        <h2 className="max-w-xl text-4xl font-medium leading-tight tracking-tight xl:text-5xl">Keputusan yang terukur.<br />Ketahanan pangan yang lebih kuat.</h2>
        <p className="mt-7 max-w-md text-base leading-8 text-white/85">Satukan proyeksi harga, pemantauan wilayah, dan rekomendasi distribusi dalam satu dasbor.</p>
        <div className="mt-12 flex flex-wrap gap-3 border-t border-white/25 pt-6 text-xs font-medium text-white/80"><span>Prediksi harga</span><span aria-hidden="true">/</span><span>Peta pangan</span><span aria-hidden="true">/</span><span>Rekomendasi distribusi</span></div>
      </motion.aside>

      {isRedirecting && <motion.div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: slideDuration, duration: reducedMotion ? 0 : 0.3 }} className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white outline-none">
        <Image src="/images/logo-dashboard.png" alt="SupplAI" width={128} height={64} priority className="h-12 w-32 object-contain" />
        <p className="mt-5 text-sm leading-6 text-white/90 sm:text-base">You will be redirected to SupplAI Dashboard...</p>
        <div aria-hidden="true" className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/25"><motion.div className="h-full origin-left bg-white" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: slideDuration, duration: reducedMotion ? 0 : 3, ease: "linear" }} /></div>
      </motion.div>}
      <button type="button" onClick={() => setVideoPaused(!videoPaused)} aria-label={videoPaused ? "Putar video latar" : "Jeda video latar"} className={`fixed bottom-6 right-6 z-30 rounded-lg border border-white/30 bg-black/10 p-2 text-white motion-reduce:hidden ${isRedirecting ? "" : "hidden lg:block"}`}>{videoPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
    </main>
  );
}
