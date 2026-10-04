"use client";

import React from "react";
import { Sparkles, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { TabId } from "../Navigation";

interface PlaceholderTabProps {
  tabId: TabId;
  title: string;
  phase: string;
  description: string;
  plannedFeatures: string[];
  userInputRequired: string[];
  icon: React.ElementType;
}

export function PlaceholderTab({
  title,
  phase,
  description,
  plannedFeatures,
  userInputRequired,
  icon: Icon,
}: PlaceholderTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-8 border border-indigo-500/25 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/35 text-indigo-600 dark:text-indigo-300 shadow-sm">
              <Icon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 text-xs font-bold border border-indigo-500/30">
                  {phase}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Scheduled for Iterative Build
                </span>
              </div>
              <h2 className="text-2xl font-bold text-indigo-950 dark:text-white tracking-tight">{title}</h2>
              <p className="text-sm text-indigo-800 dark:text-indigo-200/90 max-w-2xl font-medium">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planned Features Box - Vibrant Amethyst & Indigo */}
        <div className="glass-card rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 bg-purple-950/10 space-y-4">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-white">
              Planned Deliverables
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-indigo-900 dark:text-indigo-100 font-medium">
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* User Customization Inputs Box - Vibrant Amber & Mint */}
        <div className="glass-card rounded-2xl p-6 border border-amber-500/30 hover:border-amber-400/50 bg-amber-950/10 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-white">
              Your Real-World Inputs Needed
            </h3>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200/90 font-medium">
            When we reach this phase, you will provide your exact rules and sample files before we code:
          </p>
          <ul className="space-y-2.5 text-xs text-indigo-900 dark:text-indigo-100 font-medium">
            {userInputRequired.map((input, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                <span>{input}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
