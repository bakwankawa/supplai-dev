"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";

const AgentPanel = dynamic(
  () => import("@/components/agent/agent-panel").then((module) => module.AgentPanel),
  { loading: () => <p className="p-4 text-sm text-slate-500">Memuat asisten…</p> }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAgentOpen, setIsAgentOpen] = useState(false);
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
        <Header onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} />

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

      {/* Panel Kanan (Chat Agent) dengan Animasi Masuk/Keluar */}
      <AnimatePresence>
        {isAgentOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-l border-slate-200 bg-white h-full shadow-2xl overflow-hidden flex-shrink-0"
          >
            <div className="w-[400px] h-full">
              <AgentPanel onClose={() => setIsAgentOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}