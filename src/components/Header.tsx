"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, Database, Clock, Sparkles } from "lucide-react";

export function Header() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    const savedTheme = localStorage.getItem("cr_theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }

    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("cr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("cr_theme", "light");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-indigo-500/25 px-6 py-3.5 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-indigo-400/40 shadow-glass-sm overflow-hidden p-1">
            <img
              src="/logo.png"
              alt="CR-Ship Official Logo"
              className="w-full h-full object-contain rounded-xl drop-shadow-md"
            />
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#080c18] dark:border-[#080c18] shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-indigo-950 dark:text-white flex items-center gap-1.5">
                <span>CR-Ship</span>
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase rounded-full bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 text-white shadow-sm">
                BSCS 7th E2
              </span>
            </div>
            <p className="text-xs text-sky-400 font-bold tracking-wide">
              Class Representative Command Suite • UAF
            </p>
          </div>
        </div>

        {/* Live Clock & Database System Pill */}
        <div className="flex items-center gap-3">
          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-indigo-400/30 text-xs font-bold text-indigo-950 dark:text-white shadow-sm">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
            <span className="font-mono text-indigo-950 dark:text-white">{currentTime || "Loading..."}</span>
            <span className="text-indigo-400">•</span>
            <span className="text-indigo-800 dark:text-indigo-200">{currentDate}</span>
          </div>

          {/* Database Status Pill - Neon Emerald */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <Database className="w-3.5 h-3.5 hidden sm:inline text-emerald-500 dark:text-emerald-300" />
            <span>SQLite Local</span>
          </div>

          {/* Theme Toggle Button */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-amber-400/40 hover:border-amber-400 text-amber-500 hover:text-amber-400 transition-all shadow-sm active:scale-95"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
