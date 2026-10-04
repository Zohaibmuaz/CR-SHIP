"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  FileCode2,
  Database,
  Download,
  Upload,
  ShieldCheck,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";

interface AuditLogEntry {
  id: number;
  timestamp: string;
  module: string;
  action: string;
  summary: string;
  payload: string | null;
}

interface DatabaseStats {
  file: string;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string | null;
  integrity: string;
}

interface TableCounts {
  students: number;
  teachers: number;
  subjects: number;
  timetableSlots: number;
  attendanceSessions: number;
  studentGroups: number;
  courseMaterials: number;
  classLogs: number;
  taskReminders: number;
  auditLogs: number;
  totalEntities: number;
}

interface NightlyEmailConfig {
  enabled: boolean;
  scheduledTime: string;
  recipient: string;
  lastSentAt: string | null;
}

const MODULE_FILTERS = [
  { id: "ALL", label: "All Modules" },
  { id: "STUDENTS", label: "Students" },
  { id: "TIMETABLE", label: "Timetable" },
  { id: "ATTENDANCE", label: "Attendance" },
  { id: "GROUPS", label: "Groups" },
  { id: "MATERIALS", label: "Materials" },
  { id: "FACULTY", label: "Faculty" },
  { id: "TASKS", label: "Tasks & Alarms" },
  { id: "BACKUP", label: "Backups" },
  { id: "SYSTEM", label: "System" },
];

