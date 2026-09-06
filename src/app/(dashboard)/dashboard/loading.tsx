"use client";

import { motion } from "motion/react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-brand-bgSubtle rounded-lg" />
          <div className="h-4 w-96 bg-brand-bgSubtle rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-brand-bgSubtle rounded-xl" />
          <div className="h-10 w-36 bg-brand-bgSubtle rounded-xl" />
        </div>
      </div>

      {/* Top Block Split Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Panel Skeleton (3 Cols) */}
        <div className="lg:col-span-3 h-[420px] bg-brand-card border border-brand-border/40 rounded-2xl p-5 space-y-6">
          <div className="h-4 w-24 bg-brand-bgSubtle rounded" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-brand-bgSubtle rounded" />
            <div className="h-10 w-full bg-brand-bgSubtle rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 bg-brand-bgSubtle rounded" />
            <div className="h-10 w-full bg-brand-bgSubtle rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 bg-brand-bgSubtle rounded" />
            <div className="h-6 w-full bg-brand-bgSubtle rounded-xl" />
          </div>
        </div>

        {/* Right Chart Panel Skeleton (9 Cols) */}
        <div className="lg:col-span-9 h-[420px] bg-brand-card border border-brand-border/40 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-brand-border/20">
            <div className="h-4 w-48 bg-brand-bgSubtle rounded" />
            <div className="h-4 w-32 bg-brand-bgSubtle rounded" />
          </div>
          <div className="flex-1 w-full bg-brand-bgSubtle/40 rounded-xl my-4" />
        </div>
      </div>

      {/* Middle Block (Regional Comparison) Skeleton */}
      <div className="h-[380px] bg-brand-card border border-brand-border/40 rounded-2xl p-6 flex flex-col justify-between">
        <div className="h-6 w-56 bg-brand-bgSubtle rounded" />
        <div className="flex-1 w-full bg-brand-bgSubtle/40 rounded-xl my-4" />
      </div>
    </div>
  );
}