"use client";

import { AnimatePresence } from "motion/react";
import { AlertCard, AlertData } from "./alert-card";

interface AlertListProps {
  alerts: AlertData[];
  onDismiss?: (id: string | number) => void;
}

export function AlertList({ alerts, onDismiss }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 bg-brand-bgSubtle/40 border border-dashed border-brand-border rounded-2xl">
        <p className="text-sm text-brand-textMuted font-medium">No active alerts match current filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <AlertCard 
            key={alert.id} 
            alert={alert} 
            onDismiss={onDismiss} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}