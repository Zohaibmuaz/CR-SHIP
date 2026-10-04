"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Search,
  Sparkles,
  Share2,
  Volume2,
  Mail,
  Send,
  SlidersHorizontal,
  Flame,
  FileText,
  CreditCard,
  Megaphone,
  Bookmark,
  CheckSquare,
  Square,
  HelpCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

interface TaskItem {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  reminderTime: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | string;
  category: "ASSIGNMENT" | "TEACHER" | "FEE" | "ANNOUNCEMENT" | "GENERAL" | string;
  isCompleted: boolean;
  notified: boolean;
  createdAt?: string;
}

interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  urgent: number;
  dueToday: number;
  overdue: number;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  ASSIGNMENT: {
    label: "Assignment & Project",
    icon: FileText,
    color: "text-indigo-300",
    bg: "bg-indigo-500/20",
    border: "border-indigo-400/40",
  },
  TEACHER: {
    label: "Teacher Follow-up",
    icon: Bookmark,
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    border: "border-amber-400/40",
  },
  FEE: {
    label: "Fee & University Dues",
    icon: CreditCard,
    color: "text-teal-300",
    bg: "bg-teal-500/20",
    border: "border-teal-400/40",
  },
  ANNOUNCEMENT: {
    label: "Class Notice Broadcast",
    icon: Megaphone,
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/20",
    border: "border-fuchsia-400/40",
  },
  GENERAL: {
    label: "General CR Work",
    icon: CheckCircle2,
    color: "text-slate-300",
    bg: "bg-white/10",
    border: "border-white/15",
  },
};

const PRIORITY_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string; badge: string }
> = {
  URGENT: {
    label: "URGENT",
    color: "text-rose-300",
    bg: "bg-rose-500/20",
    border: "border-rose-400/50",
    badge: "bg-rose-500 text-white shadow-rose-500/30",
  },
  HIGH: {
    label: "HIGH",
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    border: "border-amber-400/50",
    badge: "bg-amber-500 text-black shadow-amber-500/30",
  },
  MEDIUM: {
    label: "MEDIUM",
    color: "text-indigo-300",
    bg: "bg-indigo-500/20",
    border: "border-indigo-400/50",
    badge: "bg-indigo-500 text-white shadow-indigo-500/30",
  },
  LOW: {
    label: "LOW",
    color: "text-slate-400",
    bg: "bg-white/5",
    border: "border-white/10",
    badge: "bg-white/10 text-slate-300",
  },
};

