"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";

export function InfoTooltip({ text, label = "Lihat penjelasan" }: { text: string; label?: string }) {
  return (
    <Tooltip.Root disableHoverablePopup={false}>
      <Tooltip.Trigger
        delay={100}
        closeOnClick={false}
        aria-label={label}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#006c4a]/30"
      >
        <Info className="h-4 w-4" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-[100]">
          <Tooltip.Popup className="max-w-sm rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-medium leading-5 text-white shadow-lg data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {text}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
