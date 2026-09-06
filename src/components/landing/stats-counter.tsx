"use client"
import { useEffect, useRef } from "react"
import { motion, useMotionValue, useTransform, animate, useInView } from "motion/react"

export function StatsCounter({
  value,
  prefix = "",
  suffix = "",
  label,
  duration = 2,
}: {
  value: number
  prefix?: string
  suffix?: string
  label: string
  duration?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    const r = Math.round(v * 10) / 10
    // If the value is a decimal (like 4.5), show one decimal place
    if (value % 1 !== 0) {
      return r.toFixed(1)
    }
    return Math.round(v).toString()
  })

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, {
        duration,
        ease: "easeOut",
      })
      return controls.stop
    }
  }, [isInView, count, value, duration])

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <div className="text-3xl md:text-4xl font-bold text-white">
        {prefix}
        <motion.span>{rounded}</motion.span>
        {suffix}
      </div>
      <div className="text-sm md:text-base text-white/60 text-center">{label}</div>
    </div>
  )
}
