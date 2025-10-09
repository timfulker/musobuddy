import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useHelpTooltips } from "@/contexts/TooltipContext";

interface HelpTooltipProps {
  content: string;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  showIcon?: boolean;
}

export function HelpTooltip({ content, children, side = "right", showIcon = true }: HelpTooltipProps) {
  const { tooltipsEnabled } = useHelpTooltips();

  // If tooltips are disabled, just return the children without tooltip
  if (!tooltipsEnabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children ? (
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            {showIcon && <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />}
          </span>
        ) : (
          <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors cursor-help" />
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
