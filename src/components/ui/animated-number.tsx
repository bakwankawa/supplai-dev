"use client";

import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  className = "",
  suffix = "",
  decimals = 0
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frame = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Menggunakan fungsi easing out agar melambat di akhir animasi
      const easeOutQuad = (t: number) => t * (2 - t);
      const currentValue = easeOutQuad(progress) * value;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}