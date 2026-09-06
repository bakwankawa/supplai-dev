"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AnimatePresence, motion } from "motion/react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsRefreshing(true);
    const handleEnd = () => setIsRefreshing(false);

    window.addEventListener("global-refresh-start", handleStart);
    window.addEventListener("global-refresh", handleEnd);

    return () => {
      window.removeEventListener("global-refresh-start", handleStart);
      window.removeEventListener("global-refresh", handleEnd);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar Kiri */}
      <Sidebar />

      {/* Konten Utama */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <AnimatePresence mode="wait">
            {isRefreshing ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <DashboardLoading />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}