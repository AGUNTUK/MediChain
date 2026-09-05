import React from "react";

interface ChainLinkEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function ChainLinkEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  icon: Icon
}: ChainLinkEmptyStateProps) {
  return (
    <div
      className={`p-8 md:p-12 text-center rounded-2xl flex flex-col items-center justify-center transition-all ${
        "bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-none"
      } ${className}`}
    >
      {/* Interlocking Chain-Link Brand Motif Vector Graphic or Custom Icon */}
      <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
        {/* Soft background aura */}
        <div className="absolute inset-0 rounded-full bg-purple-500/10 dark:bg-purple-500/20 blur-xl"></div>

        {Icon ? (
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
            <Icon className="w-7 h-7" />
          </div>
        ) : (
          <svg
            viewBox="0 0 80 80"
            className="w-16 h-16 relative z-10 drop-shadow-sm text-purple-600 dark:text-purple-400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Link Loop */}
            <rect
              x="14"
              y="26"
              width="32"
              height="20"
              rx="10"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="text-purple-600 dark:text-purple-400 opacity-90"
              transform="rotate(-25 30 36)"
            />
            {/* Right Link Loop interlocking */}
            <rect
              x="34"
              y="34"
              width="32"
              height="20"
              rx="10"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="text-lime-600 dark:text-lime-400 opacity-90"
              transform="rotate(-25 50 44)"
            />
            {/* Subtle node accent dots */}
            <circle cx="28" cy="24" r="2.5" className="fill-purple-500" />
            <circle cx="52" cy="56" r="2.5" className="fill-lime-500" />
          </svg>
        )}
      </div>

      <h4 className="text-sm font-bold text-[#14161B] dark:text-slate-200 mb-1 tracking-tight">
        {title}
      </h4>
      <p className="text-xs text-[#6B7280] dark:text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 dark:bg-purple-600 hover:bg-purple-700 transition-all cursor-pointer shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
