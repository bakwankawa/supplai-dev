"use client";



import { useLandingLanguage } from "./language";


import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function HeroVideo() {
  const { t } = useLandingLanguage();
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const sync = () => {
      if (paused || reduced.matches || document.hidden || !visible) {
        video.pause();
      } else {
        if (!video.getAttribute("src")) video.src = "/videos/hero-plantation-lite.mp4";
        void video.play().catch(() => {});
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(video);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [paused]);

  return (
    <div className="absolute inset-x-0 top-0 h-[760px] sm:h-[700px]">
      <video ref={ref} muted loop playsInline preload="none" poster="/images/hero-plantation.webp" aria-hidden="true" className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-brand-bg" />
      <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? t("Putar video latar") : t("Jeda video latar")} aria-pressed={paused} className="absolute right-5 top-28 z-10 rounded-md border border-white/70 bg-white/80 p-2 text-emerald-900 motion-reduce:hidden sm:right-8">
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
