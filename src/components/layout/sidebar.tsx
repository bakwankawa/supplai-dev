"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // Murni dari next/link
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  BarChart2,
  Map,
  GitCommit,
  Bell,
  Menu,
  Settings,
  X
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { AlertResponse } from "@/lib/types";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: alertData } = useApi<AlertResponse>("/api/alerts");
  const alertBadgeCount = alertData?.alerts ? alertData.alerts.length : 0;

  const menuItems = [
    { name: "Ringkasan Eksekutif", href: "/executive-summary", icon: LayoutDashboard },
    { name: "Prediksi Harga", href: "/dashboard", icon: BarChart2 },
    { name: "Peta Harga", href: "/heatmap", icon: Map },
    { name: "Redistribusi", href: "/redistribusi", icon: GitCommit },
    { name: "Peringatan", href: "/alerts", icon: Bell, badge: alertBadgeCount },
  ];

  useEffect(() => {
    const openMobileSidebar = () => setIsMobileOpen(true);
    window.addEventListener("toggle-mobile-sidebar", openMobileSidebar);
    return () => window.removeEventListener("toggle-mobile-sidebar", openMobileSidebar);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (insideMobile = false) => (
    <div className="h-full flex flex-col justify-between select-none font-sans">
      <div className="space-y-8">
        {/* LOGO & DYNAMIC TOGGLE */}
        <div className={`flex items-center ${isCollapsed && !insideMobile ? "justify-center" : "justify-between"} px-2 pt-2`}>
          {(!isCollapsed || insideMobile) ? (
            <>
              <Link prefetch={false} href="/dashboard" className="flex items-center gap-3 active:scale-95 transition-transform">
                <Image
                  src="/images/logo-dashboard.png" 
                  alt="SupplAi Logo"
                  width={80}          
                  height={14}          
                  priority             
                  className="object-contain"
                />
              </Link>

              <button
                onClick={() => insideMobile ? setIsMobileOpen(false) : setIsCollapsed(true)}
                className="p-2 rounded-xl text-brand-textMuted hover:text-brand-textMain hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                {insideMobile ? <X className="w-5 h-5 text-slate-500" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <Image
                src="/images/logo-mini.png" 
                alt="SupplAi Mini Logo"
                width={24}           
                height={24}
                priority
                className="object-contain"
              />
            </button>
          )}
        </div>

        {/* NAVIGASI UTAMA */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const collapsedMode = isCollapsed && !insideMobile;

            return (
              <Link prefetch={false} key={item.href} href={item.href} className="relative block group">
                <motion.div
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors relative z-10 cursor-pointer ${
                    collapsedMode ? "justify-center" : "justify-between"
                  } ${isActive ? "text-brand-accentDark font-semibold" : "text-brand-textMuted group-hover:text-brand-textMain"}`}
                  whileHover={{ x: collapsedMode ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-brand-primary" : "text-brand-textMuted group-hover:text-brand-textMain"}`} />
                    {!collapsedMode && <span>{item.name}</span>}
                  </div>

                  {!collapsedMode && item.badge && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                      {item.badge}
                    </span>
                  )}
                  {collapsedMode && item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  )}
                </motion.div>

                {collapsedMode && (
                  <div className="absolute left-16 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 translate-x-[-10px] group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50 pl-2">
                    <div className="bg-brand-card text-brand-textMain text-sm font-medium px-4 py-2 rounded-xl shadow-xl border border-brand-border whitespace-nowrap">
                      {item.name}
                    </div>
                  </div>
                )}

                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    className="absolute inset-0 bg-brand-bgSubtle rounded-xl border border-brand-border/40 z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER SETTINGS */}
      <div className="space-y-1">
        {/* Rute /settings belum ada, jadi tautannya dilepas: Next.js mem-prefetch
            href ini di setiap halaman dasbor dan selalu menerima 404, dan
            mengekliknya membawa pengguna ke halaman tidak ditemukan. Kembalikan
            <Link prefetch={false} href="/settings"> begitu halamannya dibuat. */}
        <div className="relative block group mb-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-brand-textMuted transition-colors relative z-10 ${isCollapsed && !insideMobile ? "justify-center" : ""}`}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {(!isCollapsed || insideMobile) && <span>Pengaturan</span>}
          </div>
          {isCollapsed && !insideMobile && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 translate-x-[-10px] group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50 pl-2">
              <div className="bg-brand-card text-brand-textMain text-sm font-medium px-4 py-2 rounded-xl shadow-xl border border-brand-border whitespace-nowrap">
                Pengaturan
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex h-screen bg-sidebar-bg text-brand-textMuted p-4 flex-col justify-between border-r border-slate-200/80 sticky top-0 left-0 select-none z-40 font-sans shrink-0"
      >
        {sidebarContent(false)}
      </motion.aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
              className="relative w-72 h-full bg-white p-4 flex flex-col justify-between border-r border-slate-200 shadow-2xl"
            >
              {sidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;