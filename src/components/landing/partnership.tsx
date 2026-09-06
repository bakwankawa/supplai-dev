"use client";

import { LandingText } from "./language";


import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInView } from "motion/react";

const partners = [
  { name: "Bank Indonesia", src: "/images/logos/bi.png" },
  { name: "Bapanas", src: "/images/logos/bapanas.png" },
  { name: "BMKG", src: "/images/logos/bmkg.png" },
  { name: "Kementerian Pertanian", src: "/images/logos/kementan.png" },
];

export function PartnershipSection() {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <section ref={ref} id="partnership" aria-labelledby="partnership-title" className="border-b border-brand-border/70 px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <h2 id="partnership-title" className="text-sm font-medium text-slate-500 sm:text-base"><LandingText text="Kolaborasi untuk ketahanan pangan Indonesia" /></h2>
        </div>
        <div className="partner-carousel overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="partner-track flex w-max" style={{ animationPlayState: visible && pageVisible ? "running" : "paused" }}>
            {[0, 1, 2].map((copy) => (
              <div key={copy} aria-hidden={copy > 0 ? true : undefined} className="partner-group flex shrink-0 items-center justify-around gap-12 px-6 sm:gap-20 sm:px-10">
                {partners.map((partner) => (
                  <div key={partner.name} className="flex w-48 shrink-0 items-center justify-center gap-3 py-3 opacity-65 grayscale sm:w-52">
                    <Image src={partner.src} alt={copy === 0 ? partner.name : ""} width={56} height={56} className="h-11 w-12 object-contain" />
                    <span className="max-w-32 text-sm font-semibold text-slate-600"><LandingText text={partner.name} /></span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
