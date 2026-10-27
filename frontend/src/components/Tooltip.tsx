import React, { useState, useId } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex items-center"
      aria-describedby={visible ? id : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children ?? (
        <HelpCircle className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 cursor-help" />
      )}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="
            absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2
            w-56 text-[11px] leading-snug text-slate-200
            bg-slate-800 border border-slate-700 rounded-lg
            px-2.5 py-2 shadow-2xl pointer-events-none
          "
        >
          {text}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
        </span>
      )}
    </span>
  );
}
