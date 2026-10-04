"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Camera,
  Layers,
  FolderGit2,
  GraduationCap,
  BellRing,
  ScrollText,
} from "lucide-react";

export type TabId =
  | "overview"
  | "students"
  | "timetable"
  | "attendance"
  | "groups"
  | "materials"
  | "teachers"
  | "tasks"
  | "logs";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  phase: string;
  iconColor: string;
  activeGradient: string;
  activeBorder: string;
  activeShadow: string;
  hoverBg: string;
}

const navItems: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    phase: "Phase 0",
    iconColor: "text-indigo-400 dark:text-indigo-300",
    activeGradient: "from-indigo-600 via-indigo-500 to-purple-600 text-white",
    activeBorder: "border-indigo-400",
    activeShadow: "shadow-[0_0_20px_rgba(99,102,241,0.45)]",
    hoverBg: "hover:bg-indigo-500/15 hover:border-indigo-400/40",
  },
  {
    id: "students",
    label: "Students Roster",
    icon: Users,
    badge: "130 MAX",
    phase: "Phase 1",
    iconColor: "text-sky-500 dark:text-sky-400",
    activeGradient: "from-sky-600 via-blue-600 to-indigo-600 text-white",
    activeBorder: "border-sky-400",
    activeShadow: "shadow-[0_0_20px_rgba(14,165,233,0.45)]",
    hoverBg: "hover:bg-sky-500/15 hover:border-sky-400/40",
  },
  {
    id: "timetable",
    label: "Timetable & Diff",
    icon: CalendarDays,
    phase: "Phase 2",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    activeGradient: "from-emerald-600 via-teal-600 to-cyan-600 text-white",
    activeBorder: "border-emerald-400",
    activeShadow: "shadow-[0_0_20px_rgba(16,185,129,0.45)]",
    hoverBg: "hover:bg-emerald-500/15 hover:border-emerald-400/40",
  },
  {
    id: "attendance",
    label: "Attendance OCR",
    icon: Camera,
    phase: "Phase 3",
    iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
    activeGradient: "from-fuchsia-600 via-purple-600 to-pink-600 text-white",
    activeBorder: "border-fuchsia-400",
    activeShadow: "shadow-[0_0_20px_rgba(217,70,239,0.45)]",
    hoverBg: "hover:bg-fuchsia-500/15 hover:border-fuchsia-400/40",
  },
  {
    id: "groups",
    label: "Subject Groups",
    icon: Layers,
    phase: "Phase 4",
    iconColor: "text-violet-500 dark:text-violet-400",
    activeGradient: "from-violet-600 via-purple-600 to-indigo-600 text-white",
    activeBorder: "border-violet-400",
    activeShadow: "shadow-[0_0_20px_rgba(139,92,246,0.45)]",
    hoverBg: "hover:bg-violet-500/15 hover:border-violet-400/40",
  },
  {
    id: "materials",
    label: "Course Materials",
    icon: FolderGit2,
    phase: "Phase 5",
    iconColor: "text-rose-500 dark:text-rose-400",
    activeGradient: "from-rose-600 via-pink-600 to-red-600 text-white",
    activeBorder: "border-rose-400",
    activeShadow: "shadow-[0_0_20px_rgba(244,63,94,0.45)]",
    hoverBg: "hover:bg-rose-500/15 hover:border-rose-400/40",
  },
  {
    id: "teachers",
    label: "Teacher Desk",
    icon: GraduationCap,
    phase: "Phase 6",
    iconColor: "text-amber-500 dark:text-amber-400",
    activeGradient: "from-amber-600 via-orange-600 to-yellow-600 text-white",
    activeBorder: "border-amber-400",
    activeShadow: "shadow-[0_0_20px_rgba(245,158,11,0.45)]",
    hoverBg: "hover:bg-amber-500/15 hover:border-amber-400/40",
  },
  {
    id: "tasks",
    label: "Tasks & Alarms",
    icon: BellRing,
    phase: "Phase 7",
    iconColor: "text-orange-500 dark:text-orange-400",
    activeGradient: "from-orange-600 via-amber-600 to-red-600 text-white",
    activeBorder: "border-orange-400",
    activeShadow: "shadow-[0_0_20px_rgba(249,115,22,0.45)]",
    hoverBg: "hover:bg-orange-500/15 hover:border-orange-400/40",
  },
  {
    id: "logs",
    label: "Logs & Backups",
    icon: ScrollText,
    badge: "10 PM",
    phase: "Phase 8",
    iconColor: "text-teal-500 dark:text-teal-400",
    activeGradient: "from-teal-600 via-emerald-600 to-cyan-600 text-white",
    activeBorder: "border-teal-400",
    activeShadow: "shadow-[0_0_20px_rgba(20,184,166,0.45)]",
    hoverBg: "hover:bg-teal-500/15 hover:border-teal-400/40",
  },
];

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="w-full glass-panel border-b border-indigo-500/25 px-4 py-2.5 sticky top-[69px] z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 select-none border ${
                isActive
                  ? `bg-gradient-to-r ${item.activeGradient} ${item.activeBorder} ${item.activeShadow}`
                  : `bg-white/[0.04] dark:bg-white/[0.03] text-indigo-950 dark:text-white border-white/10 dark:border-white/[0.08] ${item.hoverBg}`
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform ${
                  isActive ? "text-white scale-110" : item.iconColor
                }`}
              />
              <span className={isActive ? "text-white" : "text-indigo-950 dark:text-white font-semibold"}>
                {item.label}
              </span>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-md font-extrabold uppercase tracking-wider ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/40"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
