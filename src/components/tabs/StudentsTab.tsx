"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Upload,
  UserPlus,
  Copy,
  Check,
  Edit2,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  X,
  Sparkles,
  AlertCircle,
  FileText,
} from "lucide-react";

interface Student {
  id: number;
  rollNo: string;
  name: string;
  section: string | null;
  createdAt: string;
}

export function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [sectionName, setSectionName] = useState<string>("BSCS 7th E2");
  const [isEditingSection, setIsEditingSection] = useState<boolean>(false);
  const [newSectionInput, setNewSectionInput] = useState<string>("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({ rollNo: "", name: "" });

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [pasteData, setPasteData] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");

  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSection = localStorage.getItem("cr_section_name");
    if (savedSection) setSectionName(savedSection);
    fetchStudents();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStudents();
    }, 200);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Section Name Change
  const handleSaveSection = () => {
    if (newSectionInput.trim()) {
      setSectionName(newSectionInput.trim());
      localStorage.setItem("cr_section_name", newSectionInput.trim());
      setIsEditingSection(false);
    }
  };

  // Add / Edit Student Submit
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.rollNo.trim() || !studentForm.name.trim()) return;

    try {
      const isEdit = !!editingStudent;
      const url = "/api/students";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? { id: editingStudent.id, rollNo: studentForm.rollNo, name: studentForm.name, section: sectionName }
        : { rollNo: studentForm.rollNo, name: studentForm.name, section: sectionName };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setEditingStudent(null);
        setStudentForm({ rollNo: "", name: "" });
        await fetchStudents();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving student");
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: number, name: string, roll: string) => {
    if (!confirm(`Are you sure you want to remove ${name} (${roll}) from the roster?`)) return;

    try {
      const res = await fetch(`/api/students?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchStudents();
      } else {
        alert(data.error || "Delete failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import Submit (File or Paste)
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setImportError("");

    try {
      if (importFile) {
        const formData = new FormData();
        formData.append("file", importFile);
        formData.append("section", sectionName);

        const res = await fetch("/api/students/import", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          setShowImportModal(false);
          setImportFile(null);
          await fetchStudents();
        } else {
          setImportError(data.error || "Failed to parse file.");
        }
      } else if (pasteData.trim()) {
        // Parse pasted lines
        const lines = pasteData.trim().split("\n");
        const parsedList: { rollNo: string; name: string }[] = [];

        for (const line of lines) {
          const parts = line.split(/[\t,;]+/).map((p) => p.trim());
          if (parts.length >= 2) {
            let roll = parts[0];
            let nm = parts.slice(1).join(" ");
            // If roll looks like number only and name is first, check
            if (!roll.toLowerCase().includes("ag-") && parts[1].toLowerCase().includes("ag-")) {
              roll = parts[1];
              nm = parts[0];
            }
            parsedList.push({ rollNo: roll, name: nm });
          }
        }

        if (parsedList.length === 0) {
          setImportError("Could not recognize valid rows. Please check paste format.");
          setIsImporting(false);
          return;
        }

        const res = await fetch("/api/students/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: parsedList, section: sectionName }),
        });
        const data = await res.json();

        if (data.success) {
          setShowImportModal(false);
          setPasteData("");
          await fetchStudents();
        } else {
          setImportError(data.error || "Import failed.");
        }
      } else {
        setImportError("Please select a file or paste student rows.");
      }
    } catch (err: any) {
      setImportError(err?.message || "Import error");
    } finally {
      setIsImporting(false);
    }
  };

  // Copy for WhatsApp
  const handleCopyWhatsApp = () => {
    if (students.length === 0) return;
    const header = `📋 *${sectionName} - Official Student Roster*\nTotal Enrolled: ${students.length}\n-----------------------------------\n`;
    const list = students
      .map((s, idx) => `${idx + 1}. *${s.rollNo}* - ${s.name}`)
      .join("\n");
    const fullText = header + list;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper avatar initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (roll: string) => {
    const gradients = [
      "from-sky-500 to-blue-600 text-white",
      "from-purple-500 to-indigo-600 text-white",
      "from-emerald-500 to-teal-600 text-white",
      "from-amber-500 to-orange-600 text-white",
      "from-fuchsia-500 to-rose-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < roll.length; i++) hash = roll.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Section Control */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-sky-400/30 relative overflow-hidden bg-gradient-to-r from-sky-950/35 via-indigo-950/30 to-blue-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/20 via-indigo-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-700 dark:text-sky-200 text-xs font-black shadow-sm">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Phase 1 Active
              </span>

              {/* Editable Section Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-sm">
                <span>Section: {sectionName}</span>
                <button
                  onClick={() => {
                    setNewSectionInput(sectionName);
                    setIsEditingSection(true);
                  }}
                  className="p-0.5 hover:text-amber-300 transition-colors"
                  title="Click to rename section"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-950 dark:text-white">
              Student Master Roster
            </h2>
            <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-100 max-w-2xl font-semibold">
              Manage your entire class roster with Ag Numbers and Names. Direct Excel/CSV imports,
              single-student edits, instant search, and 1-click WhatsApp export.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setImportError("");
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingStudent(null);
                setStudentForm({ rollNo: "", name: "" });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              disabled={students.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-800 dark:text-sky-200 hover:text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Copy formatted list for WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
              <span>{copied ? "Copied!" : "WhatsApp List"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roster Controls: Search & Stats */}
      <div className="glass-card rounded-2xl p-4 border border-sky-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Ag Number or Student Name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-semibold placeholder:text-indigo-400/60 focus:ring-2 focus:ring-sky-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sky-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Counter and Refresh */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-xs font-extrabold text-sky-800 dark:text-sky-200">
            <span>Enrolled Students:</span>
            <span className="font-mono text-indigo-950 dark:text-white text-sm font-black">
              {students.length}
            </span>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-2.5 rounded-xl glass-button text-sky-800 dark:text-sky-200 hover:text-sky-500 dark:hover:text-white transition-all"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Student List Table */}
      <div className="glass-panel rounded-2xl border border-sky-400/30 overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 text-center text-xs text-sky-700 dark:text-sky-300 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
            Loading class roster from SQLite...
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center text-xs text-indigo-800 dark:text-indigo-200 space-y-3">
            <Users className="w-10 h-10 mx-auto text-sky-400/50" />
            <p className="text-sm font-bold text-indigo-950 dark:text-white">
              {search ? "No students matching your search" : "No students in the roster yet"}
            </p>
            <p className="text-xs text-sky-700 dark:text-sky-300 max-w-sm mx-auto">
              Click &quot;Import Excel / CSV&quot; above to import your section file, or click &quot;Add Student&quot; to insert individually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sky-500/20 bg-sky-950/20 text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">
                  <th className="py-3.5 px-4 w-16"># Sr</th>
                  <th className="py-3.5 px-4 w-48">Ag Number (Reg No)</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4 w-36">Section</th>
                  <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-500/15 text-xs font-semibold">
                {students.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="hover:bg-sky-500/10 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-3 px-4 font-mono text-sky-700 dark:text-sky-300 font-bold">
                      {idx + 1}
                    </td>

                    {/* Ag Number */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-800 dark:text-sky-200 font-mono font-bold">
                        {student.rollNo}
                      </span>
                    </td>

                    {/* Name with Initials Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getAvatarGradient(
                            student.rollNo
                          )} flex items-center justify-center text-[10px] font-black shadow-sm shrink-0`}
                        >
                          {getInitials(student.name)}
                        </div>
                        <span className="font-extrabold text-indigo-950 dark:text-white tracking-wide">
                          {student.name}
                        </span>
                      </div>
                    </td>

                    {/* Section */}
                    <td className="py-3 px-4 text-sky-700 dark:text-sky-300 font-bold">
                      {student.section || sectionName}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingStudent(student);
                            setStudentForm({ rollNo: student.rollNo, name: student.name });
                            setShowAddModal(true);
                          }}
                          className="p-1.5 rounded-lg glass-button text-sky-700 dark:text-sky-300 hover:text-white hover:bg-sky-500/30 transition-all"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteStudent(student.id, student.name, student.rollNo)
                          }
                          className="p-1.5 rounded-lg glass-button text-rose-500 hover:text-white hover:bg-rose-500/30 transition-all"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Section Name */}
      {isEditingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 border border-sky-400/40 max-w-md w-full space-y-4 shadow-glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                Customize Section Name
              </h3>
              <button
                onClick={() => setIsEditingSection(false)}
                className="text-xs text-sky-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-indigo-800 dark:text-indigo-200">
              You have full control. Change your section or semester title anytime without affecting existing records:
            </p>
            <input
              type="text"
              value={newSectionInput}
              onChange={(e) => setNewSectionInput(e.target.value)}
              placeholder="e.g. BSCS 7th E2, CS-7A, 8th Semester..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsEditingSection(false)}
                className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-sky-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md"
              >
                Save Section Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Single Student */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 border border-sky-400/40 max-w-md w-full space-y-4 shadow-glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                {editingStudent ? "Edit Student Details" : "Add Student to Roster"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-sky-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sky-600 dark:text-sky-300">
                  Ag Number / Registration No *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.rollNo}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, rollNo: e.target.value })
                  }
                  placeholder="e.g. 2023-ag-10030"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sky-600 dark:text-sky-300">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  placeholder="e.g. Muhammad Ali"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-sky-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-extrabold shadow-md"
                >
                  {editingStudent ? "Update Student" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Import (Excel / CSV / Paste) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-6 border border-emerald-400/40 max-w-lg w-full space-y-4 shadow-glass max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-indigo-950 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Import Class List (Excel / CSV)
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-xs text-emerald-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-indigo-800 dark:text-indigo-200 font-medium">
              Upload your official UAF section list Excel file (e.g. <code>evening e2 list.xlsx</code>)
              or copy & paste columns directly.
            </p>

            {importError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              {/* Option A: File Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  Option A: Choose Excel (.xlsx, .xls) or CSV File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 text-center cursor-pointer transition-all hover:bg-emerald-950/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                        setPasteData("");
                      }
                    }}
                  />
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-emerald-300">
                    {importFile ? importFile.name : "Click to select or drag & drop Excel / CSV"}
                  </p>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Auto-detects Ag Numbers and Names
                  </p>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-emerald-500/20"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-emerald-400 uppercase">
                  Or Paste Text
                </span>
                <div className="flex-grow border-t border-emerald-500/20"></div>
              </div>

              {/* Option B: Direct Copy-Paste */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  Option B: Copy from Excel and Paste Here
                </label>
                <textarea
                  rows={4}
                  value={pasteData}
                  onChange={(e) => {
                    setPasteData(e.target.value);
                    if (e.target.value) setImportFile(null);
                  }}
                  placeholder="2023-ag-10030    ABDULLAH&#10;2023-ag-10031    ABDULLAH&#10;2023-ag-10033    AHMAD FIAZ"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-bold text-emerald-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || (!importFile && !pasteData.trim())}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isImporting ? "Importing Roster..." : "Import Students"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