export default function TasksTab() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    completed: 0,
    urgent: 0,
    dueToday: 0,
    overdue: 0,
  });
  const [emailRecipient, setEmailRecipient] = useState<string>("zohaibmuaz@gmail.com");
  const [isLiveSmtp, setIsLiveSmtp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [activeTabFilter, setActiveTabFilter] = useState<"PENDING" | "DUE_TODAY" | "COMPLETED" | "ALL">("PENDING");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create / Edit Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskCategory, setTaskCategory] = useState<string>("ASSIGNMENT");
  const [taskPriority, setTaskPriority] = useState<string>("HIGH");
  const [taskDueDate, setTaskDueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [taskReminderTime, setTaskReminderTime] = useState<string>("12:00");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Fired Alarm Banner State
  const [activeFiredAlarms, setActiveFiredAlarms] = useState<TaskItem[]>([]);

  // WhatsApp Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastText, setBroadcastText] = useState<string>("");
  const [copiedBroadcast, setCopiedBroadcast] = useState<boolean>(false);

  // Email Settings / Test Modal State
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);
  const [smtpSender, setSmtpSender] = useState<string>("zohaibmuaz@gmail.com");
  const [appPassword, setAppPassword] = useState<string>("");
  const [showAppPassword, setShowAppPassword] = useState<boolean>(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState<boolean>(false);
  const [smtpStatusMessage, setSmtpStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Browser Notification Permission
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);

  // ----------------------------------------------------
  // Audio Synthesis Chime Generator (No external MP3 required)
  // ----------------------------------------------------
  const playAlarmChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Tone 2: 1320Hz (E6) Harmonious Chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 1.5);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  };

  // Check Notification Permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setHasNotificationPermission(Notification.permission === "granted");
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setHasNotificationPermission(perm === "granted");
      if (perm === "granted") {
        new Notification("CR-Ship Reminders Active", {
          body: "You will receive desktop alarms for assignments and deadlines!",
          icon: "/logo.png",
        });
        playAlarmChime();
      }
    }
  };

  // Fetch all tasks
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setStats(data.stats);
        if (data.emailConfig) {
          if (data.emailConfig.recipient) setEmailRecipient(data.emailConfig.recipient);
          if (data.emailConfig.smtpUser) setSmtpSender(data.emailConfig.smtpUser);
          setIsLiveSmtp(Boolean(data.emailConfig.isLiveSmtp));
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----------------------------------------------------
  // Real-Time Background Scheduler (Checks every 15s)
  // ----------------------------------------------------
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMins = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMins}`;

      // Check tasks whose reminder time has arrived
      tasks.forEach(async (t) => {
        if (t.isCompleted || t.notified) return;

        // Condition: Due date has arrived, and reminder time is reached
        const isDateReached = !t.dueDate || t.dueDate <= todayStr;
        const isTimeReached = !t.reminderTime || (t.dueDate === todayStr ? t.reminderTime <= currentTimeStr : true);

        if (isDateReached && isTimeReached) {
          // 1. Play crystal audio chime
          playAlarmChime();

          // 2. HTML5 Desktop Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🚨 TIME IS UP: ${t.title}`, {
              body: `CR Reminder: ${t.category} task is due now! (${t.dueDate} ${t.reminderTime})`,
              icon: "/favicon.ico",
              tag: `task-${t.id}`,
            });
          }

          // 3. Mark as fired in UI banner
          setActiveFiredAlarms((prev) => {
            if (prev.some((p) => p.id === t.id)) return prev;
            return [...prev, t];
          });

          // 4. Call API to send "TIME IS UP" Email to zohaibmuaz@gmail.com
          try {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "TRIGGER_REMINDER",
                id: t.id,
              }),
            });
            // Update local task state
            setTasks((prev) =>
              prev.map((item) => (item.id === t.id ? { ...item, notified: true } : item))
            );
          } catch (e) {
            console.error("Trigger reminder error:", e);
          }
        }
      });
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [tasks]);

  // ----------------------------------------------------
  // Save Task (Create or Update)
  // ----------------------------------------------------
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingTaskId) {
        // PUT update
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTaskId,
            title: taskTitle,
            description: taskDescription,
            dueDate: taskDueDate,
            reminderTime: taskReminderTime,
            priority: taskPriority,
            category: taskCategory,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          resetTaskForm();
          await fetchData();
        }
      } else {
        // POST create & trigger confirmation email to zohaibmuaz@gmail.com
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_TASK",
            title: taskTitle,
            description: taskDescription,
            dueDate: taskDueDate,
            reminderTime: taskReminderTime,
            priority: taskPriority,
            category: taskCategory,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          resetTaskForm();
          await fetchData();
          alert(`Task saved! Confirmation email dispatched to ${emailRecipient}.`);
        }
      }
    } catch (err) {
      console.error("Save task error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskCategory("ASSIGNMENT");
    setTaskPriority("HIGH");
    setTaskDueDate(new Date().toISOString().split("T")[0]);
    setTaskReminderTime("12:00");
    setTaskDescription("");
    setEditingTaskId(null);
  };

  const handleStartEdit = (t: TaskItem) => {
    setEditingTaskId(t.id);
    setTaskTitle(t.title);
    setTaskCategory(t.category);
    setTaskPriority(t.priority);
    setTaskDueDate(t.dueDate || new Date().toISOString().split("T")[0]);
    setTaskReminderTime(t.reminderTime || "12:00");
    setTaskDescription(t.description || "");
    setShowAddModal(true);
  };

  // Toggle Completion
  const handleToggleComplete = async (id: number) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_COMPLETE",
          id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic UI
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
        );
        // Remove from active fired alarms if completed
        setActiveFiredAlarms((prev) => prev.filter((p) => p.id !== id));
        await fetchData();
      }
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  // Clear Completed Tasks
  const handleClearCompleted = async () => {
    if (!confirm("Clear all completed tasks from the board?")) return;
    try {
      const res = await fetch(`/api/tasks?clearCompleted=true`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Clear completed error:", err);
    }
  };

  // ----------------------------------------------------
  // 1-Click WhatsApp Student Deadline Alert Broadcast
  // ----------------------------------------------------
  const handleOpenBroadcast = (t: TaskItem) => {
    const isUrgent = t.priority === "URGENT";
    const text = `*⏰ BSCS 7th (E2) — CR Deadline Notice*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isUrgent ? "🚨 *URGENT REMINDER*" : "📌 *REMINDER:*"} ${t.title}
📁 *Category:* ${CATEGORY_MAP[t.category]?.label || t.category}
📅 *Deadline:* ${t.dueDate || "Today"} ${t.reminderTime ? `at ${t.reminderTime}` : ""}
${t.description ? `📝 *Instructions:* ${t.description}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Please ensure timely compliance. Late submissions may not be accepted._`;

    setBroadcastText(text);
    setShowBroadcastModal(true);
    setCopiedBroadcast(false);
  };

  // ----------------------------------------------------
  // Send Test Email to zohaibmuaz@gmail.com
  // ----------------------------------------------------
  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_EMAIL",
          email: emailRecipient,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult(`Success! Test ping email delivered to ${emailRecipient}. Check your inbox!`);
        playAlarmChime();
      } else {
        setTestEmailResult(`Notice: ${data.error || "Simulation mode active"}`);
      }
    } catch (err: any) {
      setTestEmailResult(`Error: ${err.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ----------------------------------------------------
  // Save & Connect Google App Password SMTP
  // ----------------------------------------------------
  const handleSaveAndConnectSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appPassword.trim()) {
      setSmtpStatusMessage({
        type: "error",
        text: "Please enter your 16-character Google App Password (e.g. abcd efgh ijkl mnop).",
      });
      return;
    }

    setIsSavingSmtp(true);
    setSmtpStatusMessage(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_SMTP_CONFIG",
          smtpUser: smtpSender.trim(),
          appPassword: appPassword.trim(),
          recipient: emailRecipient.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsLiveSmtp(true);
        setSmtpStatusMessage({
          type: "success",
          text: data.message || `Connected to Gmail! Live test email sent to ${emailRecipient}. Check your inbox now!`,
        });
        setAppPassword("");
        playAlarmChime();
        await fetchData();
      } else {
        setSmtpStatusMessage({
          type: "error",
          text: data.error || "Connection failed. Please ensure 2-Step Verification is active and you generated an App Password.",
        });
      }
    } catch (err: any) {
      setSmtpStatusMessage({
        type: "error",
        text: `Error connecting to Gmail: ${err.message}`,
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // Filtered Task List
  const todayStr = new Date().toISOString().split("T")[0];
  const filteredTasks = tasks.filter((t) => {
    // 1. Status Filter
    if (activeTabFilter === "PENDING" && t.isCompleted) return false;
    if (activeTabFilter === "COMPLETED" && !t.isCompleted) return false;
    if (activeTabFilter === "DUE_TODAY") {
      if (t.isCompleted) return false;
      const isDue = t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr);
      if (!isDue) return false;
    }

    // 2. Category Filter
    if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false;

    // 3. Priority Filter
    if (selectedPriority !== "ALL" && t.priority !== selectedPriority) return false;

    // 4. Search Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Active Fired Alarm Banner (If reminder time has arrived) */}
      {activeFiredAlarms.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-black border-2 border-rose-500 shadow-2xl shadow-rose-500/30 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0 shadow-lg">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
                <span>🚨 Reminder Alarm Triggered ({activeFiredAlarms.length} Active)</span>
                <span className="text-[10px] text-white bg-rose-500/50 px-2 py-0.5 rounded-full">
                  Email Alert Dispatched to {emailRecipient}
                </span>
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                {activeFiredAlarms[0].title}
                {activeFiredAlarms.length > 1 && ` (+${activeFiredAlarms.length - 1} more)`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                handleOpenBroadcast(activeFiredAlarms[0]);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Broadcast to Students</span>
            </button>

            <button
              onClick={() => setActiveFiredAlarms([])}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header & Live Metrics */}
      <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Phase 7 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                Audible Alarms & Dual Email Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <BellRing className="w-7 h-7 text-rose-400" />
              CR Task Board & Real-Time Alarms
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl">
              Never miss an assignment collection, teacher meeting, or fee deadline. Get audible chimes, browser notifications, and automatic dual emails to{" "}
              <strong className="text-white underline">{emailRecipient}</strong>.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Chime Sound Test */}
            <button
              onClick={() => {
                playAlarmChime();
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Test the crystal alarm sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Chime</span>
            </button>

            {/* Email Settings / Test */}
            <button
              onClick={() => {
                setShowEmailModal(true);
                setTestEmailResult(null);
              }}
              className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="View email notification settings"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Email Settings</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={() => {
                resetTaskForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-black stroke-[3]" />
              <span>+ Add Task</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Tasks */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Total Tasks
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.total}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">on board</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                Pending To-Do
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-amber-300 font-mono">
                  {stats.pending}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">active</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Due Today / Overdue */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">
                Due Today / Overdue
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-rose-300 font-mono">
                  {stats.dueToday + stats.overdue}
                </span>
                <span className="text-[10px] text-rose-400 font-bold">urgent</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          {/* Completed */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                Completed
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-emerald-300 font-mono">
                  {stats.completed}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">done</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Email Notification Indicator Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-bold">
              Dual Auto-Emails Active:{" "}
              <strong className="text-emerald-300 font-mono">{emailRecipient}</strong>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-black">
              1. On Save • 2. On Time
            </span>
          </div>

          {!hasNotificationPermission && (
            <button
              onClick={requestNotificationPermission}
              className="text-[11px] text-amber-300 hover:text-white underline font-bold flex items-center gap-1"
            >
              <BellRing className="w-3 h-3 text-amber-400" />
              <span>Enable Browser Desktop Popup Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "PENDING", label: "To-Do Pending", count: stats.pending },
            { id: "DUE_TODAY", label: "Due Today / Overdue", count: stats.dueToday + stats.overdue },
            { id: "COMPLETED", label: "Completed", count: stats.completed },
            { id: "ALL", label: "All Tasks", count: stats.total },
          ].map((tab) => {
            const isSel = activeTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                  isSel
                    ? "bg-white text-slate-900 shadow-lg shadow-white/10 scale-105"
                    : "bg-black/35 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSel ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Priority & Search Filters */}
        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🔴 Urgent</option>
            <option value="HIGH">🟡 High</option>
            <option value="MEDIUM">🔵 Medium</option>
            <option value="LOW">⚪ Low</option>
          </select>

          {/* Search */}
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none"
            />
          </div>

          {stats.completed > 0 && activeTabFilter === "COMPLETED" && (
            <button
              onClick={handleClearCompleted}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-300 text-xs font-bold flex items-center gap-1"
              title="Clear completed tasks"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Done</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Task Cards Grid */}
      {loading ? (
        <div className="glass-card p-12 rounded-3xl border border-white/10 text-center">
          <RefreshCw className="w-8 h-8 text-rose-400 animate-spin mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">Loading task board...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-white/15 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-white mb-1">
            {searchQuery
              ? "No tasks match your search query"
              : activeTabFilter === "COMPLETED"
              ? "No completed tasks yet"
              : activeTabFilter === "DUE_TODAY"
              ? "No tasks due today — all clear!"
              : "No pending tasks on your board"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-medium">
            Schedule assignment collections, teacher follow-ups, or fee notices. Dual emails will be automatically dispatched to {emailRecipient}.
          </p>
          <button
            onClick={() => {
              resetTaskForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-rose-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Your First Task</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredTasks.map((t) => {
            const cat = CATEGORY_MAP[t.category] || CATEGORY_MAP.GENERAL;
            const CatIcon = cat.icon;
            const prio = PRIORITY_MAP[t.priority] || PRIORITY_MAP.MEDIUM;
            const isOverdue = !t.isCompleted && t.dueDate && t.dueDate < todayStr;
            const isDueToday = !t.isCompleted && t.dueDate === todayStr;

            return (
              <div
                key={t.id}
                className={`glass-card p-4 rounded-2xl border transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden ${
                  t.isCompleted
                    ? "border-white/5 bg-black/20 opacity-60"
                    : isOverdue
                    ? "border-rose-500/50 bg-rose-950/20 hover:border-rose-400"
                    : isDueToday
                    ? "border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
                    : "border-white/10 bg-black/40 hover:border-indigo-400/40"
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox, Priority Badge, Category, Actions */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* 1-Click Toggle Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(t.id)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          t.isCompleted
                            ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                            : "border border-white/30 hover:border-emerald-400 bg-white/5 text-transparent"
                        }`}
                        title={t.isCompleted ? "Mark pending" : "Mark completed"}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* Priority Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider font-mono ${prio.badge}`}
                      >
                        {prio.label}
                      </span>

                      {/* Category Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider truncate flex items-center gap-1 ${cat.bg} ${cat.color} border ${cat.border}`}
                      >
                        <CatIcon className="w-2.5 h-2.5" />
                        <span className="truncate">{cat.label.split(" ")[0]}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(t)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                        title="Edit task"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                        title="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={`font-black text-sm text-white leading-snug mb-1.5 transition-all ${
                      t.isCompleted ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {t.title}
                  </h3>

                  {/* Description / Instructions */}
                  {t.description && (
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-3 bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                      {t.description}
                    </p>
                  )}

                  {/* Date & Time Alarm Pill */}
                  <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-black/50 border border-white/5 font-mono mb-3">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{t.dueDate || "No date set"}</span>
                      {t.reminderTime && (
                        <>
                          <span className="text-slate-600">•</span>
                          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{t.reminderTime}</span>
                        </>
                      )}
                    </div>

                    {isOverdue ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[9px] font-black uppercase">
                        Overdue
                      </span>
                    ) : isDueToday ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-black uppercase">
                        Due Today
                      </span>
                    ) : t.isCompleted ? (
                      <span className="text-emerald-400 text-[9px] font-bold">Done</span>
                    ) : null}
                  </div>
                </div>

                {/* Card Footer: WhatsApp Student Broadcast */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    {t.notified ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Reminder Alert Sent
                      </span>
                    ) : (
                      <span>Email active ({emailRecipient.split("@")[0]}...)</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBroadcast(t)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    title="Generate 1-Click WhatsApp Reminder for students"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Create or Edit Task                                              */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-rose-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-500/20 to-transparent">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-rose-400" />
                {editingTaskId ? "Edit Task" : "Add Task & Set Reminder"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetTaskForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-3.5">
              {/* Task Title */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Collect CS-603 Compiler Construction Assignment 1"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(CATEGORY_MAP).map(([k, cfg]) => {
                    const isSel = taskCategory === k;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTaskCategory(k)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSel
                            ? `${cfg.bg} ${cfg.color} border ${cfg.border} ring-1 ring-white/30 font-black`
                            : "bg-black/30 border-white/10 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none"
                  >
                    <option value="URGENT">🔴 Urgent</option>
                    <option value="HIGH">🟡 High</option>
                    <option value="MEDIUM">🔵 Medium</option>
                    <option value="LOW">⚪ Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Alarm Time
                  </label>
                  <input
                    type="time"
                    value={taskReminderTime}
                    onChange={(e) => setTaskReminderTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Description / Instructions / Submission Guidelines
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="e.g. Collect printed reports before 11:30 AM class and submit to Ms. Anum Khalid"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Email Notice */}
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-start gap-2 text-xs text-indigo-200">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Automatic Email Service:</strong> Saving this task will immediately send a confirmation email to <strong>{emailRecipient}</strong>, and an urgent alert when the scheduled alarm triggers!
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetTaskForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/25 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving & Sending Email..." : editingTaskId ? "Save Changes" : "Save Task & Alarm"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 1-Click WhatsApp Student Deadline Alert Broadcast                */}
      {/* ========================================================================= */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/20 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    1-Click WhatsApp Student Reminder
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Ready to paste directly into BSCS 7th (E2) WhatsApp class group!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <textarea
                rows={9}
                readOnly
                value={broadcastText}
                className="w-full p-3.5 rounded-2xl bg-black/70 border border-emerald-400/30 text-white font-mono text-xs focus:outline-none select-all leading-relaxed shadow-inner"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Click below to copy formatted text
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(broadcastText);
                      setCopiedBroadcast(true);
                      setTimeout(() => setCopiedBroadcast(false), 2500);
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02]"
                  >
                    {copiedBroadcast ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Broadcast Message</span>
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
      {/* ========================================================================= */}
      {/* MODAL 3: Email Notification Configuration & Google SMTP Connection       */}
      {/* ========================================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-indigo-500/40 shadow-2xl bg-slate-950/95 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    Email Notification & Gmail SMTP Gateway
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Dual automatic delivery: on task creation & at alarm deadline
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSmtpStatusMessage(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Delivery Status Banner */}
              {isLiveSmtp ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 flex items-start gap-3 text-emerald-200">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-black text-white flex items-center gap-1.5">
                      <span>Live Gmail Delivery Active</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                        Online
                      </span>
                    </div>
                    <div className="text-emerald-300/90 text-[11px] mt-0.5">
                      Authenticated with Google SMTP. Real emails will arrive directly in <strong>{emailRecipient}</strong>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-start gap-3 text-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-black text-white">Google App Password Required</div>
                    <div className="text-amber-300/90 text-[11px] mt-0.5 leading-relaxed">
                      Google blocks local apps without a 16-character App Password. Enter your App Password below once to unlock real Gmail inbox delivery.
                    </div>
                  </div>
                </div>
              )}

              {/* 3-Step App Password Guide */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    How to get your 16-character App Password (30 sec):
                  </span>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Open Google Security</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                  <li>
                    Ensure <strong>2-Step Verification</strong> is ON for your Google account.
                  </li>
                  <li>
                    Open{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-300 font-bold hover:underline"
                    >
                      myaccount.google.com/apppasswords
                    </a>
                    , enter app name <strong className="text-white">CR-Ship</strong>, and click <strong>Create</strong>.
                  </li>
                  <li>
                    Copy the yellow box with <strong className="text-white">16 letters</strong> (e.g. <code className="bg-black/60 px-1 py-0.5 rounded text-amber-300">abcd efgh ijkl mnop</code>) and paste below.
                  </li>
                </ol>
              </div>

              {/* Setup Form */}
              <form onSubmit={handleSaveAndConnectSmtp} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Your Gmail Address (Sender)
                  </label>
                  <input
                    type="email"
                    required
                    value={smtpSender}
                    onChange={(e) => setSmtpSender(e.target.value)}
                    placeholder="e.g. zohaibmuaz@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Google App Password (16 characters) *
                  </label>
                  <div className="relative">
                    <input
                      type={showAppPassword ? "text" : "password"}
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-black/60 border border-white/15 text-amber-300 font-mono text-xs font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAppPassword(!showAppPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showAppPassword ? "Hide password" : "Show password"}
                    >
                      {showAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Spaces will be stripped automatically. Saved securely to your local <code className="text-slate-300">.env</code>.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Target Recipient (Where you receive alarms & task notices)
                  </label>
                  <input
                    type="email"
                    required
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="e.g. zohaibmuaz@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Status Feedback Banners */}
                {smtpStatusMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-medium ${
                      smtpStatusMessage.type === "success"
                        ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-200"
                        : "bg-rose-500/15 border-rose-400/50 text-rose-200"
                    }`}
                  >
                    {smtpStatusMessage.text}
                  </div>
                )}

                {testEmailResult && !smtpStatusMessage && (
                  <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-400/40 text-xs text-indigo-200 font-medium">
                    {testEmailResult}
                  </div>
                )}

                {/* Dual Notification Explainer */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px]">
                    <div className="font-bold text-white flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3 text-indigo-400" />
                      <span>Task Created Email</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Immediate record with deadline & notes dispatched on save.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px]">
                    <div className="font-bold text-white flex items-center gap-1 mb-1">
                      <BellRing className="w-3 h-3 text-rose-400" />
                      <span>Time-Up Alarm Email</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      High-priority urgent alarm dispatched when deadline time hits.
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setSmtpStatusMessage(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2">
                    {isLiveSmtp && (
                      <button
                        type="button"
                        disabled={isSendingTestEmail}
                        onClick={handleSendTestEmail}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingTestEmail ? "Sending..." : "Send Test Ping"}</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingSmtp}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isSavingSmtp ? "Connecting & Testing..." : isLiveSmtp ? "Update & Test Gmail" : "Connect Gmail & Test"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
