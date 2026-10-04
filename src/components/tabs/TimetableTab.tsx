"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CalendarDays,
  Upload,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Share2,
  FileSpreadsheet,
  Download,
  Coffee,
  GripVertical,
} from "lucide-react";
import html2canvas from "html2canvas";

interface TimetableSlot {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  room: string;
  teacherName: string;
  type: string;
  section: string;
  status: string;
}

interface DiffResult {
  unchanged: { current: any; incoming: any }[];
  changed: { current: any; incoming: any; changeType: string; details: string }[];
  added: any[];
  removed: any[];
  totalIncoming: number;
  totalCurrent: number;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface TimelineItem {
  id: string;
  type: "OCCUPIED" | "FREE";
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  slotData?: TimetableSlot;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(/\s*[aApP][mM]/, "").replace(".", ":");
  const parts = clean.split(":");
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1] || "0", 10);
  if (isNaN(h)) return 0;
  if (isNaN(m)) m = 0;
  // University evening classes are between 1:00 PM and 7:00 PM (13:00 to 19:00)
  if (h >= 1 && h <= 7) {
    h += 12;
  }
  return h * 60 + m;
}

function formatMinutesToTime(mins: number): string {
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const mStr = m === 0 ? "00" : m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mStr}`;
}

export function TimetableTab() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sectionName, setSectionName] = useState<string>("BSCS 7th E2");

  // Drag and Drop state
  const [draggedSlot, setDraggedSlot] = useState<TimetableSlot | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Add / Edit Slot Modal
  const [showSlotModal, setShowSlotModal] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: "Monday",
    startTime: "2:00",
    endTime: "3:40",
    subjectName: "",
    room: "",
    teacherName: "",
    type: "LECTURE",
  });

  // Excel Diff Modal
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [diffFile, setDiffFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [incomingSlots, setIncomingSlots] = useState<any[]>([]);
  const [diffError, setDiffError] = useState<string>("");
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Broadcast Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastType, setBroadcastType] = useState<"today" | "next" | "full">("today");
  const [copied, setCopied] = useState<boolean>(false);

  // Export Image ref
  const exportTableRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Fetch slots
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timetable");
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots);
      }
    } catch (err) {
      console.error("Failed to fetch timetable slots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSection = localStorage.getItem("cr_section_name");
    if (savedSection) setSectionName(savedSection);
    fetchSlots();
  }, []);

  // Today & Next Day calculation
  const todayDate = new Date();
  const dayIndex = todayDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[dayIndex];

  // Next Class Day Calculation
  let nextDayName = "Monday";
  if (dayIndex === 0) nextDayName = "Monday"; // Sunday -> Monday
  else if (dayIndex === 5) nextDayName = "Monday"; // Friday -> Monday
  else if (dayIndex === 6) nextDayName = "Monday"; // Saturday -> Monday
  else nextDayName = dayNames[dayIndex + 1]; // e.g. Mon -> Tue

  // Save single slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.subjectName.trim() || !slotForm.room.trim()) return;

    try {
      const isEdit = !!editingSlot;
      const url = "/api/timetable";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? { id: editingSlot.id, ...slotForm, section: sectionName }
        : { ...slotForm, section: sectionName };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setShowSlotModal(false);
        setEditingSlot(null);
        await fetchSlots();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving slot");
    }
  };

  // Delete slot
  const handleDeleteSlot = async (id: number, subject: string, day: string) => {
    if (!confirm(`Delete ${day} class for ${subject}?`)) return;
    try {
      const res = await fetch(`/api/timetable?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchSlots();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (slot: TimetableSlot) => {
    setDraggedSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOverTarget(targetKey);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (targetDay: string, targetStartTime: string, targetEndTime: string) => {
    setDragOverTarget(null);
    if (!draggedSlot) return;

    if (draggedSlot.dayOfWeek === targetDay && draggedSlot.startTime === targetStartTime) {
      setDraggedSlot(null);
      return;
    }

    try {
      const res = await fetch("/api/timetable", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draggedSlot.id,
          dayOfWeek: targetDay,
          startTime: targetStartTime,
          endTime: targetEndTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSlots();
      }
    } catch (err) {
      console.error("Drop failed:", err);
    } finally {
      setDraggedSlot(null);
    }
  };

  // Compute dynamic timeline for each day with ZERO overlapping free slots
  const getDayTimeline = (day: string, dayClasses: TimetableSlot[]): TimelineItem[] => {
    // If no classes at all for this day, return standard 3 daily slots as clean free slots
    if (!dayClasses || dayClasses.length === 0) {
      return [
        {
          id: `free-${day}-slot1`,
          type: "FREE",
          dayOfWeek: day,
          startTime: "2:00",
          endTime: "3:40",
          durationMinutes: 100,
        },
        {
          id: `free-${day}-slot2`,
          type: "FREE",
          dayOfWeek: day,
          startTime: "3:40",
          endTime: "5:20",
          durationMinutes: 100,
        },
        {
          id: `free-${day}-slot3`,
          type: "FREE",
          dayOfWeek: day,
          startTime: "5:20",
          endTime: "7:00",
          durationMinutes: 100,
        },
      ];
    }

    // Sort active classes by start time ascending
    const sorted = [...dayClasses].sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );

    const items: TimelineItem[] = [];
    let currentTime = 840; // 2:00 PM (14:00)

    for (const c of sorted) {
      const cStart = parseTimeToMinutes(c.startTime);
      const cEnd = parseTimeToMinutes(c.endTime);

      // Check if there is an actual free gap before this class
      if (cStart > currentTime) {
        const gapMins = cStart - currentTime;
        if (gapMins >= 15) {
          items.push({
            id: `free-${day}-${currentTime}-${cStart}`,
            type: "FREE",
            dayOfWeek: day,
            startTime: formatMinutesToTime(currentTime),
            endTime: formatMinutesToTime(cStart),
            durationMinutes: gapMins,
          });
        }
      }

      // Add occupied class
      items.push({
        id: `occupied-${c.id}`,
        type: "OCCUPIED",
        dayOfWeek: day,
        startTime: c.startTime,
        endTime: c.endTime,
        durationMinutes: Math.max(0, cEnd - cStart),
        slotData: c,
      });

      // Advance currentTime to the end of this occupied class
      currentTime = Math.max(currentTime, cEnd);
    }

    // After the last class, check if free time remains before the evening ends (7:00 PM = 1140 mins)
    if (currentTime < 1140) {
      const remainingMins = 1140 - currentTime;
      if (remainingMins >= 15) {
        items.push({
          id: `free-${day}-${currentTime}-1140`,
          type: "FREE",
          dayOfWeek: day,
          startTime: formatMinutesToTime(currentTime),
          endTime: "7:00",
          durationMinutes: remainingMins,
        });
      }
    }

    return items;
  };

  // Save Timetable as Image (Occupied Slots Only, No Free Slots)
  const handleSaveAsImage = async () => {
    if (!exportTableRef.current) return;
    setIsExportingImage(true);

    try {
      const canvas = await html2canvas(exportTableRef.current, {
        scale: 2, // High resolution retina capture
        backgroundColor: "#080c18",
        useCORS: true,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${sectionName.replace(/\s+/g, "_")}_Timetable.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsExportingImage(false);
    }
  };

  // Analyze Diff from Master Excel
  const handleAnalyzeDiff = async (file: File) => {
    setIsAnalyzing(true);
    setDiffError("");
    setDiffResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sectionQuery", "BS(CS)-7th-E2");

      const res = await fetch("/api/timetable/diff", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setDiffResult(data.diff);
        setIncomingSlots(data.incomingSlots);
      } else {
        setDiffError(data.error || "Failed to analyze Excel diff.");
      }
    } catch (err: any) {
      setDiffError(err?.message || "Analysis error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Merge Diff Changes to Database
  const handleMergeDiff = async () => {
    if (incomingSlots.length === 0) return;
    setIsMerging(true);

    try {
      const res = await fetch("/api/timetable/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: incomingSlots, section: sectionName }),
      });
      const data = await res.json();

      if (data.success) {
        setShowDiffModal(false);
        setDiffResult(null);
        setDiffFile(null);
        await fetchSlots();
        alert(`Successfully verified & merged ${data.count} timetable slots!`);
      } else {
        alert(data.error || "Failed to merge timetable.");
      }
    } catch (err) {
      console.error(err);
      alert("Error applying changes.");
    } finally {
      setIsMerging(false);
    }
  };

  // WhatsApp Broadcast text generator
  const generateBroadcastText = () => {
    if (broadcastType === "today") {
      const todayClasses = slots.filter((s) => s.dayOfWeek.toLowerCase() === todayName.toLowerCase());
      if (todayClasses.length === 0) {
        return `📢 *Class Schedule for Today (${todayName})*\nNo scheduled classes for ${sectionName} today! Relax and prepare for upcoming assignments.\n\nBest regards,\nCR`;
      }
      const list = todayClasses
        .map(
          (c, idx) =>
            `${idx + 1}. *${c.subjectName}* (${c.type})\n   ⏰ ${c.startTime} – ${c.endTime}\n   📍 ${c.room}\n   👨‍🏫 ${c.teacherName}`
        )
        .join("\n\n");
      return `📢 *Class Schedule for Today (${todayName}) - ${sectionName}*\n----------------------------------------\n${list}\n----------------------------------------\nPlease arrive on time.\nRegards, CR`;
    }

    if (broadcastType === "next") {
      const nextClasses = slots.filter((s) => s.dayOfWeek.toLowerCase() === nextDayName.toLowerCase());
      if (nextClasses.length === 0) {
        return `📢 *Class Schedule for Next Class Day (${nextDayName})*\nNo classes scheduled for ${sectionName} on ${nextDayName}.\n\nRegards, CR`;
      }
      const list = nextClasses
        .map(
          (c, idx) =>
            `${idx + 1}. *${c.subjectName}* (${c.type})\n   ⏰ ${c.startTime} – ${c.endTime}\n   📍 ${c.room}\n   👨‍🏫 ${c.teacherName}`
        )
        .join("\n\n");
      return `📢 *Class Schedule for Tomorrow / Next Day (${nextDayName}) - ${sectionName}*\n----------------------------------------\n${list}\n----------------------------------------\nPlease reach on time.\nRegards, CR`;
    }

    // Full week
    const sections = DAYS_OF_WEEK.map((day) => {
      const dayClasses = slots.filter((s) => s.dayOfWeek.toLowerCase() === day.toLowerCase());
      if (dayClasses.length === 0) return `🗓️ *${day}*: No Classes (Free Day)`;
      const classLines = dayClasses
        .map((c) => `  • ${c.startTime}–${c.endTime} | *${c.subjectName}* | ${c.room} (${c.teacherName})`)
        .join("\n");
      return `🗓️ *${day}*:\n${classLines}`;
    }).join("\n\n");

    return `📅 *Official Timetable - ${sectionName}*\n========================================\n\n${sections}\n\n========================================\nKindly note down and plan accordingly.\nRegards, CR`;
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(generateBroadcastText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner & Controls */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-400/35 relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-indigo-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 text-xs font-black shadow-sm">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                Phase 2 Active
              </span>

              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-sm">
                Section: {sectionName}
              </span>

              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
                Next Day: {nextDayName}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-950 dark:text-white">
              Visual Timetable & Master Excel Diff
            </h2>
            <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 max-w-2xl font-semibold">
              3 standard daily slots (2:00-3:40, 3:40-5:20, 5:20-7:00). Drag & drop to shift classes, 
              save as image (occupied only), and broadcast today or tomorrow&apos;s schedule in 1 click.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSaveAsImage}
              disabled={isExportingImage}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all active:scale-95 disabled:opacity-50"
              title="Save timetable as PNG image (occupied slots only)"
            >
              {isExportingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingImage ? "Exporting..." : "Save as Image"}</span>
            </button>

            <button
              onClick={() => {
                setDiffError("");
                setShowDiffModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Check Excel Diff</span>
            </button>

            <button
              onClick={() => {
                setEditingSlot(null);
                setSlotForm({
                  dayOfWeek: "Monday",
                  startTime: "2:00",
                  endTime: "3:40",
                  subjectName: "",
                  room: "",
                  teacherName: "",
                  type: "LECTURE",
                });
                setShowSlotModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-button text-indigo-900 dark:text-white font-extrabold text-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Slot</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-800 dark:text-sky-200 hover:text-white font-extrabold text-xs shadow-sm transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
              <span>WhatsApp Broadcast</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Timetable Table (3 Standard Slots per day with Free Slot Badges) */}
      <div className="glass-panel rounded-3xl border border-emerald-400/30 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-emerald-500/20 bg-emerald-950/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-black text-indigo-950 dark:text-white tracking-wide">
              {sectionName} Weekly Timetable (Drag & Drop Active)
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-200 font-bold">
              Tip: Drag any class card to another slot to move it instantly!
            </p>
          </div>

          <button
            onClick={fetchSlots}
            disabled={loading}
            className="p-2 rounded-xl glass-button text-emerald-800 dark:text-emerald-200 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            Loading timetable slots...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-emerald-500/30 bg-emerald-950/40 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <th className="py-3.5 px-6 w-36">Day</th>
                  <th className="py-3.5 px-6 w-44">Time Slot</th>
                  <th className="py-3.5 px-6">Class / Subject Details</th>
                  <th className="py-3.5 px-6 w-52">Room / Lab</th>
                  <th className="py-3.5 px-6 w-52">Teacher</th>
                  <th className="py-3.5 px-6 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 text-xs font-semibold">
                {DAYS_OF_WEEK.map((day) => {
                  const dayClasses = slots.filter(
                    (s) => s.dayOfWeek.toLowerCase() === day.toLowerCase() && s.status !== "CANCELLED"
                  );
                  const dayTimeline = getDayTimeline(day, dayClasses);

                  return dayTimeline.map((item, itemIdx) => {
                    const isDragOver = dragOverTarget === item.id;
                    const isOccupied = item.type === "OCCUPIED" && !!item.slotData;
                    const slotData = item.slotData;

                    return (
                      <tr
                        key={item.id}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(day, item.startTime, item.endTime)}
                        className={`transition-all duration-200 ${
                          isDragOver
                            ? "bg-indigo-600/30 border-2 border-indigo-400 scale-[1.01]"
                            : isOccupied
                            ? "hover:bg-emerald-500/10 group"
                            : "bg-black/35 hover:bg-black/45"
                        }`}
                      >
                        {/* Day Column (Spans dayTimeline.length) */}
                        {itemIdx === 0 && (
                          <td
                            rowSpan={dayTimeline.length}
                            className="py-4 px-6 font-extrabold text-sm text-indigo-950 dark:text-white border-r border-emerald-500/20 bg-emerald-950/20 align-top"
                          >
                            <div className="sticky top-28 space-y-1">
                              <span className="font-black tracking-wide text-base">{day}</span>
                              {day.toLowerCase() === todayName.toLowerCase() && (
                                <span className="block px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[10px] font-black uppercase tracking-wider text-center">
                                  Today
                                </span>
                              )}
                              {day.toLowerCase() === nextDayName.toLowerCase() && (
                                <span className="block px-2 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 text-[10px] font-black uppercase tracking-wider text-center">
                                  Next Day
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Time */}
                        <td className="py-3.5 px-6 font-mono font-bold text-emerald-800 dark:text-emerald-200">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isOccupied ? "text-emerald-500" : "text-amber-500/80"} shrink-0`} />
                            <span>{item.startTime} – {item.endTime}</span>
                          </div>
                        </td>

                        {/* Subject or Free Slot */}
                        <td className="py-3.5 px-6">
                          {isOccupied && slotData ? (
                            <div
                              draggable
                              onDragStart={() => handleDragStart(slotData)}
                              className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                            >
                              <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                              <span className="font-black text-sm text-indigo-950 dark:text-white tracking-wide">
                                {slotData.subjectName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  slotData.type === "LAB"
                                    ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-400/40"
                                    : "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/40"
                                }`}
                              >
                                {slotData.type}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-mono font-semibold text-xs">
                              <Coffee className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold">
                                No Class Here — Free Slot ({item.durationMinutes}m)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Room */}
                        <td className="py-3.5 px-6">
                          {isOccupied && slotData ? (
                            <div className="flex items-center gap-1.5 text-indigo-950 dark:text-white font-bold">
                              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{slotData.room}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* Teacher */}
                        <td className="py-3.5 px-6">
                          {isOccupied && slotData ? (
                            <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-100 font-semibold">
                              <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{slotData.teacherName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-6 text-right">
                          {isOccupied && slotData ? (
                            <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingSlot(slotData);
                                  setSlotForm({
                                    dayOfWeek: slotData.dayOfWeek,
                                    startTime: slotData.startTime,
                                    endTime: slotData.endTime,
                                    subjectName: slotData.subjectName,
                                    room: slotData.room,
                                    teacherName: slotData.teacherName,
                                    type: slotData.type,
                                  });
                                  setShowSlotModal(true);
                                }}
                                className="p-1.5 rounded-lg glass-button text-emerald-800 dark:text-emerald-200 hover:text-white hover:bg-emerald-500/30 transition-all"
                                title="Edit Slot"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slotData.id, slotData.subjectName, slotData.dayOfWeek)}
                                className="p-1.5 rounded-lg glass-button text-rose-500 hover:text-white hover:bg-rose-500/30 transition-all"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingSlot(null);
                                setSlotForm({
                                  dayOfWeek: day,
                                  startTime: item.startTime,
                                  endTime: item.endTime,
                                  subjectName: "",
                                  room: "",
                                  teacherName: "",
                                  type: "LECTURE",
                                });
                                setShowSlotModal(true);
                              }}
                              className="px-2.5 py-1 rounded-md glass-button text-[10px] font-bold text-emerald-400 hover:text-white"
                              title="Add class to this free slot"
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEDICATED EXPORT CONTAINER (ONLY OCCUPIED SLOTS - FOR PERFECT IMAGE SAVING) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={exportTableRef}
          style={{
            width: "900px",
            padding: "30px",
            backgroundColor: "#070b16",
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Header matching user image */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 6px 0", color: "#ffffff" }}>
              {sectionName} Timetable
            </h1>
            <p style={{ fontSize: "14px", color: "#38bdf8", margin: 0, fontWeight: "700" }}>
              Department of Computer Science, UAF
            </p>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid #38bdf8",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "#38bdf8", fontSize: "14px", fontWeight: "900" }}>
                <th style={{ padding: "12px", border: "1px solid #334155" }}>Day</th>
                <th style={{ padding: "12px", border: "1px solid #334155" }}>Time</th>
                <th style={{ padding: "12px", border: "1px solid #334155" }}>Subject</th>
                <th style={{ padding: "12px", border: "1px solid #334155" }}>Room / Lab</th>
                <th style={{ padding: "12px", border: "1px solid #334155" }}>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = slots.filter((s) => s.dayOfWeek.toLowerCase() === day.toLowerCase());
                if (daySlots.length === 0) return null;

                return daySlots.map((slot, index) => (
                  <tr key={slot.id} style={{ borderBottom: "1px solid #1e293b", fontSize: "13px" }}>
                    {index === 0 && (
                      <td
                        rowSpan={daySlots.length}
                        style={{
                          padding: "12px",
                          fontWeight: "900",
                          border: "1px solid #334155",
                          verticalAlign: "top",
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          fontSize: "14px",
                        }}
                      >
                        {day}
                      </td>
                    )}
                    <td style={{ padding: "10px 12px", border: "1px solid #334155", fontFamily: "monospace", fontWeight: "700", color: "#34d399" }}>
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #334155", fontWeight: "800", color: "#ffffff" }}>
                      {slot.subjectName}
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #334155", fontWeight: "700", color: "#fbbf24" }}>
                      {slot.room}
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #334155", fontWeight: "600", color: "#e2e8f0" }}>
                      {slot.teacherName}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Master Excel Auto-Diff Inspector */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-400/40 max-w-4xl w-full space-y-6 shadow-glass max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  University Master Timetable Auto-Diff Engine
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold mt-0.5">
                  Filters <code>BS(CS)-7th-E2</code>, merges consecutive 50-min periods, and detects room/time shifts.
                </p>
              </div>
              <button
                onClick={() => setShowDiffModal(false)}
                className="text-xs text-emerald-400 hover:text-white px-2.5 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Upload Zone */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                Upload University Master Timetable Excel (.xlsx)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 text-center cursor-pointer transition-all hover:bg-emerald-950/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDiffFile(e.target.files[0]);
                      handleAnalyzeDiff(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-extrabold text-emerald-300">
                  {diffFile ? diffFile.name : "Click to select or drag & drop Updated Time Table Winter 2026.xlsx"}
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-1 font-semibold">
                  Scans all departments and extracts BS(CS)-7th-E2 schedule
                </p>
              </div>
            </div>

            {isAnalyzing && (
              <div className="py-8 text-center text-xs text-emerald-300 font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Analyzing master timetable & computing exact diff...
              </div>
            )}

            {diffError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{diffError}</span>
              </div>
            )}

            {/* Diff Results Inspection */}
            {diffResult && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">Identical</span>
                    <span className="text-xl font-black text-white">{diffResult.unchanged.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-center">
                    <span className="text-[10px] font-black uppercase text-amber-400 block">Changes Detected</span>
                    <span className="text-xl font-black text-white">{diffResult.changed.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-center">
                    <span className="text-[10px] font-black uppercase text-sky-400 block">New Classes</span>
                    <span className="text-xl font-black text-white">{diffResult.added.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-center">
                    <span className="text-[10px] font-black uppercase text-rose-400 block">Dropped</span>
                    <span className="text-xl font-black text-white">{diffResult.removed.length}</span>
                  </div>
                </div>

                {/* Changes List */}
                {diffResult.changed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Detected Changes In Master Excel:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {diffResult.changed.map((ch, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-black text-white">{ch.incoming.subjectName}</span>
                            <span className="text-slate-400 ml-2">({ch.incoming.dayOfWeek})</span>
                            <p className="text-amber-300 font-bold mt-0.5">{ch.details}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 font-mono text-[10px] font-bold">
                            {ch.changeType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm & Merge Action */}
                <div className="flex items-center justify-between pt-4 border-t border-emerald-500/20">
                  <div className="text-xs text-slate-300 font-medium">
                    Verified total <b>{incomingSlots.length}</b> classes for <b>{sectionName}</b>.
                  </div>
                  <button
                    onClick={handleMergeDiff}
                    disabled={isMerging}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isMerging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Verify & Apply Changes to Database</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Single Slot */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 border border-emerald-400/40 max-w-md w-full space-y-4 shadow-glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                {editingSlot ? "Edit Class Slot" : "Add New Class Slot"}
              </h3>
              <button
                onClick={() => setShowSlotModal(false)}
                className="text-xs text-emerald-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Day *</label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d} className="bg-slate-900 text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Type *</label>
                  <select
                    value={slotForm.type}
                    onChange={(e) => setSlotForm({ ...slotForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                  >
                    <option value="LECTURE" className="bg-slate-900 text-white">
                      LECTURE
                    </option>
                    <option value="LAB" className="bg-slate-900 text-white">
                      LAB
                    </option>
                    <option value="MAKEUP" className="bg-slate-900 text-white">
                      MAKEUP
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Start Time *</label>
                  <input
                    type="text"
                    required
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    placeholder="e.g. 2:00"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">End Time *</label>
                  <input
                    type="text"
                    required
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    placeholder="e.g. 3:40"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Subject Code / Title *</label>
                <input
                  type="text"
                  required
                  value={slotForm.subjectName}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectName: e.target.value })}
                  placeholder="e.g. IT-601-P or CS-605"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Room / Lab *</label>
                <input
                  type="text"
                  required
                  value={slotForm.room}
                  onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
                  placeholder="e.g. Second Floor Lab #1 or CS-LTR"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Teacher Name</label>
                <input
                  type="text"
                  value={slotForm.teacherName}
                  onChange={(e) => setSlotForm({ ...slotForm, teacherName: e.target.value })}
                  placeholder="e.g. Miss Amina Amir or Pending"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-emerald-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-md"
                >
                  {editingSlot ? "Update Slot" : "Save Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Controlled WhatsApp Broadcast */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 border border-sky-400/40 max-w-lg w-full space-y-4 shadow-glass">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-sky-400" />
                Generate WhatsApp Broadcast Announcement
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-xs text-sky-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              CR-controlled announcement: Generates a ready-to-paste clean message with zero student spam.
            </p>

            {/* Broadcast Type Pills */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setBroadcastType("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  broadcastType === "today"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "glass-button text-slate-400 hover:text-white"
                }`}
              >
                Today ({todayName})
              </button>
              <button
                onClick={() => setBroadcastType("next")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  broadcastType === "next"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "glass-button text-slate-400 hover:text-white"
                }`}
              >
                Tomorrow / Next Day ({nextDayName}) 🌟
              </button>
              <button
                onClick={() => setBroadcastType("full")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  broadcastType === "full"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "glass-button text-slate-400 hover:text-white"
                }`}
              >
                Full Week Schedule
              </button>
            </div>

            {/* Formatted Text Preview */}
            <pre className="p-4 rounded-2xl bg-black/60 border border-sky-500/30 text-xs font-mono text-sky-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {generateBroadcastText()}
            </pre>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-sky-300"
              >
                Close
              </button>
              <button
                onClick={handleCopyBroadcast}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy for WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
