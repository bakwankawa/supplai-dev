"use client";

import { LandingLanguageProvider } from "@/components/landing/language";
import { motion } from "motion/react";
import { TopBar } from "@/components/landing/top-bar";
import { PartnershipSection } from "@/components/landing/partnership";
import { HeroSection } from "@/components/landing/hero-section";
import { OurGoalsSection } from "@/components/landing/our-goals";
import { ModulesSection } from "@/components/landing/modules";
import { FeaturesSection } from "@/components/landing/features";
import { FaqSection } from "@/components/landing/faq";
import { ContactUsSection } from "@/components/landing/contact-us";
import { FooterSection } from "@/components/landing/footer";

// Variasi animasi dengan efek Spring / Bouncy
const bouncyVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
      mass: 0.8,
    },
  },
} as const;

export default function Home() {
  return (
    <LandingLanguageProvider>
    <div className="min-h-screen bg-brand-bg text-brand-textMain overflow-x-hidden relative scroll-smooth">

      {/* 1. FIXED TOP BAR */}
      <TopBar />

      <HeroSection />
      <PartnershipSection />

      {/* 3. SECTION: OUR GOALS */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={bouncyVariants}
      >
        <OurGoalsSection />
      </motion.div>

      {/* 4. MODULES SECTION */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={bouncyVariants}
      >
        <ModulesSection />
      </motion.div>

      {/* 5. FEATURES SECTION */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={bouncyVariants}
      >
        <FeaturesSection />
      </motion.div>

      {/* 6. FAQ SECTION */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={bouncyVariants}
      >
        <FaqSection />
      </motion.div>

      {/* 7. CONTACT US SECTION */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={bouncyVariants}
      >
        <ContactUsSection />
      </motion.div>

      {/* 8. FOOTER */}
      <FooterSection />

    </div>
    </LandingLanguageProvider>
  );
}