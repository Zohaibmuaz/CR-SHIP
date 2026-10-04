"use client";

import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  FileText,
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Laptop,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  ExternalLink,
  Search,
  Sparkles,
  Share2,
  AlertCircle,
  FolderOpen,
  Link as LinkIcon,
  RefreshCw,
  SlidersHorizontal,
  BookmarkPlus,
  BookMarked,
  ArrowRight,
  HelpCircle,
  FileDown,
} from "lucide-react";

interface SubjectSummary {
  id: number;
  code: string;
  name: string;
  creditHours: number;
  teacherName: string;
  totalMaterials: number;
}

interface MaterialItem {
  id: number;
  subjectId: number;
  title: string;
  category: "SLIDES" | "BOOKS" | "HANDOUTS" | "PAST_PAPERS" | "ASSIGNMENTS" | string;
  linkOrPath: string;
  description: string | null;
  createdAt?: string;
}

interface CategoryCounts {
  total: number;
  SLIDES: number;
  BOOKS: number;
  HANDOUTS: number;
  PAST_PAPERS: number;
  ASSIGNMENTS: number;
}

interface ParsedMaterialDraft {
  id: string;
  subjectId: number;
  title: string;
  category: string;
  linkOrPath: string;
  description: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string; glow: string }
> = {
  SLIDES: {
    label: "Lecture Slides",
    icon: FileText,
    color: "text-indigo-300",
    bg: "bg-indigo-500/20",
    border: "border-indigo-400/40",
    glow: "shadow-indigo-500/20",
  },
  BOOKS: {
    label: "Reference Books",
    icon: BookOpen,
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    border: "border-amber-400/40",
    glow: "shadow-amber-500/20",
  },
  HANDOUTS: {
    label: "Handouts & Notes",
    icon: BookMarked,
    color: "text-teal-300",
    bg: "bg-teal-500/20",
    border: "border-teal-400/40",
    glow: "shadow-teal-500/20",
  },
  PAST_PAPERS: {
    label: "Past Papers & Exams",
    icon: GraduationCap,
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/20",
    border: "border-fuchsia-400/40",
    glow: "shadow-fuchsia-500/20",
  },
  ASSIGNMENTS: {
    label: "Assignments & Labs",
    icon: Laptop,
    color: "text-rose-300",
    bg: "bg-rose-500/20",
    border: "border-rose-400/40",
    glow: "shadow-rose-500/20",
  },
};

