import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");

    if (!subjectIdParam) {
      return NextResponse.json({ success: false, error: "subjectId is required" }, { status: 400 });
    }

    const subjectId = parseInt(subjectIdParam, 10);
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { teacher: true },
    });

    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    const groups = await prisma.studentGroup.findMany({
      where: { subjectId },
      include: {
        members: {
          include: { student: true },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { groupNumber: "asc" },
    });

    const allStudents = await prisma.student.findMany({
      orderBy: { id: "asc" },
    });

    const assignedIds = new Set<number>();
    groups.forEach((g) => g.members.forEach((m) => assignedIds.add(m.studentId)));
    const unassignedStudents = allStudents.filter((st) => !assignedIds.has(st.id));

    // Build Excel Matrix
    const headerRows = [
      ["UNIVERSITY OF AGRICULTURE, FAISALABAD"],
      ["DEPARTMENT OF COMPUTER SCIENCE — SECTION: BSCS 7th E2 (EVENING)"],
      [`COURSE: ${subject.code} — ${subject.name}`],
      [`TEACHER: ${subject.teacher?.name || "Faculty Incharge"} | CREDIT HOURS: ${subject.creditHours}`],
      [`TOTAL GROUPS: ${groups.length} | ASSIGNED STUDENTS: ${assignedIds.size} / ${allStudents.length}`],
      [], // Blank row
    ];

    // Column Headers
    const tableHeader = [
      "Sr. No.",
      "Group #",
      "Group Name",
      "Student Name",
      "Registration No. (Ag)",
      "Assigned Topic / Project Title",
      "Group Members Count",
    ];

    const dataRows: any[] = [];
    let srCounter = 1;

    groups.forEach((grp) => {
      if (grp.members.length === 0) {
        dataRows.push([
          srCounter++,
          grp.groupNumber,
          grp.groupName,
          "(No members yet)",
          "-",
          grp.topic || "Pending Assignment",
          0,
        ]);
      } else {
        grp.members.forEach((mem) => {
          dataRows.push([
            srCounter++,
            grp.groupNumber,
            grp.groupName,
            mem.student.name,
            mem.student.rollNo,
            grp.topic || "Pending Assignment",
            grp.members.length,
          ]);
        });
      }
    });

    // If there are unassigned students, append an unassigned section
    if (unassignedStudents.length > 0) {
      dataRows.push([]);
      dataRows.push(["UNASSIGNED STUDENTS (NOT YET IN ANY GROUP):"]);
      unassignedStudents.forEach((st) => {
        dataRows.push([
          srCounter++,
          "-",
          "UNASSIGNED",
          st.name,
          st.rollNo,
          "No topic assigned",
          "-",
        ]);
      });
    }

    const wsData = [...headerRows, tableHeader, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column Widths
    ws["!cols"] = [
      { wch: 8 },  // Sr. No.
      { wch: 10 }, // Group #
      { wch: 18 }, // Group Name
      { wch: 30 }, // Student Name
      { wch: 22 }, // Reg No.
      { wch: 45 }, // Topic
      { wch: 20 }, // Count
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups Register");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    const cleanSubjectCode = subject.code.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${cleanSubjectCode}_Groups_Register.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Groups export error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate groups export" },
      { status: 500 }
    );
  }
}
