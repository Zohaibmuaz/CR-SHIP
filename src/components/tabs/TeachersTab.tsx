"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Share2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  ExternalLink,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BookOpen,
  CalendarDays,
  Send,
  Building,
  Info,
} from "lucide-react";

interface TeacherSubject {
  id: number;
  code: string;
  name: string;
  creditHours: number;
}

interface TeacherItem {
  id: number;
  name: string;
  phone: string;
  email: string;
  office: string;
  bestTimes: string;
  department: string;
  role: string;
  subjects: TeacherSubject[];
  stats: {
    held: number;
    cancelled: number;
    rescheduled: number;
    holiday: number;
    total: number;
    deliveryRate: number;
  };
}

interface SubjectItem {
  id: number;
  code: string;
  name: string;
  teacherId: number | null;
  teacherName: string;
}

interface ClassLogItem {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  teacherPhone: string;
  date: string;
  status: "HELD" | "CANCELLED" | "RESCHEDULED" | "HOLIDAY" | string;
  topicCovered: string;
  reason: string;
  createdAt?: string;
}

interface SummaryStats {
  totalFaculty: number;
  withPhoneCount: number;
  totalClassesHeld: number;
  totalClassesCancelled: number;
  totalClassesRescheduled: number;
  totalClassesHoliday: number;
  globalDeliveryRate: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string; badge: string }
> = {
  HELD: {
    label: "Class Held",
    icon: CheckCircle2,
    color: "text-emerald-300",
    bg: "bg-emerald-500/20",
    border: "border-emerald-400/40",
    badge: "bg-emerald-500 text-black",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-rose-300",
    bg: "bg-rose-500/20",
    border: "border-rose-400/40",
    badge: "bg-rose-500 text-white",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    icon: Clock,
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    border: "border-amber-400/40",
    badge: "bg-amber-500 text-black",
  },
  HOLIDAY: {
    label: "Holiday / Off",
    icon: Calendar,
    color: "text-indigo-300",
    bg: "bg-indigo-500/20",
    border: "border-indigo-400/40",
    badge: "bg-indigo-500 text-white",
  },
};

