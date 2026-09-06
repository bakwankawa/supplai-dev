"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Grid3X3, Map, Bell } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import type { AlertResponse } from "@/lib/types"

export function BottomNav() {
  const pathname = usePathname()
  const { data } = useApi<AlertResponse>("/api/alerts")
  const alertCount = data?.alerts ? data.alerts.length : 0

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Prediction",
      href: "/dashboard",
    },
    {
      icon: Grid3X3,
      label: "Heatmap",
      href: "/heatmap",
    },
    {
      icon: Map,
      label: "Redistribution",
      href: "/redistribusi",
    },
    {
      icon: Bell,
      label: "Alerts",
      href: "/alerts",
      badge: alertCount,
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                text-xs font-medium transition-colors duration-150 relative
                ${isActive ? "text-[#2563eb]" : "text-gray-400 hover:text-gray-600"}
              `}
            >
              <div className="relative">
                <Icon size={20} />
                {item.badge != null && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-md bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
