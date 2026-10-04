import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

interface ParsedSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  room: string;
  teacherName: string;
  type: string;
  rawTimeRange: string;
}

const DAY_MAP: Record<string, string> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
};

// Teacher dictionary for standard UAF 7th semester courses to auto-fill if not in cell
const KNOWN_TEACHERS: Record<string, string> = {
  "IT-601-P": "Miss Amina Amir",
  "IT-601-T": "Miss Amina Amir",
  "CS-605-P": "Miss Faiza",
  "CS-605-T": "Miss Faiza",
  "CS-603-P": "Ms. Anum Khalid",
  "BBA-603": "Pending",
  "CS-601-T": "Ms. Kainat Amjad",
  "ARE-508": "Sir Hassan Zulfiqar",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sectionQuery = (formData.get("sectionQuery") as string) || "BS(CS)-7th-E2";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Please upload an Excel timetable file." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName =
      workbook.SheetNames.find((s) => s.toLowerCase().includes("time") || s.toLowerCase().includes("winter")) ||
      workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Locate header row containing time slots
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r];
      if (Array.isArray(row) && row.some((c) => String(c || "").includes("8:00") || String(c || "").includes("2:00"))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return NextResponse.json(
        { success: false, error: "Could not find time slot header row in the uploaded timetable sheet." },
        { status: 400 }
      );
    }

    const headerRow = rawData[headerRowIdx];
    const timeSlotsByCol: Record<number, string> = {};

    for (let c = 2; c < headerRow.length; c++) {
      const val = String(headerRow[c] || "").trim();
      if (val && val.toLowerCase() !== "break") {
        timeSlotsByCol[c] = val;
      }
    }

    // Collect individual periods matching query
    interface PeriodMatch {
      day: string;
      room: string;
      col: number;
      timeStr: string;
      subjectName: string;
      teacherName: string;
      type: string;
    }

    const periodMatches: PeriodMatch[] = [];
    let currentDay = "Monday";

    // Clean query (e.g. "BS(CS)-7th-E2", or "E2")
    const cleanQuery = sectionQuery.toLowerCase().replace(/[\s-]/g, "");

    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.length < 2) continue;

      const dayCell = String(row[0] || "").trim().toLowerCase();
      if (dayCell && DAY_MAP[dayCell]) {
        currentDay = DAY_MAP[dayCell];
      }

      const roomCell = String(row[1] || "").trim();

      for (let c = 2; c < row.length; c++) {
        const cellText = String(row[c] || "").trim();
        if (!cellText) continue;

        const normalizedCell = cellText.toLowerCase().replace(/[\s-]/g, "");
        if (
          normalizedCell.includes(cleanQuery) ||
          normalizedCell.includes("bs(cs)7the2") ||
          normalizedCell.includes("bscs7the2")
        ) {
          // Extract subject code
          const lines = cellText.split("\n").map((l) => l.trim());
          const subjectCode = lines[0].replace(/\(.*?\)/g, "").trim();

          // Extract teacher if present
          let teacher = KNOWN_TEACHERS[subjectCode] || "Pending";
          for (let l = 1; l < lines.length; l++) {
            const line = lines[l];
            if (
              !line.toLowerCase().includes("bs") &&
              !line.toLowerCase().includes("section") &&
              !line.toLowerCase().includes("7th") &&
              line.length > 3
            ) {
              teacher = line;
              break;
            }
          }

          const isLab = subjectCode.endsWith("-P") || roomCell.toLowerCase().includes("lab");

          periodMatches.push({
            day: currentDay,
            room: roomCell,
            col: c,
            timeStr: timeSlotsByCol[c] || `Col ${c}`,
            subjectName: subjectCode,
            teacherName: teacher,
            type: isLab ? "LAB" : "LECTURE",
          });
        }
      }
    }

    // Sort periods by day and col
    periodMatches.sort((a, b) => {
      if (a.day !== b.day) return a.day.localeCompare(b.day);
      return a.col - b.col;
    });

    // Merge consecutive periods into single unified block (e.g. 2:00-2:50 + 2:50-3:40 -> 2:00 - 3:40)
    const mergedSlots: ParsedSlot[] = [];

    for (let i = 0; i < periodMatches.length; i++) {
      const curr = periodMatches[i];
      let endCol = curr.col;
      let j = i + 1;

      while (
        j < periodMatches.length &&
        periodMatches[j].day === curr.day &&
        periodMatches[j].subjectName === curr.subjectName &&
        periodMatches[j].room === curr.room &&
        periodMatches[j].col === endCol + 1
      ) {
        endCol = periodMatches[j].col;
        j++;
      }

      // Determine start and end time
      const startTimePart = (timeSlotsByCol[curr.col] || "2:00-2:50").split("-")[0].trim();
      const endTimePart = (timeSlotsByCol[endCol] || "2:50-3:40").split("-")[1].trim();

      mergedSlots.push({
        dayOfWeek: curr.day,
        startTime: startTimePart,
        endTime: endTimePart,
        subjectName: curr.subjectName,
        room: curr.room,
        teacherName: curr.teacherName,
        type: curr.type,
        rawTimeRange: `${startTimePart} – ${endTimePart}`,
      });

      i = j - 1; // Advance outer loop past merged group
    }

    // Now compare with active database schedule
    const currentSlots = await prisma.timetableSlot.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Build Diff Collections
    const unchanged: { current: any; incoming: ParsedSlot }[] = [];
    const changed: {
      current: any;
      incoming: ParsedSlot;
      changeType: "ROOM_CHANGE" | "TIME_CHANGE" | "BOTH";
      details: string;
    }[] = [];
    const added: ParsedSlot[] = [];
    const matchedCurrentIds = new Set<number>();

    for (const inc of mergedSlots) {
      // Find matching current slot by subject and day
      const matchExact = currentSlots.find(
        (cs) =>
          !matchedCurrentIds.has(cs.id) &&
          cs.dayOfWeek.toLowerCase() === inc.dayOfWeek.toLowerCase() &&
          cs.subjectName?.toLowerCase() === inc.subjectName.toLowerCase() &&
          cs.room.toLowerCase().replace(/[\s#\-]/g, "") === inc.room.toLowerCase().replace(/[\s#\-]/g, "")
      );

      if (matchExact) {
        matchedCurrentIds.add(matchExact.id);
        unchanged.push({ current: matchExact, incoming: inc });
        continue;
      }

      // Check if same subject on same day with room or time change
      const matchSameDay = currentSlots.find(
        (cs) =>
          !matchedCurrentIds.has(cs.id) &&
          cs.dayOfWeek.toLowerCase() === inc.dayOfWeek.toLowerCase() &&
          cs.subjectName?.toLowerCase() === inc.subjectName.toLowerCase()
      );

      if (matchSameDay) {
        matchedCurrentIds.add(matchSameDay.id);
        const roomChanged =
          matchSameDay.room.toLowerCase().replace(/[\s#\-]/g, "") !== inc.room.toLowerCase().replace(/[\s#\-]/g, "");
        const timeChanged =
          matchSameDay.startTime !== inc.startTime || matchSameDay.endTime !== inc.endTime;

        let changeType: "ROOM_CHANGE" | "TIME_CHANGE" | "BOTH" = "ROOM_CHANGE";
        let details = "";
        if (roomChanged && timeChanged) {
          changeType = "BOTH";
          details = `Room: ${matchSameDay.room} ➔ ${inc.room} | Time: ${matchSameDay.startTime}-${matchSameDay.endTime} ➔ ${inc.startTime}-${inc.endTime}`;
        } else if (roomChanged) {
          changeType = "ROOM_CHANGE";
          details = `Room: ${matchSameDay.room} ➔ ${inc.room}`;
        } else {
          changeType = "TIME_CHANGE";
          details = `Time: ${matchSameDay.startTime}-${matchSameDay.endTime} ➔ ${inc.startTime}-${inc.endTime}`;
        }

        changed.push({
          current: matchSameDay,
          incoming: inc,
          changeType,
          details,
        });
        continue;
      }

      // Check if same subject on DIFFERENT day
      const matchDiffDay = currentSlots.find(
        (cs) =>
          !matchedCurrentIds.has(cs.id) &&
          cs.subjectName?.toLowerCase() === inc.subjectName.toLowerCase()
      );

      if (matchDiffDay) {
        matchedCurrentIds.add(matchDiffDay.id);
        changed.push({
          current: matchDiffDay,
          incoming: inc,
          changeType: "TIME_CHANGE",
          details: `Day Shift: ${matchDiffDay.dayOfWeek} (${matchDiffDay.startTime}) ➔ ${inc.dayOfWeek} (${inc.startTime}) | Room: ${matchDiffDay.room} ➔ ${inc.room}`,
        });
        continue;
      }

      // Otherwise, newly added slot
      added.push(inc);
    }

    // Any current slot not matched is considered removed / dropped
    const removed = currentSlots.filter((cs) => !matchedCurrentIds.has(cs.id));

    return NextResponse.json({
      success: true,
      diff: {
        unchanged,
        changed,
        added,
        removed,
        totalIncoming: mergedSlots.length,
        totalCurrent: currentSlots.length,
      },
      incomingSlots: mergedSlots,
    });
  } catch (error: any) {
    console.error("POST /api/timetable/diff error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to analyze timetable diff" },
      { status: 500 }
    );
  }
}
