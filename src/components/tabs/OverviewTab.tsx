"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  Camera,
  ArrowRight,
  Database,
  ScrollText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BellRing,
  BookOpen,
  Share2,
  FolderOpen,
  GraduationCap,
  Mail,
  ShieldCheck,
  Send,
  Sparkles,
  Flame,
  Check,
  Copy,
} from "lucide-react";
import { TabId } from "../Navigation";

interface OverviewTabProps {
  onNavigate: (tab: TabId) => void;
}

interface OverviewData {
  studentsCount: number;
  todayClasses: any[];
  pendingTasks: any[];
  urgentTasksCount: number;
  totalMaterials: number;
  attendanceSessionsCount: number;
  recentLogs: any[];
  nightlyEmail: {
    recipient: string;
    lastSentAt: string | null;
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OverviewTab({ onNavigate }: OverviewTabProps) {
  const [data, setData] = useState<OverviewData>({
    studentsCount: 63,
    todayClasses: [],
    pendingTasks: [],
    urgentTasksCount: 0,
    totalMaterials: 0,
    attendanceSessionsCount: 0,
    recentLogs: [],
    nightlyEmail: {
      recipient: "zohaibmuaz@gmail.com",
      lastSentAt: null,
    },
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [todayName, setTodayName] = useState<string>("");
  const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);
  const [isSendingQuickBackup, setIsSendingQuickBackup] = useState<boolean>(false);
  const [quickBackupSuccess, setQuickBackupSuccess] = useState<boolean>(false);

  // Audio Chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTodayName(DAYS[now.getDay()]);
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Dashboard Data from SQLite APIs
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentDayName = DAYS[now.getDay()];

        // Parallel Fetch for maximum speed
        const [studentsRes, timetableRes, tasksRes, logsRes, backupRes, materialsRes] =
          await Promise.all([
            fetch("/api/students").then((r) => r.json()).catch(() => ({})),
            fetch("/api/timetable").then((r) => r.json()).catch(() => ({})),
            fetch("/api/tasks").then((r) => r.json()).catch(() => ({})),
            fetch("/api/logs?limit=4").then((r) => r.json()).catch(() => ({})),
            fetch("/api/backup?format=stats").then((r) => r.json()).catch(() => ({})),
            fetch("/api/materials").then((r) => r.json()).catch(() => ({})),
          ]);

        // Filter today's classes
        let todaySlots: any[] = [];
        if (timetableRes.success && Array.isArray(timetableRes.slots)) {
          todaySlots = timetableRes.slots.filter(
            (s: any) => (s.dayOfWeek || "").toLowerCase() === currentDayName.toLowerCase()
          );
        }

        // Filter pending tasks
        let pTasks: any[] = [];
        let urgentCount = 0;
        if (tasksRes.success && Array.isArray(tasksRes.tasks)) {
          pTasks = tasksRes.tasks.filter((t: any) => !t.isCompleted);
          urgentCount = pTasks.filter((t: any) => t.priority === "URGENT").length;
        }

        setData({
          studentsCount: studentsRes.success ? studentsRes.students?.length || 63 : 63,
          todayClasses: todaySlots,
          pendingTasks: pTasks,
          urgentTasksCount: urgentCount,
          totalMaterials: materialsRes.success ? materialsRes.materials?.length || 0 : 0,
          attendanceSessionsCount: backupRes.counts?.attendanceSessions || 0,
          recentLogs: logsRes.success ? logsRes.logs || [] : [],
          nightlyEmail: {
            recipient: backupRes.nightlyEmail?.recipient || "zohaibmuaz@gmail.com",
            lastSentAt: backupRes.nightlyEmail?.lastSentAt || null,
          },
        });
      } catch (err) {
        console.error("Overview data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  // Quick 1-Click WhatsApp Broadcast for Task
  const handleQuickTaskBroadcast = (t: any) => {
    const text = `*⏰ BSCS 7th (E2) — CR Deadline Notice*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${
      t.priority === "URGENT" ? "🚨 *URGENT REMINDER*" : "📌 *REMINDER:*"
    } ${t.title}\n📅 *Deadline:* ${t.dueDate || "Today"} ${t.reminderTime ? `at ${t.reminderTime}` : ""}\n${
      t.description ? `📝 *Instructions:* ${t.description}\n` : ""
    }━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(text);
    setCopiedTaskId(t.id);
    playChime();
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  // Quick Trigger Nightly Backup Email
  const handleTriggerQuickBackup = async () => {
    setIsSendingQuickBackup(true);
    setQuickBackupSuccess(false);
    try {
      const res = await fetch("/api/backup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isManual: true }),
      });
      const resData = await res.json();
      if (resData.success) {
        setQuickBackupSuccess(true);
        playChime();
        setTimeout(() => setQuickBackupSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingQuickBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HERO COMMAND BANNER                                          */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-indigo-400/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-blue-950/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Stealth Mode Active • Normal Routine</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/50 text-indigo-300 text-xs font-black shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                BSCS 7th (E2) • Dept. of Computer Science, UAF
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Assalam-o-Alaikum, Class Representative Zohaib</span>
              <span className="text-xl">👋</span>
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-medium">
              Your offline-first automation engine is running. All 63 students experience normal class routine,
              while attendance, timetable change alerts, subject group exports, and 10:00 PM email backups operate silently.
            </p>
          </div>

          {/* Live Clock & Quick Backup Widget */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-black/60 border border-white/15 text-right font-mono shadow-inner">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {todayName || "Today"}
              </div>
              <div className="text-base font-black text-amber-400">
                {currentTimeStr || "--:--:--"}
              </div>
            </div>

            <button
              onClick={handleTriggerQuickBackup}
              disabled={isSendingQuickBackup}
              className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                quickBackupSuccess
                  ? "bg-emerald-500 text-black shadow-emerald-500/30"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25"
              }`}
              title="Dispatch complete database snapshot to zohaibmuaz@gmail.com right now"
            >
              {quickBackupSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Backup Emailed!</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>{isSendingQuickBackup ? "Sending..." : "Email Backup Now"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR HARMONIC JEWEL METRIC CARDS (Zero Grey Policy)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Electric Sapphire (Students Roster) */}
        <div
          onClick={() => onNavigate("students")}
          className="glass-card rounded-3xl p-5 border border-sky-400/40 hover:border-sky-400/80 bg-gradient-to-br from-sky-950/40 via-blue-950/30 to-indigo-950/20 shadow-[0_0_20px_rgba(14,165,233,0.15)] cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-400 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {data.studentsCount}
            </span>
            <span className="text-xs text-sky-200 font-bold">Students (E2)</span>
          </div>
          <p className="mt-2 text-xs text-sky-300 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Manage class directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Metric 2: Mint Emerald (Today's Lectures) */}
        <div
          onClick={() => onNavigate("timetable")}
          className="glass-card rounded-3xl p-5 border border-emerald-400/40 hover:border-emerald-400/80 bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-cyan-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
              Today&apos;s Lectures
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {data.todayClasses.length}
            </span>
            <span className="text-xs text-emerald-200 font-bold">
              scheduled for {todayName || "today"}
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-300 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>View weekly matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Metric 3: Radiant Amber (Pending Tasks & Alarms) */}
        <div
          onClick={() => onNavigate("tasks")}
          className="glass-card rounded-3xl p-5 border border-amber-400/40 hover:border-amber-400/80 bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-yellow-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Pending Tasks
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {data.pendingTasks.length}
            </span>
            <span className="text-xs text-amber-200 font-bold">
              {data.urgentTasksCount > 0 ? `(${data.urgentTasksCount} urgent)` : "on track"}
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-300 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Task Board & Alarms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Metric 4: Amethyst Purple (75% Attendance & Materials) */}
        <div
          onClick={() => onNavigate("attendance")}
          className="glass-card rounded-3xl p-5 border border-fuchsia-400/40 hover:border-fuchsia-400/80 bg-gradient-to-br from-fuchsia-950/40 via-purple-950/30 to-violet-950/20 shadow-[0_0_20px_rgba(217,70,239,0.15)] cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-fuchsia-400 uppercase tracking-wider">
              75% Hazri Engine
            </span>
            <div className="w-9 h-9 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {data.attendanceSessionsCount}
            </span>
            <span className="text-xs text-fuchsia-200 font-bold">Sessions Logged</span>
          </div>
          <p className="mt-2 text-xs text-fuchsia-300 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Scan Sheet or View Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DUAL OPERATIONAL WORKSPACES (Today's Classes & Urgent Deadlines)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Today's Lectures & Room Tracker (7 Cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Today&apos;s Lecture Schedule ({todayName || "Today"})
                </h3>
                <p className="text-[11px] text-slate-300">
                  Real-time room & faculty dispatch for BSCS 7th (E2)
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("timetable")}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Full Week</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.todayClasses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-300 space-y-2 bg-black/30 rounded-2xl border border-white/5">
              <CalendarCheck className="w-9 h-9 mx-auto text-emerald-400/40" />
              <p className="font-black text-white text-sm">No scheduled lectures today ({todayName})</p>
              <p className="text-slate-400 text-xs">
                Free day or off-session. Great time to organize course materials or groups!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.todayClasses.map((cls, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-emerald-400/40 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-400/30">
                        {cls.startTime} - {cls.endTime}
                      </span>
                      <span className="font-mono text-[11px] font-black text-white bg-white/10 px-2 py-0.5 rounded-md">
                        {cls.room || "Room TBA"}
                      </span>
                    </div>
                    <div className="font-black text-sm text-white truncate">
                      {cls.subjectName || "Subject Lecture"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Teacher: <strong className="text-slate-200">{cls.teacherName || "Faculty Member"}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate("teachers")}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold shrink-0 transition-all"
                  >
                    Teacher Desk
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Deadlines & Action Radar (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Active Tasks & Deadlines
                </h3>
                <p className="text-[11px] text-slate-300">
                  1-Click ready WhatsApp broadcast alerts
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("tasks")}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.pendingTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-300 space-y-2 bg-black/30 rounded-2xl border border-white/5">
              <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-400/50" />
              <p className="font-black text-white text-sm">All Tasks Completed!</p>
              <p className="text-slate-400 text-xs">
                Zero overdue assignments or teacher follow-ups.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.pendingTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/40 transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                          task.priority === "URGENT"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                        }`}
                      >
                        {task.priority || "MEDIUM"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {task.dueDate || "No Date"} {task.reminderTime || ""}
                      </span>
                    </div>
                    <div className="font-black text-xs text-white truncate">
                      {task.title}
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickTaskBroadcast(task)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white text-[11px] font-black shrink-0 flex items-center gap-1 transition-all"
                    title="Copy 1-Click WhatsApp Class Broadcast"
                  >
                    {copiedTaskId === task.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 1-CLICK EXECUTIVE POWER LAUNCHPAD (Quick Access Hub)                  */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">
              1-Click Executive Launchpad
            </h3>
          </div>
          <span className="text-xs text-slate-400">Fast Navigation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action 1: Attendance OCR */}
          <button
            onClick={() => onNavigate("attendance")}
            className="p-4 rounded-2xl bg-black/50 border border-fuchsia-400/30 hover:border-fuchsia-400/70 hover:bg-fuchsia-950/20 text-left transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 group-hover:scale-110 transition-transform mb-2">
              <Camera className="w-4 h-4" />
            </div>
            <div className="font-black text-xs text-white">Scan Hazri</div>
            <div className="text-[10px] text-slate-400 mt-0.5">2-Page Photo OCR</div>
          </button>

          {/* Action 2: Timetable Diff */}
          <button
            onClick={() => onNavigate("timetable")}
            className="p-4 rounded-2xl bg-black/50 border border-emerald-400/30 hover:border-emerald-400/70 hover:bg-emerald-950/20 text-left transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform mb-2">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="font-black text-xs text-white">Timetable Matrix</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Excel Diff & Broadcast</div>
          </button>

          {/* Action 3: Groups Builder */}
          <button
            onClick={() => onNavigate("groups")}
            className="p-4 rounded-2xl bg-black/50 border border-violet-400/30 hover:border-violet-400/70 hover:bg-violet-950/20 text-left transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center text-violet-300 group-hover:scale-110 transition-transform mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div className="font-black text-xs text-white">Project Groups</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Subject Isolated</div>
          </button>

          {/* Action 4: Course Materials */}
          <button
            onClick={() => onNavigate("materials")}
            className="p-4 rounded-2xl bg-black/50 border border-teal-400/30 hover:border-teal-400/70 hover:bg-teal-950/20 text-left transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform mb-2">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="font-black text-xs text-white">Drive & Materials</div>
            <div className="text-[10px] text-slate-400 mt-0.5">1-Click Auto Organizer</div>
          </button>

          {/* Action 5: Audit & Safe Backup */}
          <button
            onClick={() => onNavigate("logs")}
            className="p-4 rounded-2xl bg-black/50 border border-amber-400/30 hover:border-amber-400/70 hover:bg-amber-950/20 text-left transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform mb-2">
              <Database className="w-4 h-4" />
            </div>
            <div className="font-black text-xs text-white">Backups & Logs</div>
            <div className="text-[10px] text-slate-400 mt-0.5">10:00 PM Nightly Vault</div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECENT IMMUTABLE ACTIVITY STREAM (Mini Audit Ticker)                   */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-black text-white">
              Recent System Activity Stream (Permanent SQLite Log)
            </h3>
          </div>
          <button
            onClick={() => onNavigate("logs")}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.recentLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {data.recentLogs.map((log: any) => (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="font-bold text-white truncate">{log.summary}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-white/10 text-slate-300 border border-white/10 shrink-0">
                    {log.action}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
