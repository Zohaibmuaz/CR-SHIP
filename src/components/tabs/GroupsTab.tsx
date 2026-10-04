"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Camera,
  Share2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  GripVertical,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import html2canvas from "html2canvas";

interface SubjectSummary {
  id: number;
  code: string;
  name: string;
  creditHours: number;
  teacherName: string;
  totalGroups: number;
}

interface Student {
  id: number;
  srNo: number;
  regNo: string;
  name: string;
}

interface GroupMember {
  memberId: number;
  studentId: number;
  regNo: string;
  name: string;
}

interface StudentGroup {
  id: number;
  subjectId: number;
  groupNumber: number;
  groupName: string;
  topic: string;
  members: GroupMember[];
}

interface ParsedGroupItem {
  groupNumber: number;
  groupName: string;
  topic: string;
  studentIds: number[];
  students: Student[];
  unmatchedTokens: string[];
}

export function GroupsTab() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number>(1);
  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Group Capacity Setting (Per-Course Configurable Max Members, no leader)
  const [maxMembers, setMaxMembers] = useState<number>(4);

  // Filter / Search for Unassigned Students
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Drag and Drop States
  const [draggedStudent, setDraggedStudent] = useState<{
    studentId: number;
    fromGroupId: number | null;
  } | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);
  const [dragOverUnassigned, setDragOverUnassigned] = useState<boolean>(false);

  // Group Drag and Drop (Reordering) States
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);

  // Inline Topic Editing State
  const [editingTopicGroupId, setEditingTopicGroupId] = useState<number | null>(null);
  const [topicInputValue, setTopicInputValue] = useState<string>("");

  // Raw Text Import Modal State (with full inline editing)
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedGroupItem[]>([]);

  // WhatsApp Export Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Picture Export Ref
  const exportImageRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Quick Assign Popover State
  const [quickAssignStudentId, setQuickAssignStudentId] = useState<number | null>(null);

  // Fetch groups data for current subject
  const fetchData = async (subjectId?: number) => {
    setLoading(true);
    try {
      const subId = subjectId || activeSubjectId;
      const res = await fetch(`/api/groups?subjectId=${subId}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.allSubjects);
        setActiveSubjectId(data.activeSubjectId);
        setActiveSubject(data.activeSubject);
        setMaxMembers(data.activeSubject?.maxMembers || data.maxMembers || 4);
        setGroups(data.groups);
        setAllStudents(data.allStudents);
        setUnassignedStudents(data.unassignedStudents);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubjectChange = (newSubjectId: number) => {
    setActiveSubjectId(newSubjectId);
    setSearchQuery("");
    fetchData(newSubjectId);
  };

  // Safe Max Members Change (Warns if existing group exceeds new limit, never removes groups)
  const handleMaxMembersChange = async (newVal: number) => {
    const clamped = Math.max(2, Math.min(newVal, 10));
    if (clamped === maxMembers) return;

    // Check if any existing group has more members than new limit
    const exceeding = groups.filter((g) => g.members.length > clamped);
    if (exceeding.length > 0) {
      const msg = `Notice: ${exceeding.length} group(s) already have more than ${clamped} members (e.g. ${exceeding[0].groupName} has ${exceeding[0].members.length} members).\n\nLowering the limit to ${clamped} will KEEP all existing members completely safe, but will prevent adding more members to groups that are at or above ${clamped}.\n\nDo you want to update the course limit to ${clamped}?`;
      if (!confirm(msg)) return;
    }

    setMaxMembers(clamped);

    try {
      await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SUBJECT_MAX_MEMBERS",
          subjectId: activeSubjectId,
          maxMembers: clamped,
        }),
      });
    } catch (err) {
      console.error("Failed to save course max members:", err);
    }
  };

  // Add Empty Group
  const handleAddEmptyGroup = async () => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_GROUP",
          subjectId: activeSubjectId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData(activeSubjectId);
      }
    } catch (err) {
      console.error("Failed to add group:", err);
    }
  };

  // Delete Group (all members return to unassigned)
  const handleDeleteGroup = async (groupId: number) => {
    const grp = groups.find((g) => g.id === groupId);
    if (!confirm(`Are you sure you want to delete ${grp?.groupName || "this group"}? Its members will return to the unassigned pool.`)) return;
    try {
      const res = await fetch(`/api/groups?groupId=${groupId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData(activeSubjectId);
      }
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  // Remove Single Member from Group
  const handleRemoveMember = async (groupId: number, studentId: number) => {
    try {
      const res = await fetch(
        `/api/groups/members?groupId=${groupId}&studentId=${studentId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        await fetchData(activeSubjectId);
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  // Add Member to Group
  const handleAddMemberToGroup = async (groupId: number, studentId: number) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (targetGroup && targetGroup.members.length >= maxMembers) {
      alert(`Cannot add student. ${targetGroup.groupName} has reached the maximum capacity of ${maxMembers} members.`);
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_MEMBER",
          groupId,
          studentId,
          subjectId: activeSubjectId,
          maxMembers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickAssignStudentId(null);
        await fetchData(activeSubjectId);
      } else {
        alert(data.error || "Could not add student");
      }
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  // Move Student Between Groups or from Unassigned
  const handleMoveStudent = async (
    studentId: number,
    fromGroupId: number | null,
    toGroupId: number
  ) => {
    if (fromGroupId === toGroupId) return;

    const targetGroup = groups.find((g) => g.id === toGroupId);
    if (targetGroup && targetGroup.members.length >= maxMembers) {
      alert(`Cannot move student. ${targetGroup.groupName} is already at maximum capacity of ${maxMembers} members.`);
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVE_MEMBER",
          studentId,
          toGroupId,
          subjectId: activeSubjectId,
          maxMembers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData(activeSubjectId);
      } else {
        alert(data.error || "Could not move student");
      }
    } catch (err) {
      console.error("Move error:", err);
    }
  };

  // Save Inline Topic
  const handleSaveTopic = async (groupId: number) => {
    try {
      const res = await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_GROUP",
          groupId,
          topic: topicInputValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingTopicGroupId(null);
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, topic: topicInputValue.trim() } : g))
        );
      }
    } catch (err) {
      console.error("Failed to save topic:", err);
    }
  };

  // Reorder Groups via Drag & Drop or Arrow buttons
  const handleMoveGroupOrder = async (
    fromIndex: number,
    target: "UP" | "DOWN" | number
  ) => {
    let targetIndex: number;
    if (target === "UP") {
      targetIndex = fromIndex - 1;
    } else if (target === "DOWN") {
      targetIndex = fromIndex + 1;
    } else {
      targetIndex = target;
    }

    if (
      targetIndex === fromIndex ||
      targetIndex < 0 ||
      targetIndex >= groups.length ||
      fromIndex < 0 ||
      fromIndex >= groups.length
    ) {
      return;
    }

    const newGroups = [...groups];
    const [moved] = newGroups.splice(fromIndex, 1);
    newGroups.splice(targetIndex, 0, moved);

    const renumbered = newGroups.map((g, idx) => ({
      ...g,
      groupNumber: idx + 1,
      groupName: `Group ${idx + 1}`,
    }));

    // Optimistic UI update
    setGroups(renumbered);

    try {
      const orderedIds = renumbered.map((g) => g.id);
      await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REORDER_GROUPS",
          subjectId: activeSubjectId,
          orderedGroupIds: orderedIds,
        }),
      });
      await fetchData(activeSubjectId);
    } catch (err) {
      console.error("Failed to reorder groups:", err);
      await fetchData(activeSubjectId);
    }
  };

  // Smart Raw Text Parser
  const parseRawText = (text: string) => {
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedGroupItem[] = [];

    let currentGroup: ParsedGroupItem | null = null;
    let groupCounter = 1;

    // Helper to match token to student
    const matchTokenToStudent = (token: string): Student | null => {
      const clean = token.trim();
      if (!clean) return null;

      // 1. Try s{N} or roll{N} or just number {N} (1-63)
      const rollMatch = clean.match(/^s?(\d+)$/i) || clean.match(/^roll\s*(\d+)$/i);
      if (rollMatch) {
        const rollNum = parseInt(rollMatch[1], 10);
        if (rollNum >= 1 && rollNum <= allStudents.length) {
          return allStudents[rollNum - 1];
        }
      }

      // 2. Try exact 2021-ag-xxxx or 2022-ag-xxxx or 2023-ag-xxxx match
      const agMatch = clean.match(/202\d-ag-\d+/i);
      if (agMatch) {
        const found = allStudents.find(
          (st) => (st.regNo || "").toLowerCase() === agMatch[0].toLowerCase()
        );
        if (found) return found;
      }

      // 3. Try name match
      const cleanLower = clean.toLowerCase();
      if (cleanLower.length >= 3) {
        const found = allStudents.find((st) => {
          const stName = (st.name || "").toLowerCase();
          return stName.includes(cleanLower) || cleanLower.includes(stName);
        });
        if (found) return found;
      }

      return null;
    };

    lines.forEach((line) => {
      const groupHeaderMatch = line.match(/^(?:group|team)?\s*(\d+)[\:\.\-\)]?\s*(.*)$/i);
      const isExplicitGroup = line.toLowerCase().startsWith("group") || line.toLowerCase().startsWith("team");

      if (isExplicitGroup || (groupHeaderMatch && !currentGroup)) {
        if (currentGroup) {
          parsed.push(currentGroup);
        }

        const num = groupHeaderMatch ? parseInt(groupHeaderMatch[1], 10) : groupCounter;
        let restOfLine = groupHeaderMatch ? groupHeaderMatch[2] : line.replace(/^(?:group|team)\s*\d*[\:\.\-]?/i, "");
        groupCounter = num + 1;

        let topic = "";
        const topicMatch = restOfLine.match(/(?:topic|project|title)[\:\=]\s*(.*)$/i);
        if (topicMatch) {
          topic = topicMatch[1].trim();
          restOfLine = restOfLine.replace(/(?:topic|project|title)[\:\=]\s*.*$/i, "");
        }

        currentGroup = {
          groupNumber: num,
          groupName: `Group ${num}`,
          topic,
          studentIds: [],
          students: [],
          unmatchedTokens: [],
        };

        if (restOfLine.trim()) {
          const tokens = restOfLine.split(/[,;\t]+/).map((t) => t.trim()).filter(Boolean);
          tokens.forEach((tok) => {
            const st = matchTokenToStudent(tok);
            if (st) {
              if (!currentGroup!.studentIds.includes(st.id)) {
                currentGroup!.studentIds.push(st.id);
                currentGroup!.students.push(st);
              }
            } else {
              currentGroup!.unmatchedTokens.push(tok);
            }
          });
        }
      } else if (currentGroup) {
        const topicMatch = line.match(/^(?:topic|project|title)[\:\=]\s*(.*)$/i);
        if (topicMatch) {
          currentGroup.topic = topicMatch[1].trim();
        } else {
          const tokens = line.split(/[,;\t]+/).map((t) => t.trim()).filter(Boolean);
          tokens.forEach((tok) => {
            const st = matchTokenToStudent(tok);
            if (st) {
              if (!currentGroup!.studentIds.includes(st.id)) {
                currentGroup!.studentIds.push(st.id);
                currentGroup!.students.push(st);
              }
            } else {
              currentGroup!.unmatchedTokens.push(tok);
            }
          });
        }
      }
    });

    if (currentGroup) {
      parsed.push(currentGroup);
    }

    setParsedPreview(parsed);
  };

  // Preview Inline Editing Handlers
  const handleRemoveStudentFromPreview = (groupIndex: number, studentId: number) => {
    setParsedPreview((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        return {
          ...g,
          studentIds: g.studentIds.filter((id) => id !== studentId),
          students: g.students.filter((st) => st.id !== studentId),
        };
      })
    );
  };

  const handleAddStudentToPreview = (groupIndex: number, studentId: number) => {
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) return;

    setParsedPreview((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        if (g.studentIds.includes(studentId)) return g;
        return {
          ...g,
          studentIds: [...g.studentIds, studentId],
          students: [...g.students, student],
        };
      })
    );
  };

  const handleUpdatePreviewTopic = (groupIndex: number, newTopic: string) => {
    setParsedPreview((prev) =>
      prev.map((g, idx) => (idx === groupIndex ? { ...g, topic: newTopic } : g))
    );
  };

  const handleUpdatePreviewGroupName = (groupIndex: number, newName: string) => {
    setParsedPreview((prev) =>
      prev.map((g, idx) => (idx === groupIndex ? { ...g, groupName: newName } : g))
    );
  };

  const handleDeletePreviewGroup = (groupIndex: number) => {
    setParsedPreview((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  // Submit Bulk Import after user has reviewed & edited
  const handleBulkImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);

    try {
      const payload = {
        action: "BULK_IMPORT",
        subjectId: activeSubjectId,
        replaceExisting,
        groups: parsedPreview.map((p) => ({
          groupNumber: p.groupNumber,
          groupName: p.groupName,
          topic: p.topic,
          studentIds: p.studentIds,
        })),
      };

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowRawModal(false);
        setRawText("");
        setParsedPreview([]);
        await fetchData(activeSubjectId);
      } else {
        alert(data.error || "Failed to import groups");
      }
    } catch (err) {
      console.error("Bulk import error:", err);
      alert("Error importing groups");
    } finally {
      setIsImporting(false);
    }
  };

  // Generate WhatsApp Message
  const handleGenerateWhatsApp = () => {
    if (groups.length === 0) {
      alert("No groups created yet to share.");
      return;
    }

    let text = `*📢 BSCS 7th E2 — PROJECT / PRESENTATION GROUPS*\n`;
    text += `*Course:* ${activeSubject?.code} — ${activeSubject?.name}\n`;
    text += `*Teacher:* ${activeSubject?.teacherName}\n`;
    text += `*Max Members per Group:* ${maxMembers}\n`;
    text += `*Total Groups:* ${groups.length} | *Assigned:* ${allStudents.length - unassignedStudents.length}/${allStudents.length}\n`;
    text += `────────────────────────────\n\n`;

    groups.forEach((grp) => {
      text += `*👥 ${grp.groupName}* (${grp.members.length}/${maxMembers})\n`;
      if (grp.topic) {
        text += `📌 *Topic:* ${grp.topic}\n`;
      }
      if (grp.members.length === 0) {
        text += `   _(No members assigned yet)_\n`;
      } else {
        grp.members.forEach((m, idx) => {
          text += `   ${idx + 1}. ${m.name} (${m.regNo})\n`;
        });
      }
      text += `\n`;
    });

    if (unassignedStudents.length > 0) {
      text += `────────────────────────────\n`;
      text += `*⚠️ UNASSIGNED STUDENTS (${unassignedStudents.length}):*\n`;
      unassignedStudents.forEach((st, idx) => {
        text += `${idx + 1}. ${st.name} (${st.regNo})\n`;
      });
      text += `\n_Please contact CR to join an existing group with free capacity._\n`;
    }

    setWhatsAppText(text);
    setShowWhatsAppModal(true);
  };

  // Capture & Download Image (.png)
  const handleExportPicture = async () => {
    if (!exportImageRef.current) return;
    setIsExportingImage(true);

    try {
      const canvas = await html2canvas(exportImageRef.current, {
        scale: 2, // High resolution retina capture
        backgroundColor: "#080c18",
        useCORS: true,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      const cleanCode = activeSubject?.code.replace(/[^a-zA-Z0-9_-]/g, "_") || "Groups";
      link.download = `${cleanCode}_BSCS7thE2_Groups.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
      alert("Could not generate picture. Please try again.");
    } finally {
      setIsExportingImage(false);
    }
  };

  // Filtered Unassigned Students
  const filteredUnassigned = unassignedStudents.filter((st) => {
    if (!st) return false;
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (st.name || "").toLowerCase().includes(q);
    const regMatch = (st.regNo || "").toLowerCase().includes(q);
    const srMatch = st.srNo != null ? st.srNo.toString().includes(q) : false;
    return nameMatch || regMatch || srMatch;
  });

  return (
    <div className="space-y-5">
      {/* 1. Top Section: 6 Official Subject Tabs FIRST (so it is 100% clear which course is selected) */}
      <div className="glass-card p-5 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Phase 4 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                BSCS 7th E2
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                Equal Members (No Leader)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Course Group Workspaces
            </h2>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Select a course below to manage its groups in 100% isolation:
          </div>
        </div>

        {/* 6 Subject Isolation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {subjects.map((sub) => {
            const isSelected = sub.id === activeSubjectId;
            return (
              <button
                key={sub.id}
                onClick={() => handleSubjectChange(sub.id)}
                className={`p-3 rounded-2xl text-left transition-all duration-200 relative overflow-hidden border ${
                  isSelected
                    ? "bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border-indigo-400 shadow-lg shadow-indigo-500/25 scale-[1.02]"
                    : "glass-card border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                )}
                <div className="font-mono font-black text-sm text-indigo-950 dark:text-white tracking-wide">
                  {sub.code}
                </div>
                <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-200 truncate mt-0.5" title={sub.name}>
                  {sub.name}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                  <span className="text-slate-400 truncate max-w-[70px]" title={sub.teacherName}>
                    {sub.teacherName}
                  </span>
                  <span className="font-black text-emerald-400">
                    {sub.totalGroups} Teams
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Course Banner & Contextual Controls (Directly attached to the active course) */}
      {activeSubject && (
        <div className="glass-card p-4 rounded-3xl border border-indigo-500/25 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base text-white">
                  {activeSubject.code} — {activeSubject.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {groups.length} Groups
                </span>
              </div>
              <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                Teacher: <strong className="text-white">{activeSubject.teacherName}</strong> • {allStudents.length - unassignedStudents.length} / {allStudents.length} Assigned
              </p>
            </div>
          </div>

          {/* Controls specifically for this Course */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Max Members Stepper for THIS COURSE */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-indigo-500/30">
              <span className="text-slate-300 text-xs font-bold whitespace-nowrap">
                Max / Group:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMaxMembersChange(maxMembers - 1)}
                  className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center justify-center transition-all"
                  title="Decrease max members for this course"
                >
                  -
                </button>
                <span className="font-mono font-black text-sm text-indigo-400 px-1.5 min-w-6 text-center">
                  {maxMembers}
                </span>
                <button
                  type="button"
                  onClick={() => handleMaxMembersChange(maxMembers + 1)}
                  className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center justify-center transition-all"
                  title="Increase max members for this course"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowRawModal(true);
                setRawText("");
                setParsedPreview([]);
              }}
              className="px-3 py-1.5 rounded-xl font-bold text-xs glass-button bg-indigo-600/30 text-indigo-200 border-indigo-400/40 hover:bg-indigo-500/40 transition-all flex items-center gap-1.5 shadow-md"
              title="Paste raw text like 'Group 1: s1 s2 s3 Topic: AI'"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>📋 Paste Raw Text</span>
            </button>

            <button
              onClick={handleAddEmptyGroup}
              className="px-3 py-1.5 rounded-xl font-bold text-xs glass-button text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Group</span>
            </button>

            <button
              onClick={handleExportPicture}
              disabled={isExportingImage || groups.length === 0}
              className="px-3 py-1.5 rounded-xl font-bold text-xs glass-button text-amber-200 border-amber-400/30 hover:bg-amber-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
              title="Download clean picture for WhatsApp"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>📸 Picture (.png)</span>
            </button>

            <a
              href={`/api/groups/export?subjectId=${activeSubjectId}`}
              download
              className="px-3 py-1.5 rounded-xl font-bold text-xs glass-button text-sky-200 border-sky-400/30 hover:bg-sky-500/30 transition-all flex items-center gap-1"
              title="Download official Excel sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>📥 Excel</span>
            </a>

            <button
              onClick={handleGenerateWhatsApp}
              className="px-3 py-1.5 rounded-xl font-bold text-xs glass-button text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
              title="Copy WhatsApp text"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>💬 WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Split between Unassigned Pool (2 Columns) & Visual Groups (Compact Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Unassigned Students Pool in 2 COLUMNS (5 Cols on large screen) */}
        <div
          className={`lg:col-span-5 glass-card p-4 rounded-3xl border transition-all flex flex-col ${
            dragOverUnassigned
              ? "border-amber-400 bg-amber-950/25 shadow-xl shadow-amber-500/20"
              : "border-indigo-500/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverUnassigned(true);
          }}
          onDragLeave={() => setDragOverUnassigned(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverUnassigned(false);
            if (draggedStudent && draggedStudent.fromGroupId !== null) {
              handleRemoveMember(draggedStudent.fromGroupId, draggedStudent.studentId);
              setDraggedStudent(null);
            }
          }}
        >
          {/* Unassigned Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Unassigned Pool</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    unassignedStudents.length > 0
                      ? "bg-amber-500/20 border border-amber-400/40 text-amber-300"
                      : "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                  }`}
                >
                  {unassignedStudents.length} / {allStudents.length} Free
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Drag any student chip directly onto a group on the right 👉
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by roll (#1-63), Ag, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-400"
            />
          </div>

          {/* 2-COLUMN COMPACT STUDENTS GRID (Fits all students without massive scrolling) */}
          <div className="max-h-[580px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-indigo-300 font-bold">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                Loading roster...
              </div>
            ) : filteredUnassigned.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                {searchQuery ? "No unassigned students match." : "🎉 All 63 students are assigned to groups!"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredUnassigned.map((st) => (
                  <div
                    key={st.id}
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggedStudent({ studentId: st.id, fromGroupId: null });
                      e.dataTransfer.setData("application/json", JSON.stringify({ studentId: st.id, fromGroupId: null }));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedStudent(null)}
                    className="p-1.5 rounded-xl bg-black/35 border border-white/10 hover:border-indigo-400/60 hover:bg-white/[0.05] transition-all flex items-center justify-between gap-1 select-none cursor-grab active:cursor-grabbing group shadow-sm relative"
                    title={`Drag to a group, or click '+' to quick assign`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 shrink-0" />
                      <span className="font-mono text-[9px] text-slate-400 shrink-0 font-bold">
                        #{st.srNo}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-[11px] text-white truncate leading-tight" title={st.name}>
                          {st.name}
                        </div>
                        <div className="font-mono text-[9px] text-emerald-400 truncate">
                          {st.regNo}
                        </div>
                      </div>
                    </div>

                    {/* Quick Assign Dropdown Button */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAssignStudentId(quickAssignStudentId === st.id ? null : st.id);
                        }}
                        className="w-5 h-5 rounded-md bg-white/10 hover:bg-indigo-500/40 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black transition-colors"
                        title="Quick assign to group"
                      >
                        +
                      </button>

                      {/* Dropdown Menu */}
                      {quickAssignStudentId === st.id && (
                        <div className="absolute right-0 top-6 z-30 w-36 py-1 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-0.5">
                          <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-white/10">
                            Assign to:
                          </div>
                          {groups.length === 0 ? (
                            <div className="px-2 py-1 text-[10px] text-slate-500 italic">
                              No groups yet
                            </div>
                          ) : (
                            groups.map((g) => {
                              const isFull = g.members.length >= maxMembers;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => handleAddMemberToGroup(g.id, st.id)}
                                  className="w-full px-2 py-1 text-left text-[11px] hover:bg-indigo-600/30 flex items-center justify-between text-white disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <span>{g.groupName}</span>
                                  <span className="font-mono text-[9px] text-slate-400">
                                    {g.members.length}/{maxMembers}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Visual Groups Grid in COMPACT 3-COLUMN CARDS (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="glass-card py-20 rounded-3xl border border-indigo-500/20 text-center text-xs text-indigo-300 font-bold">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading group cards...
            </div>
          ) : groups.length === 0 ? (
            <div className="glass-card py-16 rounded-3xl border border-indigo-500/20 text-center space-y-2.5">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-white font-bold text-sm">
                No groups created yet for {activeSubject?.code}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click <strong>"+ Add Group"</strong> to add a team card, or click{" "}
                <strong>"📋 Paste Raw Text"</strong> to import multiple teams at once!
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleAddEmptyGroup}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/30"
                >
                  + Add First Group
                </button>
                <button
                  onClick={() => setShowRawModal(true)}
                  className="px-3.5 py-1.5 rounded-xl glass-button text-indigo-200 border-indigo-400/40 text-xs font-bold"
                >
                  📋 Paste Raw Text
                </button>
              </div>
            </div>
          ) : (
            /* Compact Responsive 3-Column Grid for sleek overview and easy drag-drop */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groups.map((grp, index) => {
                const isFull = grp.members.length >= maxMembers;
                const isOverStudentDrop = dragOverGroupId === grp.id;
                const isOverGroupDrop = dragOverGroupIndex === index;
                const isBeingDragged = draggedGroupIndex === index;
                const isEditingTopic = editingTopicGroupId === grp.id;

                return (
                  <div
                    key={grp.id}
                    draggable={!draggedStudent}
                    onDragStart={(e) => {
                      if (draggedStudent) return;
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest("input") ||
                        target.closest(".student-chip")
                      ) {
                        return;
                      }
                      e.stopPropagation();
                      e.dataTransfer.setData("type", "group");
                      e.dataTransfer.setData("fromIndex", index.toString());
                      e.dataTransfer.effectAllowed = "move";
                      setDraggedGroupIndex(index);
                      setDraggedStudent(null);
                    }}
                    onDragEnd={() => {
                      setDraggedGroupIndex(null);
                      setDragOverGroupIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedStudent) {
                        setDragOverGroupId(grp.id);
                      } else if (draggedGroupIndex !== null && draggedGroupIndex !== index) {
                        setDragOverGroupIndex(index);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverGroupId(null);
                        setDragOverGroupIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverGroupId(null);
                      setDragOverGroupIndex(null);

                      // 1. Group reorder drop
                      if (draggedGroupIndex !== null) {
                        if (draggedGroupIndex !== index) {
                          handleMoveGroupOrder(draggedGroupIndex, index);
                        }
                        setDraggedGroupIndex(null);
                        return;
                      }

                      // 2. Student move drop
                      if (draggedStudent) {
                        handleMoveStudent(
                          draggedStudent.studentId,
                          draggedStudent.fromGroupId,
                          grp.id
                        );
                        setDraggedStudent(null);
                      }
                    }}
                    className={`glass-card p-3 rounded-2xl border transition-all flex flex-col justify-between group/card relative ${
                      isBeingDragged
                        ? "opacity-30 scale-95 border-dashed border-amber-400/80 bg-amber-500/10 cursor-grabbing"
                        : isOverGroupDrop
                        ? "border-amber-400 bg-amber-950/40 shadow-2xl shadow-amber-500/30 scale-[1.03] ring-2 ring-amber-400"
                        : isOverStudentDrop
                        ? "border-emerald-400 bg-emerald-950/30 shadow-xl shadow-emerald-500/25 scale-[1.02]"
                        : isFull
                        ? "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-400/50"
                        : "border-indigo-500/20 hover:border-indigo-400/40"
                    }`}
                  >
                    {/* Glowing Overlay when hovering a dragged group over this card */}
                    {isOverGroupDrop && (
                      <div className="absolute inset-0 z-30 rounded-2xl bg-slate-950/90 backdrop-blur-[2px] border-2 border-amber-400 flex flex-col items-center justify-center gap-1.5 p-3 animate-in fade-in zoom-in-95 pointer-events-none">
                        <div className="px-3 py-1 rounded-full bg-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5" />
                          Drop Here to Make Group #{index + 1}
                        </div>
                        <span className="text-[11px] font-bold text-amber-300 text-center">
                          All groups will automatically renumber sequentially
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Group Header: Drag handle, Name, Up/Down reorder, Capacity, Delete */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          {/* Dedicated Drag Handle */}
                          <div
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData("type", "group");
                              e.dataTransfer.setData("fromIndex", index.toString());
                              e.dataTransfer.effectAllowed = "move";
                              setDraggedGroupIndex(index);
                              setDraggedStudent(null);
                            }}
                            onDragEnd={() => {
                              setDraggedGroupIndex(null);
                              setDragOverGroupIndex(null);
                            }}
                            className="p-1 -ml-1 rounded hover:bg-white/10 text-slate-400 hover:text-amber-400 cursor-grab active:cursor-grabbing transition-colors"
                            title="Drag to reorder / renumber group"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Reorder Arrows */}
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => handleMoveGroupOrder(index, "UP")}
                              disabled={index === 0}
                              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                              title="Move Group Up (Renumber)"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveGroupOrder(index, "DOWN")}
                              disabled={index === groups.length - 1}
                              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                              title="Move Group Down (Renumber)"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-mono font-black text-xs text-white">
                            {grp.groupName}
                          </span>
                        </div>

                        {/* Capacity Pill & Delete */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black ${
                              isFull
                                ? "bg-emerald-500/25 border border-emerald-400/50 text-emerald-300"
                                : grp.members.length > 0
                                ? "bg-indigo-500/20 border border-indigo-400/40 text-indigo-300"
                                : "bg-black/40 border border-white/10 text-slate-400"
                            }`}
                          >
                            {grp.members.length} / {maxMembers} {isFull ? "• Full" : ""}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(grp.id)}
                            className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-500/30 transition-all opacity-60 group-hover/card:opacity-100"
                            title="Delete Group"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Topic: Compact 1-line Editable Chip */}
                      <div className="mb-2">
                        {isEditingTopic ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={topicInputValue}
                              onChange={(e) => setTopicInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTopic(grp.id);
                                if (e.key === "Escape") setEditingTopicGroupId(null);
                              }}
                              placeholder="Type topic..."
                              autoFocus
                              className="flex-1 px-2 py-0.5 rounded-lg bg-black/60 border border-indigo-400 text-[11px] text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTopic(grp.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Save topic"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTopicGroupId(null)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingTopicGroupId(grp.id);
                              setTopicInputValue(grp.topic || "");
                            }}
                            className="px-2 py-1 rounded-lg bg-black/30 border border-white/5 hover:border-indigo-400/40 cursor-pointer flex items-center justify-between gap-1 group/topic transition-colors"
                            title="Click to edit topic"
                          >
                            <div className="min-w-0 flex items-center gap-1">
                              <span className="text-[10px] shrink-0">📌</span>
                              <span
                                className={`text-[10px] truncate ${
                                  grp.topic
                                    ? "text-slate-200 font-bold"
                                    : "text-slate-500 italic"
                                }`}
                              >
                                {grp.topic || "Click to add topic..."}
                              </span>
                            </div>
                            <Edit2 className="w-2.5 h-2.5 text-slate-500 group-hover/topic:text-indigo-400 shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Members List inside card (Dropzone) */}
                      <div className="space-y-1 min-h-[65px]">
                        {grp.members.length === 0 ? (
                          <div className="py-4 border border-dashed border-white/10 rounded-xl text-center text-[10px] text-slate-500 select-none">
                            Drop student here
                          </div>
                        ) : (
                          grp.members.map((mem) => (
                            <div
                              key={mem.memberId}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedStudent({
                                  studentId: mem.studentId,
                                  fromGroupId: grp.id,
                                });
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({ studentId: mem.studentId, fromGroupId: grp.id })
                                );
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => setDraggedStudent(null)}
                              className="student-chip p-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-indigo-400/50 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing select-none group/mem transition-all shadow-sm"
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <GripVertical className="w-2.5 h-2.5 text-slate-600 group-hover/mem:text-indigo-400 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-[10px] text-white block truncate leading-tight">
                                    {mem.name}
                                  </span>
                                  <span className="font-mono text-[9px] text-emerald-400 block truncate leading-none">
                                    {mem.regNo}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(grp.id, mem.studentId)}
                                className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-all opacity-0 group-hover/mem:opacity-100"
                                title="Remove back to unassigned"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Capacity Free Info */}
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>Equal Members</span>
                      <span>
                        {maxMembers - grp.members.length > 0
                          ? `${maxMembers - grp.members.length} slot(s) free`
                          : "Full"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Dedicated Offscreen Container for Picture Export (Retina .PNG) */}
      <div
        ref={exportImageRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "1200px",
          backgroundColor: "#080c18",
          padding: "40px",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ borderBottom: "2px solid rgba(99, 102, 241, 0.4)", paddingBottom: "20px", marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "2px", color: "#818cf8", textTransform: "uppercase" }}>
                University of Agriculture, Faisalabad • Dept. of Computer Science
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "6px 0", color: "#ffffff" }}>
                {activeSubject?.code} — {activeSubject?.name}
              </h1>
              <div style={{ fontSize: "14px", color: "#a5b4fc", fontWeight: "600" }}>
                Section: BSCS 7th E2 (Evening) • Teacher: {activeSubject?.teacherName}
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "13px", color: "#34d399" }}>
              <div>Total Groups: {groups.length}</div>
              <div>Max Limit: {maxMembers} / team</div>
              <div style={{ color: "#fbbf24", marginTop: "4px" }}>
                Assigned: {allStudents.length - unassignedStudents.length} / {allStudents.length} Students
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {groups.map((grp) => (
            <div
              key={grp.id}
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff" }}>
                  {grp.groupName}
                </span>
                <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "10px", backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
                  {grp.members.length} / {maxMembers}
                </span>
              </div>

              {grp.topic && (
                <div style={{ fontSize: "11px", color: "#fbbf24", marginBottom: "8px", fontWeight: "600" }}>
                  📌 Topic: {grp.topic}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {grp.members.length === 0 ? (
                  <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
                    No members assigned
                  </div>
                ) : (
                  grp.members.map((mem, i) => (
                    <div
                      key={mem.memberId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        backgroundColor: "rgba(0, 0, 0, 0.35)",
                        padding: "5px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontWeight: "bold", color: "#ffffff" }}>
                        {i + 1}. {mem.name}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "#34d399", fontSize: "10px" }}>
                        {mem.regNo}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "30px", paddingTop: "15px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "11px", color: "#64748b", textAlign: "center" }}>
          Department of Computer Science • Class Representative Zohaib (BSCS 7th E2)
        </div>
      </div>

      {/* 5. Smart Raw Text Parser Modal WITH FULL INLINE EDITING BEFORE APPROVAL */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-indigo-500/30 p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <button
              onClick={() => setShowRawModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Smart Text Parser & Live Review
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Parse & Review Groups ({activeSubject?.code})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste raw groups text below. Review and edit any names or topics right here before approving!
              </p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>Paste Raw Text:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `Group 1: s1, s2, s3\nTopic: Compiler Lexical Analysis & Flex\n\nGroup 2: s4, s5, s6\nTopic: LR(1) Parser Table Generator\n\nGroup 3: s7, s8, s9\nTopic: Syntax-Directed Translation Engine`;
                      setRawText(sample);
                      parseRawText(sample);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                  >
                    <span>Insert Sample Template</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    parseRawText(e.target.value);
                  }}
                  placeholder={`Group 1: s1, s2, s3\nTopic: Compiler Optimization\n\nGroup 2: 2022-ag-7766, 2022-ag-7815\nTopic: LR(1) Parser`}
                  className="w-full p-3 rounded-2xl bg-black/50 border border-white/15 font-mono text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400 resize-none leading-relaxed"
                />
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-4 p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs">
                <span className="font-bold text-slate-300">Import Mode:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={replaceExisting}
                    onChange={() => setReplaceExisting(true)}
                    className="accent-indigo-500"
                  />
                  <span className="text-white font-semibold">Replace All Existing Groups</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={!replaceExisting}
                    onChange={() => setReplaceExisting(false)}
                    className="accent-indigo-500"
                  />
                  <span className="text-white font-semibold">Append to Existing Groups</span>
                </label>
              </div>

              {/* FULLY EDITABLE LIVE PREVIEW BEFORE APPROVAL */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Review & Edit Parsed Groups ({parsedPreview.length} Groups):</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      You can edit topics, remove wrong names, or add students below!
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedPreview.map((p, gIdx) => (
                      <div
                        key={gIdx}
                        className="p-3 rounded-2xl bg-black/50 border border-indigo-500/30 text-xs space-y-2 relative"
                      >
                        {/* Group Name & Topic Inputs */}
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={p.groupName}
                            onChange={(e) => handleUpdatePreviewGroupName(gIdx, e.target.value)}
                            className="px-2 py-1 rounded-lg bg-black/60 border border-white/20 text-white font-mono font-bold text-xs w-28 outline-none focus:border-indigo-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePreviewGroup(gIdx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                            title="Delete this group from preview"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editable Topic Input */}
                        <div>
                          <input
                            type="text"
                            value={p.topic}
                            onChange={(e) => handleUpdatePreviewTopic(gIdx, e.target.value)}
                            placeholder="📌 Enter / Edit Topic..."
                            className="w-full px-2.5 py-1 rounded-lg bg-black/60 border border-amber-500/30 text-amber-200 text-xs outline-none focus:border-amber-400 placeholder-amber-400/40"
                          />
                        </div>

                        {/* Students in this Group with ✕ button */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">
                            Assigned Members ({p.students.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.students.map((st) => (
                              <span
                                key={st.id}
                                className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1"
                              >
                                <span>{st.name} (#{st.srNo})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudentFromPreview(gIdx, st.id)}
                                  className="text-emerald-300 hover:text-rose-400 ml-0.5"
                                  title="Remove student"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Unmatched / Misspelled Tokens Warning & 1-Click Matcher */}
                        {p.unmatchedTokens.length > 0 && (
                          <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/40 text-[10px] space-y-1">
                            <span className="text-rose-300 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Unrecognized tokens: {p.unmatchedTokens.join(", ")}
                            </span>
                            <span className="text-slate-400 block">
                              Select from roster to resolve:
                            </span>
                            <select
                              onChange={(e) => {
                                const sid = parseInt(e.target.value, 10);
                                if (sid) handleAddStudentToPreview(gIdx, sid);
                                e.target.value = "";
                              }}
                              defaultValue=""
                              className="w-full px-2 py-0.5 rounded bg-black/60 border border-white/20 text-white text-[10px] outline-none"
                            >
                              <option value="" disabled>
                                + Match to correct student...
                              </option>
                              {allStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                  #{s.srNo} {s.name} ({s.regNo})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Add More Students to this Group */}
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Add student:</span>
                          <select
                            onChange={(e) => {
                              const sid = parseInt(e.target.value, 10);
                              if (sid) handleAddStudentToPreview(gIdx, sid);
                              e.target.value = "";
                            }}
                            defaultValue=""
                            className="px-2 py-0.5 rounded-md bg-black/60 border border-white/15 text-[10px] text-slate-300 outline-none hover:border-indigo-400"
                          >
                            <option value="" disabled>
                              + Add from roster
                            </option>
                            {allStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                #{s.srNo} {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                {parsedPreview.length > 0
                  ? `Ready to import ${parsedPreview.length} reviewed groups.`
                  : "Type or paste text above."}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRawModal(false)}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isImporting || parsedPreview.length === 0}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Groups...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Import to Canvas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. WhatsApp Broadcast Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl rounded-3xl border border-emerald-500/30 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  💬 WhatsApp Groups Broadcast
                </h3>
                <p className="text-xs text-emerald-300 font-bold">
                  Formatted list ready to paste directly into the class WhatsApp group.
                </p>
              </div>
            </div>

            <textarea
              readOnly
              rows={14}
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
    </div>
  );
}
