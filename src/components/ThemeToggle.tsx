import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
        isDark
          ? "bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-slate-700 shadow-sm"
          : "bg-white hover:bg-slate-100 text-purple-700 border border-slate-200/80 shadow-sm hover:shadow"
      } ${className}`}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      aria-label="Toggle theme mode"
    >
      {isDark ? (
        <Sun className={`${iconSizes[size]} transition-transform duration-300 hover:rotate-45`} />
      ) : (
        <Moon className={`${iconSizes[size]} transition-transform duration-300 hover:-rotate-12`} />
      )}
    </button>
  );
}
