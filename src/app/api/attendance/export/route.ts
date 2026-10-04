import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

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

    const sessions = await prisma.attendanceSession.findMany({
      where: { subjectId },
      include: { records: true },
      orderBy: { date: "asc" },
    });

    const students = await prisma.student.findMany({
      orderBy: { id: "asc" },
    });

    // Build Excel Matrix
    const headerRows = [
      ["UNIVERSITY OF AGRICULTURE, FAISALABAD"],
      ["DEPARTMENT OF COMPUTER SCIENCE - BSCS 7th E2"],
      [`SUBJECT: ${subject.code} - ${subject.name}`],
      [`TEACHER: ${subject.teacher?.name || "Faculty Incharge"} | CREDIT HOURS: ${subject.creditHours}`],
      [], // Blank row
    ];

    // Column Headers
    const tableHeader = [
      "Sr. No.",
      "Reg. No.",
      "Student Name",
      ...sessions.map((s) => s.date),
      "Attended",
      "Total",
      "Percentage (%)",
      "75% Exam Status",
    ];

    const dataRows = students.map((stud, idx) => {
      let presentCount = 0;

      const sessionAttendance = sessions.map((sess) => {
        const rec = sess.records.find((r) => r.studentId === stud.id);
        if (rec && rec.status === "PRESENT") {
          presentCount += 1;
          return "P";
        } else {
          return "A";
        }
      });

      const totalCount = sessions.length;
      const pct = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 100.0;
      const statusText = pct >= 75.0 ? "CLEARED" : "SHORT ATTENDANCE";

      return [
        idx + 1,
        stud.rollNo,
        stud.name,
        ...sessionAttendance,
        presentCount,
        totalCount,
        `${pct}%`,
        statusText,
      ];
    });

    const fullSheetData = [...headerRows, tableHeader, ...dataRows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    // Auto column widths
    const colWidths = [
      { wch: 8 },
      { wch: 16 },
      { wch: 28 },
      ...sessions.map(() => ({ wch: 12 })),
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Attendance Ledger");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${subject.code}_Attendance_Ledger.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Attendance Export error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export attendance" },
      { status: 500 }
    );
  }
}