export default function TeachersTab() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classLogs, setClassLogs] = useState<ClassLogItem[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    totalFaculty: 6,
    withPhoneCount: 4,
    totalClassesHeld: 0,
    totalClassesCancelled: 0,
    totalClassesRescheduled: 0,
    totalClassesHoliday: 0,
    globalDeliveryRate: 100,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Class Conduction Table
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchLogQuery, setSearchLogQuery] = useState<string>("");

  // Edit Teacher Profile Modal State
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [teacherNameInput, setTeacherNameInput] = useState<string>("");
  const [teacherPhoneInput, setTeacherPhoneInput] = useState<string>("");
  const [teacherOfficeInput, setTeacherOfficeInput] = useState<string>("");
  const [teacherBestTimesInput, setTeacherBestTimesInput] = useState<string>("");

  // Log Class Conduction Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [logSubjectId, setLogSubjectId] = useState<number>(1);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [logStatus, setLogStatus] = useState<string>("HELD");
  const [logTopic, setLogTopic] = useState<string>("");
  const [logReason, setLogReason] = useState<string>("");
  const [editingLogId, setEditingLogId] = useState<number | null>(null);

  // Polite WhatsApp Message to Teacher Modal State
  const [showTeacherMessageModal, setShowTeacherMessageModal] = useState<boolean>(false);
  const [selectedTeacherForMessage, setSelectedTeacherForMessage] = useState<TeacherItem | null>(null);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [messageCustomText, setMessageCustomText] = useState<string>("");
  const [copiedTeacherMessage, setCopiedTeacherMessage] = useState<boolean>(false);

  // Student WhatsApp Alert Modal State (for Cancelled/Rescheduled classes)
  const [showStudentAlertModal, setShowStudentAlertModal] = useState<boolean>(false);
  const [studentAlertText, setStudentAlertText] = useState<string>("");
  const [copiedStudentAlert, setCopiedStudentAlert] = useState<boolean>(false);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers);
        setSubjects(data.subjects);
        setClassLogs(data.classLogs);
        setStats(data.stats);
        if (data.subjects.length > 0 && !logSubjectId) {
          setLogSubjectId(data.subjects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load faculty desk data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----------------------------------------------------
  // Save Teacher Profile
  // ----------------------------------------------------
  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TEACHER",
          id: editingTeacher.id,
          name: teacherNameInput,
          phone: teacherPhoneInput,
          office: teacherOfficeInput,
          bestTimes: teacherBestTimesInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingTeacher(null);
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to save teacher profile:", err);
    }
  };

  // ----------------------------------------------------
  // Save Class Conduction Log (Create or Edit)
  // ----------------------------------------------------
  const handleSaveClassLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLogId) {
        const res = await fetch("/api/teachers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLogId,
            status: logStatus,
            topicCovered: logTopic,
            reason: logReason,
            date: logDate,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowLogModal(false);
          resetLogForm();
          await fetchData();
        }
      } else {
        const res = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_CLASS_LOG",
            subjectId: logSubjectId,
            date: logDate,
            status: logStatus,
            topicCovered: logTopic,
            reason: logReason,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowLogModal(false);
          resetLogForm();
          await fetchData();
        }
      }
    } catch (err) {
      console.error("Failed to save class log:", err);
    }
  };

  const resetLogForm = () => {
    setLogTopic("");
    setLogReason("");
    setLogStatus("HELD");
    setLogDate(new Date().toISOString().split("T")[0]);
    setEditingLogId(null);
  };

  const handleStartEditLog = (item: ClassLogItem) => {
    setEditingLogId(item.id);
    setLogSubjectId(item.subjectId);
    setLogDate(item.date);
    setLogStatus(item.status);
    setLogTopic(item.topicCovered);
    setLogReason(item.reason);
    setShowLogModal(true);
  };

  const handleDeleteClassLog = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class log entry?")) return;
    try {
      const res = await fetch(`/api/teachers?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to delete class log:", err);
    }
  };

  // ----------------------------------------------------
  // Polite WhatsApp Generator for Teachers
  // ----------------------------------------------------
  const openTeacherMessageModal = (teacher: TeacherItem) => {
    setSelectedTeacherForMessage(teacher);
    setSelectedTemplateIndex(0);
    const sub = teacher.subjects[0];
    const initialText = generatePoliteTeacherMessage(0, teacher, sub);
    setMessageCustomText(initialText);
    setShowTeacherMessageModal(true);
    setCopiedTeacherMessage(false);
  };

  const generatePoliteTeacherMessage = (
    templateIdx: number,
    teacher: TeacherItem,
    sub?: TeacherSubject
  ) => {
    const courseCode = sub?.code || "Course";
    const courseName = sub?.name || "Subject";
    const teacherName = teacher.name;

    if (templateIdx === 0) {
      // 1. Class & Timing Confirmation
      return `Assalam-o-Alaikum Respected ${teacherName},

Hope you are doing well.

I am reaching out respectfully to confirm if our ${courseCode} (${courseName}) lecture scheduled for today will be held as per the regular timetable?

Looking forward to your guidance.
Thank you for your valuable time.

Regards,
Zohaib (CR, BSCS 7th E2)
University of Agriculture Faisalabad`;
    }

    if (templateIdx === 1) {
      // 2. Lecture Slides & Materials Request
      return `Assalam-o-Alaikum Respected ${teacherName},

Hope this message finds you in good health.

The students of BSCS 7th (E2) were respectfully requesting if the lecture slides / reading materials for ${courseCode} could kindly be shared whenever convenient for you.

Thank you so much for your continuous support.

Regards,
Zohaib (CR, BSCS 7th E2)
University of Agriculture Faisalabad`;
    }

    if (templateIdx === 2) {
      // 3. Rescheduled / Makeup Class Inquiry
      return `Assalam-o-Alaikum Respected ${teacherName},

Hope you are having a pleasant day.

Regarding the pending / makeup class for ${courseCode}, could you kindly let us know your available time slot this week so we can arrange the lecture hall and inform the entire class?

Thank you for accommodating us.

Regards,
Zohaib (CR, BSCS 7th E2)
University of Agriculture Faisalabad`;
    }

    // 4. Attendance Sheet / Official Intimation
    return `Assalam-o-Alaikum Respected ${teacherName},

Hope you are doing well.

Just wanted to respectfully share the updated student attendance / query list for ${courseCode} on behalf of the BSCS 7th (E2) class.

Thank you so much.

Regards,
Zohaib (CR, BSCS 7th E2)
University of Agriculture Faisalabad`;
  };

  const handleTemplateChange = (idx: number) => {
    setSelectedTemplateIndex(idx);
    if (selectedTeacherForMessage) {
      const text = generatePoliteTeacherMessage(
        idx,
        selectedTeacherForMessage,
        selectedTeacherForMessage.subjects[0]
      );
      setMessageCustomText(text);
    }
  };

  // Launch WhatsApp Web or App
  const handleSendTeacherWhatsApp = () => {
    if (!selectedTeacherForMessage) return;
    const cleanPhone = selectedTeacherForMessage.phone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(messageCustomText);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
    } else {
      navigator.clipboard.writeText(messageCustomText);
      alert("No phone number saved for teacher. Message copied to clipboard!");
    }
  };

  // ----------------------------------------------------
  // Student WhatsApp Alert for Cancelled / Rescheduled
  // ----------------------------------------------------
  const handleOpenStudentAlert = (log: ClassLogItem) => {
    const isCancelled = log.status === "CANCELLED";
    const text = `*⚠️ BSCS 7th (E2) — Class Conduction Alert*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isCancelled ? "❌ *Status:* CLASS CANCELLED" : "🔄 *Status:* CLASS RESCHEDULED"}
📖 *Course:* ${log.subjectCode} - ${log.subjectName}
👨‍🏫 *Instructor:* ${log.teacherName}
📅 *Date:* ${log.date}
${log.reason ? `📝 *Reason:* ${log.reason}\n` : ""}${log.topicCovered ? `📌 *Note:* ${log.topicCovered}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Remaining lectures will proceed as per regular university schedule._`;

    setStudentAlertText(text);
    setShowStudentAlertModal(true);
    setCopiedStudentAlert(false);
  };

  // Filtered Class Logs
  const filteredLogs = classLogs.filter((log) => {
    const matchesSubject =
      selectedSubjectFilter === "ALL" || log.subjectCode === selectedSubjectFilter;
    const matchesStatus =
      selectedStatusFilter === "ALL" || log.status === selectedStatusFilter;
    const q = searchLogQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      log.subjectCode.toLowerCase().includes(q) ||
      log.subjectName.toLowerCase().includes(q) ||
      log.teacherName.toLowerCase().includes(q) ||
      log.topicCovered.toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q) ||
      log.date.includes(q);
    return matchesSubject && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Metric Tally */}
      <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Phase 6 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                Faculty Desk & Conduction Tracker
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-indigo-400" />
              Faculty Desk & Daily Class Conduction Log
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl">
              Teacher contacts directory, daily class conduction tracker (Held / Cancelled / Rescheduled), polite WhatsApp inquiry generator, and 1-click student cancellation broadcasts.
            </p>
          </div>

          {/* Quick Action: Log Class Conduction */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                resetLogForm();
                setShowLogModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-black stroke-[3]" />
              <span>+ Log Class Conduction</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Faculty Card */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Faculty Members
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalFaculty}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  ({stats.withPhoneCount} phones)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Classes Held Card */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                Classes Held
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-emerald-300 font-mono">
                  {stats.totalClassesHeld}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">delivered</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Cancelled / Rescheduled Card */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">
                Cancelled / Shifted
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-rose-300 font-mono">
                  {stats.totalClassesCancelled}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  +{stats.totalClassesRescheduled} resched
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>

          {/* Global Delivery Rate */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                Delivery Rate
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-amber-300 font-mono">
                  {stats.globalDeliveryRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">semester avg</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Faculty Directory Grid (6 Teacher Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Faculty Profiles & Assigned Courses
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Click 💬 WhatsApp to send respectful pre-drafted templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {teachers.map((t) => {
            const isVF = t.name.includes("VF") || t.name.includes("Visiting");
            const sub = t.subjects[0];

            return (
              <div
                key={t.id}
                className="glass-card p-4 rounded-2xl border border-white/10 hover:border-indigo-400/40 transition-all flex flex-col justify-between group shadow-xl bg-black/40 hover:bg-black/60 relative overflow-hidden"
              >
                <div>
                  {/* Top Bar: Subject Badge, VF Tag, Edit */}
                  <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      {sub ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono text-[10px] font-black">
                          {sub.code}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-400 font-mono text-[10px]">
                          Unassigned
                        </span>
                      )}

                      {isVF && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-black">
                          Visiting Faculty
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingTeacher(t);
                        setTeacherNameInput(t.name);
                        setTeacherPhoneInput(t.phone);
                        setTeacherOfficeInput(t.office);
                        setTeacherBestTimesInput(t.bestTimes);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit teacher details"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Teacher Name & Subject Name */}
                  <h3 className="font-black text-sm text-white group-hover:text-indigo-200 transition-colors leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-bold truncate mt-0.5">
                    {sub ? sub.name : "Computer Science Faculty"}
                  </p>

                  {/* Contact & Location Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-300 font-medium">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className={t.phone ? "text-white font-bold" : "text-slate-500 italic"}>
                          {t.phone || "No phone saved"}
                        </span>
                      </div>
                      {t.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(t.phone);
                            alert(`Copied ${t.phone} to clipboard!`);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Copy phone number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Office Location & Visiting Hours */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 truncate">
                        <div className="flex items-center gap-1 text-slate-400 font-bold mb-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>Office</span>
                        </div>
                        <span className="text-white font-bold truncate block">
                          {t.office}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 truncate">
                        <div className="flex items-center gap-1 text-slate-400 font-bold mb-0.5">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Visiting</span>
                        </div>
                        <span className="text-white font-bold truncate block">
                          {t.bestTimes}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Conduction Score & WhatsApp Button */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono">
                    <span className="text-emerald-400 font-black">{t.stats.held} Held</span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span className="text-rose-400 font-black">{t.stats.cancelled} Cancel</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Log Class Shortcut */}
                    {sub && (
                      <button
                        type="button"
                        onClick={() => {
                          resetLogForm();
                          setLogSubjectId(sub.id);
                          setShowLogModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold transition-all"
                        title="Log a class for this course"
                      >
                        + Log Class
                      </button>
                    )}

                    {/* WhatsApp Template Generator */}
                    <button
                      type="button"
                      onClick={() => openTeacherMessageModal(t)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm"
                      title="Open polite message templates for WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Daily Class Conduction Tracker Table & Log Matrix */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            Class Conduction Log Matrix ({classLogs.length} total entries)
          </h2>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Filter */}
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="HELD">🟢 Held Only</option>
              <option value="CANCELLED">🔴 Cancelled Only</option>
              <option value="RESCHEDULED">🟡 Rescheduled Only</option>
              <option value="HOLIDAY">🔵 Holiday Only</option>
            </select>

            {/* Search */}
            <div className="relative w-44">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                placeholder="Search topic / reason..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Conduction Log Table */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs font-bold">No class conduction records logged yet.</p>
              <button
                onClick={() => {
                  resetLogForm();
                  setShowLogModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold inline-flex items-center gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Today&apos;s Class</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Topic Covered / Notes</th>
                    <th className="py-3 px-4">Reason / Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredLogs.map((log) => {
                    const st = STATUS_CONFIG[log.status] || STATUS_CONFIG.HELD;
                    const StIcon = st.icon;
                    const isCancelledOrShifted =
                      log.status === "CANCELLED" || log.status === "RESCHEDULED";

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.03] transition-colors group/row"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {log.date}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/30">
                            {log.subjectCode}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {log.teacherName}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${st.bg} ${st.color} border ${st.border}`}
                          >
                            <StIcon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-200 font-medium max-w-xs truncate">
                          {log.topicCovered || <span className="text-slate-500 italic">—</span>}
                        </td>

                        <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                          {log.reason || <span className="text-slate-500 italic">—</span>}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Student Alert Button (Only if Cancelled/Rescheduled) */}
                            {isCancelledOrShifted && (
                              <button
                                type="button"
                                onClick={() => handleOpenStudentAlert(log)}
                                className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-[10px] font-black flex items-center gap-1 transition-all"
                                title="Generate 1-Click WhatsApp Alert for students"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Student Alert</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEditLog(log)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                              title="Edit log"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteClassLog(log.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Log Class Conduction Event                                       */}
      {/* ========================================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/20 to-transparent">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {editingLogId ? "Edit Class Conduction Log" : "Log Class Conduction"}
              </h3>
              <button
                onClick={() => {
                  setShowLogModal(false);
                  resetLogForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassLog} className="p-5 space-y-3.5">
              {/* Select Subject */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Select Course *
                </label>
                <select
                  disabled={!!editingLogId}
                  value={logSubjectId}
                  onChange={(e) => setLogSubjectId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.code} - {s.name} ({s.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Class Date *
                </label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Status Picker (4 Pills) */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Class Status *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
                    const isSel = logStatus === k;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setLogStatus(k)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSel
                            ? `${cfg.bg} ${cfg.color} border ${cfg.border} ring-1 ring-white/30 font-black`
                            : "bg-black/30 border-white/10 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic Covered */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Topic Covered / Lecture Description
                </label>
                <input
                  type="text"
                  value={logTopic}
                  onChange={(e) => setLogTopic(e.target.value)}
                  placeholder="e.g. Lecture 5: Dijkstra's Algorithm and BFS"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Reason (for Cancelled or Rescheduled) */}
              {(logStatus === "CANCELLED" || logStatus === "RESCHEDULED") && (
                <div className="animate-in fade-in">
                  <label className="block text-[11px] font-black text-rose-400 uppercase tracking-wider mb-1">
                    Reason for Cancellation / Shift
                  </label>
                  <input
                    type="text"
                    value={logReason}
                    onChange={(e) => setLogReason(e.target.value)}
                    placeholder="e.g. Teacher official faculty meeting / personal emergency"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-rose-400/40 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogModal(false);
                    resetLogForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingLogId ? "Save Changes" : "Record Class"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Polite WhatsApp Message Generator for Teachers                   */}
      {/* ========================================================================= */}
      {showTeacherMessageModal && selectedTeacherForMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-xl rounded-3xl border border-indigo-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    Polite WhatsApp Message to {selectedTeacherForMessage.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono font-medium">
                    Phone: {selectedTeacherForMessage.phone || "Not set"} • Course:{" "}
                    {selectedTeacherForMessage.subjects[0]?.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTeacherMessageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Template Switcher Pills */}
              <div>
                <label className="block text-[11px] font-black text-indigo-300 uppercase tracking-wider mb-1.5">
                  Select Polite Message Intent:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "1. Class Timing Confirmation",
                    "2. Lecture Slides Request",
                    "3. Reschedule / Makeup Class",
                    "4. Attendance Query / Intimation",
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleTemplateChange(i)}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition-all border ${
                        selectedTemplateIndex === i
                          ? "bg-indigo-600 text-white border-indigo-400 font-black shadow-md shadow-indigo-500/30"
                          : "bg-black/40 text-slate-400 border-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Box */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Preview & Edit Message (Pre-filled):
                </label>
                <textarea
                  rows={8}
                  value={messageCustomText}
                  onChange={(e) => setMessageCustomText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-black/70 border border-indigo-400/30 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed shadow-inner"
                />
              </div>

              {/* Actions: Copy or Send on WhatsApp */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedTeacherForMessage.phone ? "Direct WhatsApp ready" : "Copy to paste"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(messageCustomText);
                      setCopiedTeacherMessage(true);
                      setTimeout(() => setCopiedTeacherMessage(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedTeacherMessage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTeacherWhatsApp}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
                  >
                    <Send className="w-3.5 h-3.5 fill-black" />
                    <span>Open in WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Student WhatsApp Alert for Class Cancellation                    */}
      {/* ========================================================================= */}
      {showStudentAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-rose-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-500/20 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    1-Click Student WhatsApp Cancellation Alert
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Ready to paste directly into BSCS 7th (E2) WhatsApp group!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStudentAlertModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <textarea
                rows={9}
                readOnly
                value={studentAlertText}
                className="w-full p-3.5 rounded-2xl bg-black/70 border border-rose-400/30 text-white font-mono text-xs focus:outline-none select-all leading-relaxed shadow-inner"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Click to copy formatted alert text
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStudentAlertModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(studentAlertText);
                      setCopiedStudentAlert(true);
                      setTimeout(() => setCopiedStudentAlert(false), 2500);
                    }}
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02]"
                  >
                    {copiedStudentAlert ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Student Alert</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Edit Teacher Profile                                             */}
      {/* ========================================================================= */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-3xl border border-indigo-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 to-transparent">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Teacher Profile
              </h3>
              <button
                onClick={() => setEditingTeacher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherProfile} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Teacher Name *
                </label>
                <input
                  type="text"
                  required
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={teacherPhoneInput}
                  onChange={(e) => setTeacherPhoneInput(e.target.value)}
                  placeholder="e.g. +92 318 4739353"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Office Location
                </label>
                <input
                  type="text"
                  value={teacherOfficeInput}
                  onChange={(e) => setTeacherOfficeInput(e.target.value)}
                  placeholder="e.g. Dept. of Computer Science, Room 3"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Best Contact / Visiting Hours
                </label>
                <input
                  type="text"
                  value={teacherBestTimesInput}
                  onChange={(e) => setTeacherBestTimesInput(e.target.value)}
                  placeholder="e.g. 10:00 AM - 1:00 PM"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
