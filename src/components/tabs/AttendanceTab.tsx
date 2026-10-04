"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Share2,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  User,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Copy,
  ChevronRight,
  BookOpen,
  SlidersHorizontal,
  Trash2,
  Eye,
  Info,
} from "lucide-react";

interface Subject {
  id: number;
  code: string;
  name: string;
  creditHours: number;
  teacherName: string;
  totalSessions: number;
  averagePercentage: number;
}

interface StudentAttendance {
  id: number;
  regNo: string;
  name: string;
  presentCount: number;
  totalCount: number;
  percentage: number;
  isCleared: boolean;
  shortfallClassesNeeded: number;
}

interface AttendanceSession {
  id: number;
  date: string;
  slotTime: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
}

interface DetectedRecord {
  studentId: number;
  regNo: string;
  name: string;
  pageNumber: number;
  status: "PRESENT" | "ABSENT";
  confidence: number;
}

interface StudentDossier {
  student: { id: number; regNo: string; name: string };
  subjectBreakdowns: {
    code: string;
    present: number;
    total: number;
    percentage: number;
    isCleared: boolean;
    classesNeeded: number;
  }[];
  history: {
    recordId: number;
    sessionId: number;
    date: string;
    slotTime: string | null;
    subjectCode: string;
    subjectName: string;
    status: string;
  }[];
}

