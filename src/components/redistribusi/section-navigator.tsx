"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export const redistributionSections = [
  { id: "ringkasan-rencana", label: "Ringkasan" },
  { id: "peta-alokasi", label: "Peta Alokasi" },
  { id: "matriks-rute", label: "Matriks Rute" },
  { id: "kesenjangan-ikp", label: "Kesenjangan IKP" },
  { id: "lanskap-komoditas", label: "Lanskap Komoditas" },
  { id: "muatan-balik", label: "Muatan Balik" },
  { id: "jalur-tindakan", label: "Jalur Tindakan" },
  { id: "asal-usul-angka", label: "Asal-usul Angka" },
  { id: "metode-alokasi", label: "Metode Alokasi" },
] as const;

export function RedistributionSectionNavigator({ includePrediction = false }: { includePrediction?: boolean }) {
  const sections = useMemo(() => includePrediction
    ? [redistributionSections[0], { id: "prediksi-harga", label: "Prediksi Harga" }, ...redistributionSections.slice(1)]
    : redistributionSections,
  [includePrediction]);
  const [active, setActive] = useState<string>(sections[0].id);
  const navRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const updateActiveSection = () => {
      const stickyBottom = navRef.current?.parentElement?.getBoundingClientRect().bottom ?? 0;
      const marker = stickyBottom + 24;
      let current = sections[0].id;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= marker) current = section.id;
      }
      setActive(current);
    };
    const scrollRoot = navRef.current?.closest("main");
    updateActiveSection();
    scrollRoot?.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      scrollRoot?.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections]);

  const goTo = (id: string) => {
    const target = document.getElementById(id);
    const scrollRoot = navRef.current?.closest("main");
    const stickyHeight = navRef.current?.parentElement?.getBoundingClientRect().height ?? 0;
    if (target && scrollRoot) {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      scrollRoot.scrollTo({
        top: scrollRoot.scrollTop + target.getBoundingClientRect().top - rootTop - stickyHeight - 16,
        behavior: "smooth",
      });
    }
    setActive(id);
  };

  return (
    <motion.nav
      ref={navRef}
      aria-label="Bagian halaman redistribusi"
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 15, delay: 0.06 }}
      className="-mx-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Bagian</span>
        {sections.map((section) => (
          <motion.button
            key={section.id}
            type="button"
            onClick={() => goTo(section.id)}
            aria-current={active === section.id ? "location" : undefined}
            whileHover={reducedMotion ? undefined : { y: -1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            animate={{
              backgroundColor: active === section.id ? "#006c4a" : "#f8fafc",
              color: active === section.id ? "#ffffff" : "#64748b",
            }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold hover:text-slate-900"
          >
            {section.label}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
}