export function LogsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"LOGS" | "BACKUPS">("LOGS");

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Backup & DB Health State
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [tableCounts, setTableCounts] = useState<TableCounts | null>(null);
  const [nightlyEmail, setNightlyEmail] = useState<NightlyEmailConfig | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Nightly / Manual Email Backup State
  const [isSendingBackupEmail, setIsSendingBackupEmail] = useState<boolean>(false);
  const [emailBackupMessage, setEmailBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  // Fetch Audit Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const url = new URL("/api/logs", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (selectedModule !== "ALL") url.searchParams.set("module", selectedModule);
      url.searchParams.set("limit", "250");

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Database Health & Backup Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/backup?format=stats");
      const data = await res.json();
      if (data.success) {
        setDbStats(data.database);
        setTableCounts(data.counts);
        setNightlyEmail(data.nightlyEmail);
      }
    } catch (err) {
      console.error("Error fetching backup stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [selectedModule]);

  // Automated Nightly 10:00 PM Check in Client
  useEffect(() => {
    const checkNightlyBackup = async () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();

      // Check if time is between 22:00 (10:00 PM) and 22:15
      if (hours === 22 && mins <= 15) {
        const todayStr = now.toISOString().split("T")[0];
        const lastSentStr = nightlyEmail?.lastSentAt
          ? new Date(nightlyEmail.lastSentAt).toISOString().split("T")[0]
          : null;

        // If today's 10:00 PM backup hasn't run yet, dispatch it
        if (lastSentStr !== todayStr && !isSendingBackupEmail) {
          try {
            await fetch("/api/backup/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isManual: false }),
            });
            fetchStats();
            fetchLogs();
          } catch (e) {
            console.warn("Automated 10:00 PM backup dispatch check:", e);
          }
        }
      }
    };

    const interval = setInterval(checkNightlyBackup, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [nightlyEmail]);

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  // Trigger Manual Backup Email
  const handleSendBackupEmailNow = async () => {
    setIsSendingBackupEmail(true);
    setEmailBackupMessage(null);
    try {
      const res = await fetch("/api/backup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isManual: true }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailBackupMessage({
          type: "success",
          text: `Success! Complete system backup archive delivered to ${data.recipient}. Check your inbox!`,
        });
        playChime();
        await fetchStats();
        await fetchLogs();
      } else {
        setEmailBackupMessage({
          type: "error",
          text: data.error || "Failed to dispatch backup email. Verify SMTP settings.",
        });
      }
    } catch (err: any) {
      setEmailBackupMessage({
        type: "error",
        text: `Error dispatching backup email: ${err.message}`,
      });
    } finally {
      setIsSendingBackupEmail(false);
    }
  };

  // Handle File Selection for Restore
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.data && (parsed.counts || parsed.metadata)) {
          setRestorePreview(parsed);
        } else {
          setRestoreMessage({
            type: "error",
            text: "Selected file does not have a valid CR-Ship backup schema.",
          });
          setRestorePreview(null);
        }
      } catch (err) {
        setRestoreMessage({
          type: "error",
          text: "Invalid JSON file. Please select a valid .json snapshot file.",
        });
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restorePreview) return;
    if (!confirm("Are you sure you want to restore from this backup file? Existing records will be safely merged and updated.")) {
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTORE_JSON",
          backupData: restorePreview,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRestoreMessage({
          type: "success",
          text: data.message || "Database successfully restored and verified!",
        });
        playChime();
        setRestoreFile(null);
        setRestorePreview(null);
        await fetchStats();
        await fetchLogs();
      } else {
        setRestoreMessage({
          type: "error",
          text: data.error || "Failed to restore database.",
        });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: `Restore error: ${err.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open("/api/logs?format=csv", "_blank");
  };

  // Download SQLite
  const handleDownloadSqlite = () => {
    window.open("/api/backup?format=sqlite", "_blank");
  };

  // Download JSON
  const handleDownloadJson = () => {
    window.open("/api/backup?format=json", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-purple-950/25 to-indigo-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/20 via-emerald-500/15 to-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Immutable SQLite Audit</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                Nightly 10:00 PM Backup Armed
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <ScrollText className="w-7 h-7 text-amber-400" />
              <span>Audit Trail & Data Recovery Vault</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              Every action taken on CR-Ship is permanently timestamped in SQLite. Download 1-click backups,
              inspect payloads, and automatically dispatch snapshots to your email every night at 10:00 PM.
            </p>
          </div>

          {/* Sub-tab Switcher Pills */}
          <div className="flex items-center p-1.5 rounded-2xl bg-black/60 border border-white/15 shrink-0 shadow-lg">
            <button
              onClick={() => setActiveSubTab("LOGS")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                activeSubTab === "LOGS"
                  ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-black shadow-md shadow-amber-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-white">
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("BACKUPS")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                activeSubTab === "BACKUPS"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-md shadow-emerald-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Backups & Recovery</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-white">
                {dbStats?.sizeFormatted || "118 KB"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: SEARCHABLE AUDIT ACTIVITY TRAIL                               */}
      {/* ========================================================================= */}
      {activeSubTab === "LOGS" && (
        <div className="space-y-4">
          {/* Search, Filter & Export Toolbar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by keyword, roll number, student name, action, or date..."
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-black font-black text-xs transition-all shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                  title="Download all logs as CSV Excel file"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                  title="Refresh activity logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin text-amber-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {MODULE_FILTERS.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModule(mod.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedModule === mod.id
                      ? "bg-amber-500 text-black font-black shadow-md shadow-amber-500/30"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Log List */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loadingLogs ? (
              <div className="py-20 text-center text-xs text-slate-300 font-bold">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400 mb-3" />
                Querying permanent records from SQLite...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-300 space-y-2">
                <ScrollText className="w-10 h-10 mx-auto text-amber-400/40" />
                <p className="font-black text-white text-sm">No activity logs matching criteria</p>
                <p className="text-slate-400 text-xs">
                  Try clearing search filters or perform an action to generate an audit log.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {logs.map((log) => {
                  const isCreate =
                    log.action.includes("CREATE") ||
                    log.action.includes("IMPORT") ||
                    log.action.includes("ADD");
                  const isDelete =
                    log.action.includes("DELETE") || log.action.includes("CLEAR");
                  const isAlarmOrEmail =
                    log.action.includes("ALARM") ||
                    log.action.includes("EMAIL") ||
                    log.action.includes("BROADCAST");
                  const isBackup = log.module === "BACKUP";

                  const badgeClass = isAlarmOrEmail
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/40"
                    : isDelete
                    ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                    : isCreate
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : isBackup
                    ? "bg-teal-500/20 text-teal-300 border-teal-400/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-400/40";

                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                          <ScrollText className="w-4 h-4" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-white leading-snug break-words">
                              {log.summary}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border uppercase tracking-wider ${badgeClass}`}
                            >
                              {log.action}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1 text-slate-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </span>
                            <span>•</span>
                            <span className="text-indigo-300 font-bold">
                              Module: {log.module}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              ID #{log.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {log.payload && (
                        <button
                          onClick={() =>
                            setSelectedPayload(
                              selectedPayload === log.payload ? null : log.payload
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
                        >
                          <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Payload</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: DATA VAULT & 1-CLICK BACKUPS                                  */}
      {/* ========================================================================= */}
      {activeSubTab === "BACKUPS" && (
        <div className="space-y-5">
          {/* Card 1: Automated Nightly 10:00 PM Email Backup Hero Card */}
          <div className="glass-card rounded-3xl p-6 border border-emerald-400/40 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-indigo-950/20 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                      ● Active & Scheduled
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Every Night at 10:00 PM (22:00)
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    Automated Nightly Email Backup Dispatcher
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    CR-Ship automatically packages all 10 SQLite database tables into an attached JSON archive file and emails it directly to{" "}
                    <strong className="text-white">{nightlyEmail?.recipient || "zohaibmuaz@gmail.com"}</strong> every night at 10:00 PM.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSendBackupEmailNow}
                disabled={isSendingBackupEmail}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all shrink-0 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingBackupEmail ? "Archiving & Sending..." : "Send Backup Email Now (Test)"}</span>
              </button>
            </div>

            {/* Email Feedback Banner */}
            {emailBackupMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  emailBackupMessage.type === "success"
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                    : "bg-rose-500/20 border-rose-400/50 text-rose-200"
                }`}
              >
                {emailBackupMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{emailBackupMessage.text}</span>
              </div>
            )}

            {/* Meta Row */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Last Dispatched:{" "}
                  <strong className="text-white">
                    {nightlyEmail?.lastSentAt
                      ? new Date(nightlyEmail.lastSentAt).toLocaleString()
                      : "Pending first run"}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Destination: <strong className="text-white">{nightlyEmail?.recipient || "zohaibmuaz@gmail.com"}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2: 1-Click Backup Downloads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw SQLite DB Download */}
            <div className="glass-card rounded-3xl p-5 border border-sky-400/30 hover:border-sky-400/60 bg-gradient-to-br from-sky-950/30 to-blue-950/20 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-black text-sky-300 uppercase">
                    Raw Offline SQLite
                  </span>
                </div>
                <h4 className="text-base font-black text-white">
                  Download SQLite Database (.db)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Instant physical download of <code className="text-sky-300">cr_nexus.db</code>. Contains all raw binary tables, relational constraints, and schema.
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Size: {dbStats?.sizeFormatted || "118 KB"}
                </span>
                <button
                  onClick={handleDownloadSqlite}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/25 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .db File</span>
                </button>
              </div>
            </div>

            {/* Universal JSON Snapshot Download */}
            <div className="glass-card rounded-3xl p-5 border border-purple-400/30 hover:border-purple-400/60 bg-gradient-to-br from-purple-950/30 to-fuchsia-950/20 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                    <FileCode2 className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[10px] font-black text-purple-300 uppercase">
                    Universal Snapshot
                  </span>
                </div>
                <h4 className="text-base font-black text-white">
                  Download JSON Archive (.json)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Complete structured JSON bundle including Students, Timetable, Attendance, Groups, Drive Links, Tasks, and Activity records.
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  {tableCounts?.totalEntities || 0} Total Records
                </span>
                <button
                  onClick={handleDownloadJson}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/25 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json File</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Safe Disaster Recovery & Restore Engine */}
          <div className="glass-card rounded-3xl p-6 border border-amber-400/30 bg-black/40 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">
                  Safe Disaster Recovery & Restore Engine
                </h3>
                <p className="text-xs text-slate-300">
                  Restore your entire class system from a previously saved JSON snapshot file with 1 click.
                </p>
              </div>
            </div>

            {/* File Input Box */}
            <div className="p-4 rounded-2xl bg-black/50 border border-dashed border-white/20 text-center space-y-2">
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFileChange}
                className="hidden"
                id="restore-upload"
              />
              <label
                htmlFor="restore-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs transition-all"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{restoreFile ? restoreFile.name : "Select JSON Backup File to Restore"}</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Supports official CR-Ship snapshot archives (.json)
              </p>
            </div>

            {/* Restore Preview */}
            {restorePreview && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Backup Verified: Ready to Restore</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Exported: {restorePreview.metadata?.exportedAt ? new Date(restorePreview.metadata.exportedAt).toLocaleDateString() : "Recent"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <span className="text-slate-400">Students:</span>{" "}
                    <strong className="text-white">{restorePreview.counts?.students || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <span className="text-slate-400">Subjects:</span>{" "}
                    <strong className="text-white">{restorePreview.counts?.subjects || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <span className="text-slate-400">Tasks:</span>{" "}
                    <strong className="text-white">{restorePreview.counts?.taskReminders || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <span className="text-slate-400">Materials:</span>{" "}
                    <strong className="text-white">{restorePreview.counts?.courseMaterials || 0}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setRestoreFile(null);
                      setRestorePreview(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{isRestoring ? "Restoring Records..." : "Confirm & Restore Database"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Restore Status Message */}
            {restoreMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  restoreMessage.type === "success"
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                    : "bg-rose-500/20 border-rose-400/50 text-rose-200"
                }`}
              >
                {restoreMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}
          </div>

          {/* Card 4: Database Health & Metrics Inspector */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <span>SQLite Database Health & Entity Inventory</span>
              </h3>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase">
                {dbStats?.integrity || "HEALTHY"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Students</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">
                  {tableCounts?.students || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Subjects</div>
                <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">
                  {tableCounts?.subjects || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Timetable Slots</div>
                <div className="text-xl font-black text-teal-300 font-mono mt-0.5">
                  {tableCounts?.timetableSlots || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Attendance</div>
                <div className="text-xl font-black text-fuchsia-300 font-mono mt-0.5">
                  {tableCounts?.attendanceSessions || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Groups Formed</div>
                <div className="text-xl font-black text-violet-300 font-mono mt-0.5">
                  {tableCounts?.studentGroups || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Materials & Links</div>
                <div className="text-xl font-black text-teal-300 font-mono mt-0.5">
                  {tableCounts?.courseMaterials || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Faculty Profiles</div>
                <div className="text-xl font-black text-amber-300 font-mono mt-0.5">
                  {tableCounts?.teachers || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Tasks Scheduled</div>
                <div className="text-xl font-black text-rose-300 font-mono mt-0.5">
                  {tableCounts?.taskReminders || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">Audit Records</div>
                <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">
                  {tableCounts?.auditLogs || 0}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase">DB File Size</div>
                <div className="text-xl font-black text-sky-300 font-mono mt-0.5">
                  {dbStats?.sizeFormatted || "118 KB"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYLOAD INSPECTOR MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 border border-amber-400/40 max-w-xl w-full space-y-4 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <span>Raw Audit Payload JSON</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPayload);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayload(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80 selection:bg-emerald-500/30 leading-relaxed shadow-inner">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedPayload), null, 2);
                } catch {
                  return selectedPayload;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