export function AttendanceTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CLEARED" | "SHORT">("ALL");

  // Dual-Page OCR Modal State
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [page1File, setPage1File] = useState<File | null>(null);
  const [page2File, setPage2File] = useState<File | null>(null);
  const [page1Preview, setPage1Preview] = useState<string | null>(null);
  const [page2Preview, setPage2Preview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanDate, setScanDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Verification & Adjustment Popup Modal
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [verifySubjectId, setVerifySubjectId] = useState<number>(1);
  const [verifyDate, setVerifyDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [verifySlotTime, setVerifySlotTime] = useState<string>("Evening Slot");
  const [verifyRecords, setVerifyRecords] = useState<DetectedRecord[]>([]);
  const [page1SplitCount, setPage1SplitCount] = useState<number>(32);
  const [verifyActivePage, setVerifyActivePage] = useState<"ALL" | 1 | 2>("ALL");
  const [verifySearch, setVerifySearch] = useState<string>("");
  const [isSavingAttendance, setIsSavingAttendance] = useState<boolean>(false);

  // Dynamic Page Split Handler (Handles ANY number of students on Page 1 & Page 2)
  const handleSplitChange = (newCount: number) => {
    const total = verifyRecords.length > 0 ? verifyRecords.length : (students.length || 63);
    const count = Math.max(5, Math.min(newCount, total - 1));
    setPage1SplitCount(count);
    setVerifyRecords((prev) =>
      prev.map((rec, idx) => ({
        ...rec,
        pageNumber: idx < count ? 1 : 2,
      }))
    );
  };

  // Student Dossier Drawer / Modal
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDossier, setStudentDossier] = useState<StudentDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);

  // WhatsApp Alert Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Past Sessions Modal
  const [showSessionsModal, setShowSessionsModal] = useState<boolean>(false);

  // Fetch data
  const fetchData = async (subjectId?: number) => {
    setLoading(true);
    try {
      const url = subjectId ? `/api/attendance?subjectId=${subjectId}` : `/api/attendance`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects);
        setSelectedSubjectId(data.selectedSubjectId);
        setSessions(data.sessions);
        setStudents(data.students);
        if (!verifySubjectId && data.selectedSubjectId) {
          setVerifySubjectId(data.selectedSubjectId);
        }
      }
    } catch (err) {
      console.error("Failed to load attendance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubjectChange = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    setVerifySubjectId(subjectId);
    fetchData(subjectId);
  };

  // Open Student Dossier
  const handleOpenDossier = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setLoadingDossier(true);
    try {
      const res = await fetch(`/api/attendance?studentId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        setStudentDossier(data);
      }
    } catch (err) {
      console.error("Failed to fetch student dossier:", err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Run Dual-Page Scan (Real or Demo)
  const handleRunScan = async (isDemo = false) => {
    setIsScanning(true);
    try {
      const currentSubject = subjects.find((s) => s.id === (selectedSubjectId || 1));
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDemo,
          subjectCodeHint: currentSubject?.code || "CS-605",
          page1Provided: !!page1File,
          page2Provided: !!page2File,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingSessionId(null);
        setVerifyRecords(data.detectedRecords);
        setVerifyDate(scanDate);
        setVerifySubjectId(selectedSubjectId || 1);
        setShowScanModal(false);
        setShowVerifyModal(true);
      } else {
        alert(data.error || "Scan failed");
      }
    } catch (err) {
      console.error("Scan error:", err);
      alert("Failed to run signature scan. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  // Open any recorded session for editing
  const handleEditSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/attendance?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.session) {
        setEditingSessionId(data.session.id);
        setVerifySubjectId(data.session.subjectId);
        setVerifyDate(data.session.date);
        setVerifySlotTime(data.session.slotTime || "Evening Slot");
        setVerifyRecords(data.session.records);
        setShowSessionsModal(false);
        setShowVerifyModal(true);
      } else {
        alert(data.error || "Failed to load session details");
      }
    } catch (err) {
      console.error("Error loading session:", err);
      alert("Failed to load session for editing");
    }
  };

  // Toggle single student status in verification modal
  const handleToggleStatus = (studentId: number) => {
    setVerifyRecords((prev) =>
      prev.map((rec) =>
        rec.studentId === studentId
          ? { ...rec, status: rec.status === "PRESENT" ? "ABSENT" : "PRESENT" }
          : rec
      )
    );
  };

  // Set all to Present or Absent
  const handleSetAll = (status: "PRESENT" | "ABSENT") => {
    setVerifyRecords((prev) => prev.map((rec) => ({ ...rec, status })));
  };

  // Save Confirmed or Edited Attendance Session
  const handleSaveAttendance = async () => {
    if (!verifySubjectId || verifyRecords.length === 0) return;
    setIsSavingAttendance(true);

    try {
      const isEditing = editingSessionId !== null;
      const url = "/api/attendance";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? {
            sessionId: editingSessionId,
            date: verifyDate,
            slotTime: verifySlotTime,
            records: verifyRecords.map((r) => ({
              studentId: r.studentId,
              status: r.status,
            })),
          }
        : {
            subjectId: verifySubjectId,
            date: verifyDate,
            slotTime: verifySlotTime,
            records: verifyRecords.map((r) => ({
              studentId: r.studentId,
              status: r.status,
            })),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowVerifyModal(false);
        setEditingSessionId(null);
        await fetchData(verifySubjectId);
      } else {
        alert(data.error || "Failed to save attendance");
      }
    } catch (err) {
      console.error("Save attendance error:", err);
      alert("Error saving attendance to ledger");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Delete Attendance Session
  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this attendance session?")) return;
    try {
      const res = await fetch(`/api/attendance?sessionId=${sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData(selectedSubjectId || undefined);
      }
    } catch (err) {
      console.error("Delete session error:", err);
    }
  };

  // Generate 75% WhatsApp Short List
  const handleGenerateWhatsAppNotice = () => {
    const currentSub = subjects.find((s) => s.id === selectedSubjectId);
    const shortStudents = students.filter((s) => !s.isCleared);

    if (shortStudents.length === 0) {
      alert("Good news! All students have attendance >= 75% in this subject.");
      return;
    }

    let text = `*⚠️ UAF ATTENDANCE NOTICE — 75% SHORTFALL WARNING*\n`;
    text += `*Section:* BSCS 7th E2 (Evening)\n`;
    text += `*Subject:* ${currentSub?.code} — ${currentSub?.name}\n`;
    text += `*Total Classes Held:* ${sessions.length}\n`;
    text += `*Official Requirement:* Minimum 75% attendance for Final Exams.\n\n`;
    text += `Following students are currently in the *RED ZONE (<75%)*:\n`;
    text += `────────────────────────────\n`;

    shortStudents.forEach((st, idx) => {
      text += `${idx + 1}. *${st.name}* (${st.regNo})\n`;
      text += `   📊 Present: ${st.presentCount}/${st.totalCount} (${st.percentage}%)\n`;
      text += `   🚨 Needs to attend next *${st.shortfallClassesNeeded}* classes consecutively to clear!\n\n`;
    });

    text += `────────────────────────────\n`;
    text += `*Note:* Please contact the subject teacher or CR immediately if any discrepancies exist.`;

    setWhatsAppText(text);
    setShowWhatsAppModal(true);
  };

  // Copy personal WhatsApp alert for a single student
  const handleCopyPersonalAlert = (st: StudentDossier["student"], breakdown: any) => {
    const text = `Assalam-o-Alaikum ${st.name} (${st.regNo}),\n\nThis is a private alert regarding your attendance in *${breakdown.code}*.\n\nYour current attendance is *${breakdown.percentage}%* (${breakdown.present}/${breakdown.total} classes attended), which is below the mandatory 75% university examination requirement.\n\nYou need to attend the next *${breakdown.classesNeeded}* classes without missing any to restore exam eligibility.\n\nPlease ensure full attendance in upcoming lectures.`;
    navigator.clipboard.writeText(text);
    alert(`Personal WhatsApp warning copied for ${st.name}!`);
  };

  // Filter students list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.regNo.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "CLEARED") return s.isCleared;
    if (statusFilter === "SHORT") return !s.isCleared;
    return true;
  });

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const totalSafe = students.filter((s) => s.isCleared).length;
  const totalShort = students.filter((s) => !s.isCleared).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Subject Isolation Tabs */}
      <div className="glass-card p-6 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                Phase 3 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[11px] font-black uppercase tracking-wider">
                BSCS 7th E2
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                UAF 75% Rule
              </span>
            </div>
            <h2 className="text-2xl font-black text-indigo-950 dark:text-white tracking-tight flex items-center gap-2.5">
              <Camera className="w-6 h-6 text-emerald-400" />
              Attendance OCR & 75% Hazri Ledger
            </h2>
            <p className="text-xs text-emerald-800 dark:text-emerald-200 font-bold mt-1">
              Dual-Page Signature Detection (Pages 1 & 2) • Subject Isolation • Real-time 75% Exam Clearance
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowScanModal(true)}
              className="px-4 py-2.5 rounded-xl font-black text-xs glass-button bg-emerald-600/30 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/40 transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-500/25"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>📸 Scan Sheet (2-Page OCR)</span>
            </button>

            <button
              onClick={() => {
                setEditingSessionId(null);
                // Initialize verification records with all 63 students
                const initialRecords: DetectedRecord[] = students.map((s, idx) => ({
                  studentId: s.id,
                  regNo: s.regNo,
                  name: s.name,
                  pageNumber: idx < 32 ? 1 : 2,
                  status: "PRESENT",
                  confidence: 1.0,
                }));
                setVerifyRecords(initialRecords);
                setVerifySubjectId(selectedSubjectId || 1);
                setVerifyDate(new Date().toISOString().split("T")[0]);
                setShowVerifyModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs glass-button text-purple-200 border-purple-400/30 hover:bg-purple-500/30 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>⚡ Manual Entry</span>
            </button>

            <button
              onClick={handleGenerateWhatsAppNotice}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs glass-button text-amber-200 border-amber-400/30 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              title="Copy Short Attendance Warning for WhatsApp"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>📋 75% Short Notice</span>
            </button>

            <a
              href={`/api/attendance/export?subjectId=${selectedSubjectId || 1}`}
              download
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs glass-button text-sky-200 border-sky-400/30 hover:bg-sky-500/30 transition-all flex items-center gap-1.5"
              title="Export Official University Attendance Sheet for Teacher"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>📥 Export Excel</span>
            </a>
          </div>
        </div>

        {/* 6 Subject Isolation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          {subjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            return (
              <button
                key={sub.id}
                onClick={() => handleSubjectChange(sub.id)}
                className={`p-3 rounded-2xl text-left transition-all duration-200 relative overflow-hidden border ${
                  isSelected
                    ? "bg-gradient-to-br from-emerald-600/35 to-indigo-600/35 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                    : "glass-card border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
                <div className="font-mono font-black text-sm text-indigo-950 dark:text-white tracking-wide">
                  {sub.code}
                </div>
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 truncate mt-0.5" title={sub.name}>
                  {sub.name}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                  <span className="text-slate-400">{sub.totalSessions} classes</span>
                  <span
                    className={`font-black ${
                      sub.averagePercentage >= 75 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {sub.averagePercentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Subject Summary & Metrics Bar */}
      {activeSubject && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                  Classes Held
                </div>
                <div className="text-xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
                  <span>{sessions.length}</span>
                  <button
                    onClick={() => setShowSessionsModal(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                    title="View and edit all recorded classes"
                  >
                    (View & Edit)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick-Access Recent Class Chips */}
            {sessions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                <span className="text-[10px] text-slate-400 font-bold">Edit Class:</span>
                {sessions.slice(0, 3).map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => handleEditSession(sess.id)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/30 text-[10px] font-mono text-emerald-300 font-black transition-all flex items-center gap-1 shadow-sm"
                    title={`Click to edit attendance for ${sess.date}`}
                  >
                    <span>{sess.date}</span>
                    <span className="text-[9px] text-white">✏️</span>
                  </button>
                ))}
                {sessions.length > 3 && (
                  <button
                    onClick={() => setShowSessionsModal(true)}
                    className="text-[10px] text-emerald-400 font-bold hover:underline"
                  >
                    +{sessions.length - 3} more
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                Registered Students
              </div>
              <div className="text-xl font-black text-indigo-950 dark:text-white">
                {students.length} Students
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-emerald-500/25 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                🟢 Safe / Cleared (≥75%)
              </div>
              <div className="text-xl font-black text-emerald-400">
                {totalSafe} Students
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-rose-500/25 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                🔴 Short Attendance (&lt;75%)
              </div>
              <div className="text-xl font-black text-rose-400">
                {totalShort} Students
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name or Ag number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/30 border border-white/15 focus:border-emerald-400 text-xs text-white placeholder-slate-400 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "glass-button text-slate-300 hover:text-white"
            }`}
          >
            All ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter("CLEARED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "CLEARED"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                : "glass-button text-emerald-300 hover:text-white"
            }`}
          >
            🟢 Cleared ({totalSafe})
          </button>
          <button
            onClick={() => setStatusFilter("SHORT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "SHORT"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/25"
                : "glass-button text-rose-300 hover:text-white"
            }`}
          >
            🔴 Short ({totalShort})
          </button>
        </div>
      </div>

      {/* 4. Main 63-Student Hazri Ledger Table */}
      <div className="glass-card rounded-3xl border border-emerald-500/20 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            Loading attendance records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-bold">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-emerald-500/30 bg-emerald-950/40 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <th className="py-3.5 px-5 w-16">Sr.</th>
                  <th className="py-3.5 px-5 w-40">Reg. No. (Ag)</th>
                  <th className="py-3.5 px-5">Student Name</th>
                  <th className="py-3.5 px-5 w-44">Attended / Total</th>
                  <th className="py-3.5 px-5 w-36">Attendance %</th>
                  <th className="py-3.5 px-5 w-48 text-center">75% Exam Status</th>
                  <th className="py-3.5 px-5 w-24 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 text-xs font-semibold">
                {filteredStudents.map((st, idx) => {
                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleOpenDossier(st.id)}
                      className="hover:bg-emerald-500/10 cursor-pointer group transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-emerald-800 dark:text-emerald-200">
                        {st.regNo}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-indigo-950 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{st.name}</span>
                          {!st.isCleared && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Warning
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-indigo-900 dark:text-indigo-200">
                        <span className="font-bold text-sm text-white">
                          {st.presentCount}
                        </span>{" "}
                        / {st.totalCount} classes
                      </td>
                      <td className="py-3.5 px-5 font-mono font-black text-sm">
                        <span
                          className={st.isCleared ? "text-emerald-400" : "text-rose-400"}
                        >
                          {st.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {st.isCleared ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            CLEARED (Safe)
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-black uppercase tracking-wider"
                            title={`Needs ${st.shortfallClassesNeeded} more classes to reach 75%`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            SHORT (Need +{st.shortfallClassesNeeded})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all">
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Dual-Page OCR Upload Modal (Pages 1 & 2) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl rounded-3xl border border-emerald-500/30 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowScanModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  📸 Scan Attendance Sheet (2-Page OCR)
                </h3>
                <p className="text-xs text-emerald-300 font-bold">
                  Class roster has 63 students across 2 pages (Page 1: 1–32, Page 2: 33–63).
                </p>
              </div>
            </div>

            {/* Subject & Date Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Subject for Attendance:
                </label>
                <select
                  value={selectedSubjectId || 1}
                  onChange={(e) => handleSubjectChange(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-emerald-400"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-slate-900 text-white">
                      {sub.code} — {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Session Date:
                </label>
                <input
                  type="date"
                  value={scanDate}
                  onChange={(e) => setScanDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Flexible Page Size Adjustment */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/35 border border-white/10 mb-4 text-xs">
              <div>
                <span className="font-black text-white block">Flexible Page Split:</span>
                <span className="text-[11px] text-slate-400 font-bold">
                  How many students are on Page 1? (Remaining go to Page 2 automatically)
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 border border-white/20 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleSplitChange(page1SplitCount - 1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white font-black text-sm flex items-center justify-center transition-all"
                  title="Decrease Page 1 count"
                >
                  -
                </button>
                <span className="font-mono font-black text-sm text-emerald-400 px-2 min-w-8 text-center">
                  {page1SplitCount}
                </span>
                <button
                  type="button"
                  onClick={() => handleSplitChange(page1SplitCount + 1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white font-black text-sm flex items-center justify-center transition-all"
                  title="Increase Page 1 count"
                >
                  +
                </button>
              </div>
            </div>

            {/* 2-Page Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Page 1 */}
              <div className="border-2 border-dashed border-emerald-500/30 rounded-2xl p-4 text-center bg-black/20 hover:border-emerald-400/60 transition-colors">
                <div className="font-black text-xs text-emerald-300 uppercase tracking-wider mb-2">
                  📄 Page 1 (Rolls 1 to {page1SplitCount})
                </div>
                {page1Preview ? (
                  <div className="relative">
                    <img
                      src={page1Preview}
                      alt="Page 1 preview"
                      className="w-full h-32 object-cover rounded-xl border border-white/10"
                    />
                    <button
                      onClick={() => {
                        setPage1File(null);
                        setPage1Preview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-6">
                    <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <span className="text-xs font-bold text-white block">
                      Upload Page 1 Photo
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Contains signatures for students 1–{page1SplitCount}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPage1File(file);
                          setPage1Preview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Page 2 */}
              <div className="border-2 border-dashed border-purple-500/30 rounded-2xl p-4 text-center bg-black/20 hover:border-purple-400/60 transition-colors">
                <div className="font-black text-xs text-purple-300 uppercase tracking-wider mb-2">
                  📄 Page 2 (Rolls {page1SplitCount + 1} to {students.length || 63})
                </div>
                {page2Preview ? (
                  <div className="relative">
                    <img
                      src={page2Preview}
                      alt="Page 2 preview"
                      className="w-full h-32 object-cover rounded-xl border border-white/10"
                    />
                    <button
                      onClick={() => {
                        setPage2File(null);
                        setPage2Preview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-6">
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
                    <span className="text-xs font-bold text-white block">
                      Upload Page 2 Photo
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Contains signatures for students 33–63
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPage2File(file);
                          setPage2Preview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Test Demo Button & Run Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleRunScan(true)}
                disabled={isScanning}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl glass-button text-amber-300 hover:text-white border-amber-400/30 hover:bg-amber-500/20 text-xs font-bold flex items-center justify-center gap-2"
                title="Don't have physical sheets right now? Click to test with realistic signatures"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Test with Demo Sheet (Instant Preview)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunScan(false)}
                disabled={isScanning || (!page1File && !page2File)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Signatures...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Scan Uploaded Photos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Interactive Verification & Adjustment Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-emerald-500/30 p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <button
              onClick={() => {
                setShowVerifyModal(false);
                setEditingSessionId(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    editingSessionId
                      ? "bg-amber-500/25 text-amber-300 border border-amber-400/40"
                      : "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                  }`}
                >
                  {editingSessionId ? `✏️ Editing Session #${editingSessionId}` : "Verification Window"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  <span className="text-emerald-400 font-bold">
                    {verifyRecords.filter((r) => r.status === "PRESENT").length} P
                  </span>{" "}
                  /{" "}
                  <span className="text-rose-400 font-bold">
                    {verifyRecords.filter((r) => r.status === "ABSENT").length} A
                  </span>
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                {editingSessionId
                  ? `✏️ Edit Class Attendance (${activeSubject?.code})`
                  : "Review & Confirm Detected Signatures"}
              </h3>
              <p className="text-xs text-emerald-300 font-bold">
                {editingSessionId
                  ? "Click P (Green) or A (Red) on any student to update their attendance for this session. Changes update all ledger metrics in real time."
                  : "Click any student's P or A badge to toggle attendance before adding to the permanent ledger."}
              </p>
            </div>

            {/* Meta Options (Subject, Date, Quick Select) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-4 text-xs font-bold">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Subject:</label>
                <select
                  value={verifySubjectId}
                  onChange={(e) => setVerifySubjectId(parseInt(e.target.value, 10))}
                  disabled={editingSessionId !== null}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-white outline-none disabled:opacity-60"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Date:</label>
                <input
                  type="date"
                  value={verifyDate}
                  onChange={(e) => setVerifyDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Quick Batch Action:</label>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSetAll("PRESENT")}
                    className="flex-1 py-1 rounded-md bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] hover:bg-emerald-500/40"
                  >
                    All Present (P)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAll("ABSENT")}
                    className="flex-1 py-1 rounded-md bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] hover:bg-rose-500/40"
                  >
                    All Absent (A)
                  </button>
                </div>
              </div>
            </div>

            {/* Page 1 vs Page 2 Tabs & Dynamic Split Stepper & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setVerifyActivePage("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    verifyActivePage === "ALL"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : "glass-button text-slate-300 hover:text-white"
                  }`}
                >
                  👥 All Students ({verifyRecords.length})
                </button>
                <button
                  onClick={() => setVerifyActivePage(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    verifyActivePage === 1
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                      : "glass-button text-slate-300 hover:text-white"
                  }`}
                >
                  📄 Page 1 (Rolls 1–{page1SplitCount})
                </button>
                <button
                  onClick={() => setVerifyActivePage(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    verifyActivePage === 2
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                      : "glass-button text-slate-300 hover:text-white"
                  }`}
                >
                  📄 Page 2 (Rolls {page1SplitCount + 1}–{verifyRecords.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Dynamic Page 1 Split Stepper */}
                <div className="flex items-center gap-1 bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs">
                  <span className="text-slate-400 font-bold text-[10px]">P1 Size:</span>
                  <button
                    type="button"
                    onClick={() => handleSplitChange(page1SplitCount - 1)}
                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center"
                    title="Decrease Page 1 count"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-emerald-400 text-xs px-1">
                    {page1SplitCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSplitChange(page1SplitCount + 1)}
                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center"
                    title="Increase Page 1 count"
                  >
                    +
                  </button>
                </div>

                <div className="relative w-40">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter roster..."
                    value={verifySearch}
                    onChange={(e) => setVerifySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-[11px] text-white placeholder-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Student List in Verification */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-[50vh]">
              {verifyRecords
                .filter((r) => verifyActivePage === "ALL" || r.pageNumber === verifyActivePage)
                .filter(
                  (r) =>
                    r.name.toLowerCase().includes(verifySearch.toLowerCase()) ||
                    r.regNo.toLowerCase().includes(verifySearch.toLowerCase())
                )
                .map((rec) => {
                  const isPresent = rec.status === "PRESENT";
                  return (
                    <div
                      key={rec.studentId}
                      onClick={() => handleToggleStatus(rec.studentId)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                        isPresent
                          ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60"
                          : "bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400 w-6">
                          {rec.studentId}
                        </span>
                        <div>
                          <div className="font-black text-xs text-white flex items-center gap-2">
                            <span>{rec.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white/10 text-slate-300">
                              {rec.pageNumber === 1 ? "Page 1" : "Page 2"}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-emerald-300">
                            {rec.regNo}
                          </div>
                        </div>
                      </div>

                      {/* Compact P (Green) and A (Red) toggle buttons */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyRecords((prev) =>
                              prev.map((r) =>
                                r.studentId === rec.studentId ? { ...r, status: "PRESENT" } : r
                              )
                            );
                          }}
                          className={`w-9 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center font-mono ${
                            isPresent
                              ? "bg-emerald-500 text-white border border-emerald-300 shadow-md shadow-emerald-500/50 scale-105"
                              : "bg-black/40 text-emerald-400/60 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                          }`}
                          title="Mark Present (P)"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyRecords((prev) =>
                              prev.map((r) =>
                                r.studentId === rec.studentId ? { ...r, status: "ABSENT" } : r
                              )
                            );
                          }}
                          className={`w-9 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center font-mono ${
                            !isPresent
                              ? "bg-rose-600 text-white border border-rose-400 shadow-md shadow-rose-500/50 scale-105"
                              : "bg-black/40 text-rose-400/60 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300"
                          }`}
                          title="Mark Absent (A)"
                        >
                          A
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                Click P (Green) or A (Red), or click the row to toggle.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyModal(false);
                    setEditingSessionId(null);
                  }}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                >
                  {isSavingAttendance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{editingSessionId ? "Updating Session..." : "Saving to SQLite..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingSessionId ? "💾 Save Changes & Update Ledger" : "Confirm & Add to Ledger"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Student Individual Dossier Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] rounded-3xl border border-indigo-500/30 p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <button
              onClick={() => {
                setSelectedStudentId(null);
                setStudentDossier(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDossier || !studentDossier ? (
              <div className="py-20 text-center text-xs text-indigo-300 font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                Loading student attendance dossier...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                      Student Attendance Profile
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">
                      {studentDossier.student.name}
                    </h3>
                    <p className="font-mono text-xs text-emerald-400">
                      {studentDossier.student.regNo} • BSCS 7th E2
                    </p>
                  </div>
                </div>

                {/* Subject-Wise Clearance Breakdown */}
                <div className="mb-5">
                  <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    7th Semester Course-Wise Clearance Status:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {studentDossier.subjectBreakdowns.map((sb) => (
                      <div
                        key={sb.code}
                        className={`p-3 rounded-2xl border text-left ${
                          sb.isCleared
                            ? "bg-emerald-950/25 border-emerald-500/30"
                            : "bg-rose-950/25 border-rose-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono font-black">
                          <span className="text-white">{sb.code}</span>
                          <span
                            className={sb.isCleared ? "text-emerald-400" : "text-rose-400"}
                          >
                            {sb.percentage}%
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {sb.present}/{sb.total} attended
                        </div>
                        {!sb.isCleared && (
                          <div className="mt-2 pt-2 border-t border-rose-500/20 text-[10px] text-rose-300 font-bold flex items-center justify-between">
                            <span>Need +{sb.classesNeeded} classes</span>
                            <button
                              onClick={() => handleCopyPersonalAlert(studentDossier.student, sb)}
                              className="text-[9px] underline hover:text-white"
                              title="Copy personal WhatsApp alert"
                            >
                              Copy Alert
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session by Session History */}
                <div className="flex-1 overflow-y-auto">
                  <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    Session-by-Session History:
                  </div>
                  {studentDossier.history.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No attendance sessions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {studentDossier.history.map((h) => {
                        const isPresent = h.status === "PRESENT";
                        return (
                          <div
                            key={h.recordId}
                            className="p-2.5 rounded-xl bg-black/30 border border-white/10 hover:border-emerald-500/40 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono text-white font-bold">{h.date}</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {h.subjectCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(null);
                                  handleEditSession(h.sessionId);
                                }}
                                className="text-[10px] font-bold text-slate-400 hover:text-emerald-300 underline"
                                title="Edit this entire class session"
                              >
                                Edit Session
                              </button>
                              <span
                                className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                                  isPresent
                                    ? "bg-emerald-500/25 border border-emerald-400/60 text-emerald-300"
                                    : "bg-rose-500/25 border border-rose-400/60 text-rose-300"
                                }`}
                                title={isPresent ? "Present (P)" : "Absent (A)"}
                              >
                                {isPresent ? "P" : "A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 8. WhatsApp Short Notice Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl rounded-3xl border border-amber-500/30 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  📋 WhatsApp Short Attendance Warning
                </h3>
                <p className="text-xs text-amber-300 font-bold">
                  Ready-to-paste broadcast message for the class WhatsApp group.
                </p>
              </div>
            </div>

            <textarea
              readOnly
              rows={12}
              value={whatsAppText}
              className="w-full p-3.5 rounded-2xl bg-black/50 border border-white/15 font-mono text-xs text-white outline-none mb-4 resize-none leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy WhatsApp Message"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Past Sessions History Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl max-h-[80vh] rounded-3xl border border-emerald-500/30 p-6 shadow-2xl flex flex-col relative">
            <button
              onClick={() => setShowSessionsModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-1">
              Recorded Attendance Sessions
            </h3>
            <p className="text-xs text-emerald-300 font-bold mb-4">
              Subject: {activeSubject?.code} — {activeSubject?.name}
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No attendance sessions recorded yet for this subject.
                </div>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 hover:border-emerald-400/50 flex items-center justify-between transition-all group"
                  >
                    <div
                      onClick={() => handleEditSession(sess.id)}
                      className="cursor-pointer flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white group-hover:text-emerald-300 transition-colors">
                          📅 {sess.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          {sess.slotTime || "Evening Slot"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">
                          ● {sess.presentCount} Present (P)
                        </span>
                        <span className="text-rose-400 font-bold">
                          ● {sess.absentCount} Absent (A)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSession(sess.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 text-xs font-black transition-all flex items-center gap-1.5 shadow-md"
                        title="Click to edit student P/A attendance for this class"
                      >
                        <span>✏️ Edit Class</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/30 border border-transparent hover:border-rose-500/40 transition-all"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
