"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { translations } from "./translations";

type Language = "id" | "en";
const storageKey = "supplai-landing-language";
let fallback: Language = "id";
function snapshot(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved === "en" ? "en" : saved === "id" ? "id" : fallback;
  } catch { return fallback; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("landing-language", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("landing-language", callback);
  };
}
function setLanguage(language: Language) {
  fallback = language;
  try { localStorage.setItem(storageKey, language); } catch { /* Keep the selection for this session. */ }
  window.dispatchEvent(new Event("landing-language"));
}
const LanguageContext = createContext({ language: "id" as Language, setLanguage, t: (text: string) => translations[text]?.[0] ?? text });

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, snapshot, () => "id" as Language);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  const t = (text: string) => translations[text]?.[language === "id" ? 0 : 1] ?? text;
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export const useLandingLanguage = () => useContext(LanguageContext);
export function LandingText({ text }: { text: string }) {
  return useLandingLanguage().t(text);
}

export function LanguageToggle() {
  const { language, setLanguage } = useLandingLanguage();
  const reducedMotion = useReducedMotion();
  return (
    <div role="group" aria-label={language === "id" ? "Pilih bahasa" : "Select language"} className="relative inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      <motion.span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-7 rounded-md bg-white shadow-sm" initial={false} animate={{ x: language === "id" ? 0 : 28 }} transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }} />
      {(["id", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value} aria-label={value === "id" ? "Bahasa Indonesia" : "English"} aria-pressed={language === value} onClick={() => setLanguage(value)} className={`relative z-10 w-7 rounded-md py-1.5 text-[11px] font-semibold transition-colors duration-200 motion-reduce:transition-none ${language === value ? "text-emerald-900" : "text-slate-500 hover:text-slate-900"}`}>
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