export default function MaterialsTab() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number>(1);
  const [activeSubject, setActiveSubject] = useState<SubjectSummary | null>(null);
  const [mainDriveLink, setMainDriveLink] = useState<string>("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    total: 0,
    SLIDES: 0,
    BOOKS: 0,
    HANDOUTS: 0,
    PAST_PAPERS: 0,
    ASSIGNMENTS: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Active Category Filter: "ALL" or specific category
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Master Drive Folder Edit State
  const [isEditingMainDrive, setIsEditingMainDrive] = useState<boolean>(false);
  const [mainDriveInput, setMainDriveInput] = useState<string>("");

  // Quick Single Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [singleTitle, setSingleTitle] = useState<string>("");
  const [singleCategory, setSingleCategory] = useState<string>("SLIDES");
  const [singleLink, setSingleLink] = useState<string>("");
  const [singleDesc, setSingleDesc] = useState<string>("");
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);

  // Smart Raw Text Auto-Organizer Modal State
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>("");
  const [parsedDrafts, setParsedDrafts] = useState<ParsedMaterialDraft[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState<boolean>(false);

  // WhatsApp Broadcast Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>("");
  const [copiedLinkMap, setCopiedLinkMap] = useState<Record<number, boolean>>({});
  const [copiedBroadcast, setCopiedBroadcast] = useState<boolean>(false);

  // Fetch Materials Data
  const fetchData = async (subjectId?: number) => {
    setLoading(true);
    try {
      const subId = subjectId || activeSubjectId;
      const res = await fetch(`/api/materials?subjectId=${subId}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.allSubjects);
        setActiveSubjectId(data.activeSubjectId);
        setActiveSubject(data.activeSubject);
        setMainDriveLink(data.mainDriveLink || "");
        setMaterials(data.materials);
        setCategoryCounts(data.categoryCounts);
      }
    } catch (err) {
      console.error("Failed to load course materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubjectChange = (newSubId: number) => {
    setActiveSubjectId(newSubId);
    setSelectedCategory("ALL");
    setSearchQuery("");
    fetchData(newSubId);
  };

  // ----------------------------------------------------
  // Save Master Drive Link
  // ----------------------------------------------------
  const handleSaveMainDriveLink = async () => {
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_MAIN_DRIVE",
          subjectId: activeSubjectId,
          mainDriveLink: mainDriveInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMainDriveLink(data.mainDriveLink);
        setIsEditingMainDrive(false);
      }
    } catch (err) {
      console.error("Failed to save master drive link:", err);
    }
  };

  // ----------------------------------------------------
  // Smart Raw Text Auto-Parser
  // ----------------------------------------------------
  const parseRawText = (text: string) => {
    if (!text.trim()) {
      setParsedDrafts([]);
      return;
    }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const drafts: ParsedMaterialDraft[] = [];

    // Helper regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    lines.forEach((line, idx) => {
      const urls = line.match(urlRegex);
      if (!urls || urls.length === 0) {
        // If line has no URL, check if there's any drive identifier or skip
        return;
      }

      urls.forEach((foundUrl, urlIdx) => {
        // Clean line by removing URL to extract title
        let cleanTitle = line.replace(foundUrl, "").trim();

        // Remove bullet markers like "-", "*", "1.", "•"
        cleanTitle = cleanTitle.replace(/^[-*•\d.]+\s*/, "").trim();
        // Remove trailing dashes or colons
        cleanTitle = cleanTitle.replace(/[:\-–—]+$/, "").trim();

        // Auto-detect subject if mentioned in line
        let detectedSubjectId = activeSubjectId;
        for (const sub of subjects) {
          const codeMatch = new RegExp(sub.code.replace("-", "[-\\s]?"), "i");
          const nameMatch = new RegExp(sub.name.substring(0, 8), "i");
          if (codeMatch.test(line) || nameMatch.test(line)) {
            detectedSubjectId = sub.id;
            break;
          }
        }

        // Auto-detect category based on keywords
        const lower = line.toLowerCase();
        let detectedCategory = "SLIDES";

        if (
          lower.includes("book") ||
          lower.includes("textbook") ||
          lower.includes("edition") ||
          lower.includes("author") ||
          lower.includes("stallings") ||
          lower.includes("tanenbaum")
        ) {
          detectedCategory = "BOOKS";
        } else if (
          lower.includes("handout") ||
          lower.includes("notes") ||
          lower.includes("reading") ||
          lower.includes("chapter") ||
          lower.includes("summary") ||
          lower.includes("outline") ||
          lower.includes("syllabus")
        ) {
          detectedCategory = "HANDOUTS";
        } else if (
          lower.includes("past paper") ||
          lower.includes("paper") ||
          lower.includes("midterm") ||
          lower.includes("final") ||
          lower.includes("quiz") ||
          lower.includes("exam")
        ) {
          detectedCategory = "PAST_PAPERS";
        } else if (
          lower.includes("assignment") ||
          lower.includes("lab") ||
          lower.includes("task") ||
          lower.includes("code") ||
          lower.includes("solution") ||
          lower.includes("project")
        ) {
          detectedCategory = "ASSIGNMENTS";
        } else if (
          lower.includes("slide") ||
          lower.includes("ppt") ||
          lower.includes("pptx") ||
          lower.includes("lecture") ||
          lower.includes("lec")
        ) {
          detectedCategory = "SLIDES";
        }

        if (!cleanTitle) {
          // Provide an intelligent default title if user only pasted a bare URL
          const catLabel = CATEGORY_CONFIG[detectedCategory]?.label || "Study Material";
          cleanTitle = `${catLabel} (Part ${drafts.length + 1})`;
        }

        drafts.push({
          id: `draft-${idx}-${urlIdx}`,
          subjectId: detectedSubjectId,
          title: cleanTitle,
          category: detectedCategory,
          linkOrPath: foundUrl,
          description: "",
        });
      });
    });

    setParsedDrafts(drafts);
  };

  // ----------------------------------------------------
  // Save All Auto-Organized Drafts in 1-Click
  // ----------------------------------------------------
  const handleConfirmBulkAdd = async () => {
    if (parsedDrafts.length === 0) return;
    setIsBulkSaving(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_ADD",
          subjectId: activeSubjectId,
          items: parsedDrafts.map((d) => ({
            subjectId: d.subjectId,
            title: d.title,
            category: d.category,
            linkOrPath: d.linkOrPath,
            description: d.description || null,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRawModal(false);
        setRawText("");
        setParsedDrafts([]);
        await fetchData(activeSubjectId);
      } else {
        alert(data.error || "Failed to organize materials");
      }
    } catch (err) {
      console.error("Bulk add error:", err);
      alert("Error organizing materials");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // ----------------------------------------------------
  // Save Single Material (Create or Update)
  // ----------------------------------------------------
  const handleSaveSingleMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle.trim() || !singleLink.trim()) return;

    try {
      if (editingMaterialId) {
        // PUT update
        const res = await fetch("/api/materials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingMaterialId,
            title: singleTitle,
            category: singleCategory,
            linkOrPath: singleLink,
            description: singleDesc,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          resetSingleForm();
          await fetchData(activeSubjectId);
        }
      } else {
        // POST create
        const res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_MATERIAL",
            subjectId: activeSubjectId,
            title: singleTitle,
            category: singleCategory,
            linkOrPath: singleLink,
            description: singleDesc,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          resetSingleForm();
          await fetchData(activeSubjectId);
        }
      }
    } catch (err) {
      console.error("Save material error:", err);
    }
  };

  const resetSingleForm = () => {
    setSingleTitle("");
    setSingleCategory("SLIDES");
    setSingleLink("");
    setSingleDesc("");
    setEditingMaterialId(null);
  };

  // Open Edit Modal for Single Material
  const handleStartEdit = (item: MaterialItem) => {
    setEditingMaterialId(item.id);
    setSingleTitle(item.title);
    setSingleCategory(item.category);
    setSingleLink(item.linkOrPath);
    setSingleDesc(item.description || "");
    setShowAddModal(true);
  };

  // Delete Single Material
  const handleDeleteMaterial = async (id: number) => {
    if (!confirm("Are you sure you want to delete this study material link?")) return;
    try {
      const res = await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchData(activeSubjectId);
      }
    } catch (err) {
      console.error("Delete material error:", err);
    }
  };

  // Copy Link to Clipboard
  const handleCopyLink = (id: number, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedLinkMap((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // ----------------------------------------------------
  // WhatsApp 1-Click Broadcast Generator
  // ----------------------------------------------------
  const handleOpenWhatsAppShare = (item: MaterialItem) => {
    const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.SLIDES;
    const text = `*📚 BSCS 7th (E2) — New Study Material Uploaded*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 *Course:* ${activeSubject?.code} - ${activeSubject?.name}
👨‍🏫 *Instructor:* ${activeSubject?.teacherName}
📑 *Title:* ${item.title}
📁 *Category:* ${catConfig.label}
${item.description ? `📝 *Notes:* ${item.description}\n` : ""}🔗 *Drive Link:* ${item.linkOrPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Please download and review prior to the next class._`;

    setWhatsAppText(text);
    setShowWhatsAppModal(true);
    setCopiedBroadcast(false);
  };

  // Filtered Materials based on Category and Search
  const filteredMaterials = materials.filter((m) => {
    const matchesCategory =
      selectedCategory === "ALL" || m.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.title.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q) ||
      m.linkOrPath.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* 1. Top Section: 6 Official Subject Tabs FIRST (100% Course Isolated) */}
      <div className="glass-card p-5 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[10px] font-black uppercase tracking-wider">
                Phase 5 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Drive Links & Material Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <FolderGit2 className="w-6 h-6 text-teal-400" />
              Course Materials & Study Hub
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              100% Subject-Isolated material repository with 1-Click Smart Auto-Organizer and instant WhatsApp broadcasts.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Smart Auto-Organizer Button */}
            <button
              onClick={() => {
                setShowRawModal(true);
                setRawText("");
                setParsedDrafts([]);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Paste raw text or links to auto-organize into subjects and categories"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>⚡ Smart Auto-Organizer</span>
            </button>

            {/* Manual Single Add */}
            <button
              onClick={() => {
                resetSingleForm();
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Link</span>
            </button>
          </div>
        </div>

        {/* 6 Subject Switcher Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {subjects.map((sub) => {
            const isSelected = sub.id === activeSubjectId;
            return (
              <button
                key={sub.id}
                onClick={() => handleSubjectChange(sub.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? "bg-gradient-to-br from-teal-500/25 via-indigo-600/20 to-slate-900 border-teal-400/80 shadow-xl shadow-teal-500/20 ring-1 ring-teal-400/50 scale-[1.02]"
                    : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`font-mono text-xs font-black px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-teal-400 text-black font-extrabold"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {sub.code}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      sub.totalMaterials > 0
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-400/30"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {sub.totalMaterials} {sub.totalMaterials === 1 ? "link" : "links"}
                  </span>
                </div>
                <div className="font-bold text-xs text-white truncate" title={sub.name}>
                  {sub.name}
                </div>
                <div className="text-[10px] text-slate-300 truncate mt-0.5 font-medium">
                  {sub.teacherName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Course Header & Master Google Drive Folder Pin Bar */}
      {activeSubject && (
        <div className="glass-card p-4 rounded-2xl border border-teal-500/30 bg-teal-950/15 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 text-teal-300 shadow-md">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-400/30">
                  {activeSubject.code}
                </span>
                <span className="font-black text-sm text-white truncate">
                  {activeSubject.name}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  • {activeSubject.creditHours} Credit Hours • {activeSubject.teacherName}
                </span>
              </div>

              {/* Master Drive Link Status */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <span className="text-teal-400 font-black">Official Drive Folder:</span>
                  {mainDriveLink ? (
                    <a
                      href={mainDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-300 hover:text-white underline truncate max-w-[280px] sm:max-w-md inline-block font-mono text-[10px]"
                    >
                      {mainDriveLink}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No master folder pinned yet</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Master Drive Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {mainDriveLink && (
              <>
                <a
                  href={mainDriveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Drive</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mainDriveLink);
                    alert("Master Drive link copied to clipboard!");
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
                  title="Copy Master Drive Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={() => {
                setMainDriveInput(mainDriveLink);
                setIsEditingMainDrive(!isEditingMainDrive);
              }}
              className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Edit2 className="w-3 h-3 text-slate-400" />
              <span>{mainDriveLink ? "Change Folder" : "Pin Master Drive Link"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Master Drive Edit Box */}
      {isEditingMainDrive && (
        <div className="glass-card p-4 rounded-2xl border border-teal-400/50 bg-teal-950/30 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-full flex-1">
            <label className="block text-[11px] font-black text-teal-300 uppercase tracking-wider mb-1">
              Google Drive / Cloud Folder Link for {activeSubject?.code}
            </label>
            <input
              type="url"
              value={mainDriveInput}
              onChange={(e) => setMainDriveInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-teal-400/40 text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-end">
            <button
              type="button"
              onClick={handleSaveMainDriveLink}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Folder</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingMainDrive(false)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Category Filter Tabs & Live Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCategory === "ALL"
                ? "bg-white text-slate-900 shadow-lg shadow-white/10 font-black scale-105"
                : "bg-black/35 hover:bg-white/10 text-slate-300 border border-white/10"
            }`}
          >
            <span>All Materials</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === "ALL" ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"
              }`}
            >
              {categoryCounts.total}
            </span>
          </button>

          {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
            const isCatActive = selectedCategory === catKey;
            const count = (categoryCounts as any)[catKey] || 0;
            const CatIcon = config.icon;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isCatActive
                    ? `${config.bg} ${config.color} border ${config.border} shadow-lg ${config.glow} scale-105 font-black`
                    : "bg-black/35 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono font-bold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slides, books, topics..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-indigo-400/60 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Materials Cards Grid */}
      {loading ? (
        <div className="glass-card p-12 rounded-3xl border border-white/10 text-center">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">Loading course materials...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-white/15 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-400/30 text-teal-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-white mb-1">
            {searchQuery
              ? "No materials match your search"
              : `No ${selectedCategory !== "ALL" ? CATEGORY_CONFIG[selectedCategory]?.label : "materials"} added yet for ${activeSubject?.code}`}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-medium">
            Paste raw WhatsApp messages, lecture slides links, reference books, or past papers. The Smart Auto-Organizer will sort them in 1 click!
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setShowRawModal(true);
                setRawText("");
                setParsedDrafts([]);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>⚡ Paste Raw Text to Auto-Organize</span>
            </button>
            <button
              onClick={() => {
                resetSingleForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              + Add Single Link
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredMaterials.map((item) => {
            const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.SLIDES;
            const CatIcon = cat.icon;
            const isCopied = copiedLinkMap[item.id] || false;

            return (
              <div
                key={item.id}
                className="glass-card p-4 rounded-2xl border border-white/10 hover:border-teal-400/40 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden bg-black/40 hover:bg-black/60"
              >
                <div>
                  {/* Card Header: Category Badge, Date, Edit/Delete */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${cat.bg} ${cat.color} border ${cat.border}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit details"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Delete material link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="font-black text-sm text-white line-clamp-2 leading-snug group-hover:text-teal-200 transition-colors mb-1.5">
                    {item.title}
                  </h4>

                  {/* Description / Lecture Notes */}
                  {item.description && (
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-2 bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                      {item.description}
                    </p>
                  )}

                  {/* Link Preview Box */}
                  <div className="p-2 rounded-xl bg-black/50 border border-white/5 flex items-center gap-1.5 text-[10px] text-slate-300 font-mono mb-3 truncate">
                    <LinkIcon className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="truncate">{item.linkOrPath}</span>
                  </div>
                </div>

                {/* Card Footer: 1-Click Open, Copy Link, WhatsApp Broadcast */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    {/* Open in Drive/Browser */}
                    <a
                      href={item.linkOrPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Link</span>
                    </a>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.id, item.linkOrPath)}
                      className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                        isCopied
                          ? "bg-emerald-500 text-black border-emerald-400"
                          : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10"
                      }`}
                      title="Copy link to clipboard"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 1-Click WhatsApp Share */}
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppShare(item)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
                    title="Generate WhatsApp Announcement Message"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Smart Raw Text Auto-Organizer (1-2 Clicks, Zero Typing)          */}
      {/* ========================================================================= */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-amber-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/20 via-indigo-600/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
                  <Sparkles className="w-5 h-5 fill-black" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    Smart Raw Text & Link Auto-Organizer
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Paste raw WhatsApp announcements, multi-links, or messy teacher notes. Auto-categorizes in 1-2 clicks!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRawModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-black text-amber-300 uppercase tracking-wider mb-1.5">
                  1. Paste Raw Text / Links Here:
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    parseRawText(e.target.value);
                  }}
                  placeholder={`Paste anything here! Examples:
• CS-601 Lecture 1 to 4 Cryptography Slides https://drive.google.com/file/d/123...
• https://drive.google.com/open?id=abc - Stallings 8th edition reference book
• Midterm Past Papers 2023-2025: https://drive.google.com/folder/...
• Handout Chapter 3 Notes https://mega.nz/...`}
                  className="w-full p-3 rounded-2xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono leading-relaxed"
                />
              </div>

              {/* Parsed Preview Matrix */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    2. Auto-Detected Materials ({parsedDrafts.length} detected):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Click any category pill to change in 1 click!
                  </span>
                </div>

                {parsedDrafts.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-xs text-slate-400 bg-white/[0.02]">
                    No links detected yet. Paste text containing one or more URLs above to see the interactive preview!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {parsedDrafts.map((draft, idx) => {
                      return (
                        <div
                          key={draft.id}
                          className="p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 min-w-0 space-y-1.5 w-full">
                            {/* Course Dropdown + Editable Title */}
                            <div className="flex items-center gap-2">
                              <select
                                value={draft.subjectId}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setParsedDrafts((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, subjectId: val } : d))
                                  );
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[10px] font-black focus:outline-none shrink-0"
                              >
                                {subjects.map((s) => (
                                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                                    {s.code}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedDrafts((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, title: val } : d))
                                  );
                                }}
                                placeholder="Material Title..."
                                className="flex-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            {/* 1-Click Category Pills */}
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                              {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => {
                                const isCurrent = draft.category === k;
                                return (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => {
                                      setParsedDrafts((prev) =>
                                        prev.map((d, i) => (i === idx ? { ...d, category: k } : d))
                                      );
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold transition-all shrink-0 ${
                                      isCurrent
                                        ? `${cfg.bg} ${cfg.color} border ${cfg.border} ring-1 ring-amber-400 font-black scale-105`
                                        : "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5"
                                    }`}
                                  >
                                    {cfg.label.split(" ")[0]}
                                  </button>
                                );
                              })}
                            </div>

                            {/* URL Snippet */}
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 truncate">
                              <ExternalLink className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                              <span className="truncate">{draft.linkOrPath}</span>
                            </div>
                          </div>

                          {/* Delete Item from Drafts */}
                          <button
                            type="button"
                            onClick={() => {
                              setParsedDrafts((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
                            title="Remove this item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-xs text-slate-400 font-medium">
                {parsedDrafts.length > 0
                  ? `Ready to organize ${parsedDrafts.length} materials into subjects`
                  : "Paste text above to begin"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRawModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={parsedDrafts.length === 0 || isBulkSaving}
                  onClick={handleConfirmBulkAdd}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 disabled:opacity-30 disabled:pointer-events-none transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>
                    {isBulkSaving
                      ? "Organizing..."
                      : `✨ Confirm & Organize All (${parsedDrafts.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Add or Edit Single Material                                      */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-indigo-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 to-transparent">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-indigo-400" />
                {editingMaterialId ? "Edit Study Material" : "Add Study Material Link"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetSingleForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleMaterial} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Target Course
                </label>
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 font-bold text-xs text-teal-300">
                  {activeSubject?.code} - {activeSubject?.name}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => {
                    const isSel = singleCategory === k;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSingleCategory(k)}
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

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  placeholder="e.g. Lectures 1 to 5 Cryptography Slides"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Google Drive / Web URL *
                </label>
                <input
                  type="url"
                  required
                  value={singleLink}
                  onChange={(e) => setSingleLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Lecture Topics (Optional)
                </label>
                <input
                  type="text"
                  value={singleDesc}
                  onChange={(e) => setSingleDesc(e.target.value)}
                  placeholder="e.g. Covers Symmetric Encryption and DES Algorithm"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetSingleForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingMaterialId ? "Save Changes" : "Add Material"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 1-Click WhatsApp Announcement Generator                         */}
      {/* ========================================================================= */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/20 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    1-Click WhatsApp Announcement
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Ready to paste directly into BSCS 7th (E2) WhatsApp group!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="relative">
                <textarea
                  rows={9}
                  readOnly
                  value={whatsAppText}
                  className="w-full p-3.5 rounded-2xl bg-black/70 border border-emerald-400/30 text-white font-mono text-xs focus:outline-none select-all leading-relaxed shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Click below to copy the formatted text
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsAppText);
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
                        <span>Copy Announcement</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
