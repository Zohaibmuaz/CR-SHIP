import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");
    const studentIdParam = searchParams.get("studentId");
    const sessionIdParam = searchParams.get("sessionId");

    // 0. If sessionId is passed, return full session details with all student records for editing
    if (sessionIdParam) {
      const sessionId = parseInt(sessionIdParam, 10);
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          subject: true,
          records: {
            include: { student: true },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }

      const allStudents = await prisma.student.findMany({
        orderBy: { id: "asc" },
      });

      const midPoint = Math.ceil(allStudents.length / 2);

      const records = allStudents.map((stud, idx) => {
        const existing = session.records.find((r) => r.studentId === stud.id);
        return {
          studentId: stud.id,
          regNo: stud.rollNo,
          name: stud.name,
          pageNumber: idx < midPoint ? 1 : 2,
          status: existing ? existing.status : "PRESENT",
          confidence: 1.0,
        };
      });

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          subjectId: session.subjectId,
          subjectCode: session.subject.code,
          subjectName: session.subject.name,
          date: session.date,
          slotTime: session.slotTime,
          presentCount: session.presentCount,
          absentCount: session.absentCount,
          records,
        },
      });
    }

    // 1. Fetch all 6 official subjects
    const subjects = await prisma.subject.findMany({
      include: {
        teacher: true,
        attendanceSessions: {
          include: {
            records: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    // Compute subject-level stats
    const subjectsWithStats = subjects.map((sub) => {
      const totalSessions = sub.attendanceSessions.length;
      let totalPresents = 0;
      let totalRecords = 0;

      sub.attendanceSessions.forEach((s) => {
        totalPresents += s.presentCount;
        totalRecords += s.totalStudents;
      });

      const averagePercentage =
        totalRecords > 0 ? Number(((totalPresents / totalRecords) * 100).toFixed(1)) : 100.0;

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        creditHours: sub.creditHours,
        teacherName: sub.teacher?.name || "Pending Faculty",
        totalSessions,
        averagePercentage,
      };
    });

    // 2. If studentId is passed, return full individual dossier
    if (studentIdParam) {
      const studentId = parseInt(studentIdParam, 10);
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
      }

      // Get all attendance records for this student across all subjects
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId },
        include: {
          session: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: { session: { date: "desc" } },
      });

      // Subject-wise breakdown for this student
      const subjectBreakdowns: Record<string, { present: number; total: number }> = {};
      subjects.forEach((s) => {
        subjectBreakdowns[s.code] = { present: 0, total: 0 };
      });

      records.forEach((r) => {
        const code = r.session.subject.code;
        if (!subjectBreakdowns[code]) {
          subjectBreakdowns[code] = { present: 0, total: 0 };
        }
        subjectBreakdowns[code].total += 1;
        if (r.status === "PRESENT") {
          subjectBreakdowns[code].present += 1;
        }
      });

      const studentSubjects = Object.entries(subjectBreakdowns).map(([code, stats]) => {
        const pct = stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 100.0;
        const classesNeeded =
          pct < 75.0 ? Math.max(0, Math.ceil(3 * stats.total - 4 * stats.present)) : 0;

        return {
          code,
          present: stats.present,
          total: stats.total,
          percentage: pct,
          isCleared: pct >= 75.0,
          classesNeeded,
        };
      });

      return NextResponse.json({
        success: true,
        student,
        subjectBreakdowns: studentSubjects,
        history: records.map((r) => ({
          recordId: r.id,
          sessionId: r.sessionId,
          date: r.session.date,
          slotTime: r.session.slotTime,
          subjectCode: r.session.subject.code,
          subjectName: r.session.subject.name,
          status: r.status,
        })),
      });
    }

    // 3. For a specific subject (or default to the first subject)
    const selectedSubjectId = subjectIdParam
      ? parseInt(subjectIdParam, 10)
      : subjects[0]?.id || 1;

    const allStudents = await prisma.student.findMany({
      orderBy: { id: "asc" },
    });

    const sessions = await prisma.attendanceSession.findMany({
      where: { subjectId: selectedSubjectId },
      include: {
        records: true,
      },
      orderBy: { date: "desc" },
    });

    // Compute student attendance stats for the selected subject
    const studentsLedger = allStudents.map((stud) => {
      let presentCount = 0;
      let totalCount = sessions.length;

      sessions.forEach((sess) => {
        const rec = sess.records.find((r) => r.studentId === stud.id);
        if (rec && rec.status === "PRESENT") {
          presentCount += 1;
        }
      });

      const percentage =
        totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 100.0;
      const isCleared = percentage >= 75.0;
      const shortfallClassesNeeded =
        !isCleared ? Math.max(0, Math.ceil(3 * totalCount - 4 * presentCount)) : 0;

      return {
        id: stud.id,
        regNo: stud.rollNo,
        name: stud.name,
        presentCount,
        totalCount,
        percentage,
        isCleared,
        shortfallClassesNeeded,
      };
    });

    // Safe vs Short counts for selected subject
    const safeCount = studentsLedger.filter((s) => s.isCleared).length;
    const shortCount = studentsLedger.filter((s) => !s.isCleared).length;

    return NextResponse.json({
      success: true,
      subjects: subjectsWithStats,
      selectedSubjectId,
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        slotTime: s.slotTime,
        totalStudents: s.totalStudents,
        presentCount: s.presentCount,
        absentCount: s.absentCount,
      })),
      students: studentsLedger,
      stats: {
        totalSessions: sessions.length,
        totalStudents: allStudents.length,
        safeCount,
        shortCount,
      },
    });
  } catch (error: any) {
    console.error("Attendance GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subjectId, date, slotTime, records } = body;

    if (!subjectId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "subjectId, date, and records array are required" },
        { status: 400 }
      );
    }

    const presentCount = records.filter((r: any) => r.status === "PRESENT").length;
    const absentCount = records.length - presentCount;

    // Fetch subject for logging
    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId, 10) },
    });

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Session
      const session = await tx.attendanceSession.create({
        data: {
          subjectId: parseInt(subjectId, 10),
          date,
          slotTime: slotTime || "Evening Slot",
          totalStudents: records.length,
          presentCount,
          absentCount,
          customFields: JSON.stringify({ markedVia: "2-Page Signature OCR / Quick Toggle" }),
        },
      });

      // 2. Create Records
      const recordData = records.map((r: any) => ({
        sessionId: session.id,
        studentId: parseInt(r.studentId, 10),
        status: r.status === "PRESENT" ? "PRESENT" : "ABSENT",
        verified: true,
      }));

      await tx.attendanceRecord.createMany({
        data: recordData,
      });

      // 3. Permanent Audit Log
      await tx.auditLog.create({
        data: {
          module: "ATTENDANCE",
          action: "ATTENDANCE_SESSION_CREATED",
          summary: `Marked attendance for ${subject?.code || "Subject"} on ${date}: ${presentCount} Present, ${absentCount} Absent.`,
          payload: JSON.stringify({
            sessionId: session.id,
            subjectCode: subject?.code,
            date,
            presentCount,
            absentCount,
            totalStudents: records.length,
          }),
        },
      });

      return session;
    });

    return NextResponse.json({
      success: true,
      session: result,
      message: "Attendance session recorded successfully",
    });
  } catch (error: any) {
    console.error("Attendance POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save attendance session" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, date, slotTime, records } = body;

    if (!sessionId || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "sessionId and records are required" },
        { status: 400 }
      );
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: parseInt(sessionId, 10) },
      include: { subject: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const presentCount = records.filter((r: any) => r.status === "PRESENT").length;
    const absentCount = records.length - presentCount;

    await prisma.$transaction(async (tx) => {
      // 1. Update Session
      await tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          date: date || session.date,
          slotTime: slotTime !== undefined ? slotTime : session.slotTime,
          totalStudents: records.length,
          presentCount,
          absentCount,
        },
      });

      // 2. Delete existing records and re-create updated records
      await tx.attendanceRecord.deleteMany({
        where: { sessionId: session.id },
      });

      const recordData = records.map((r: any) => ({
        sessionId: session.id,
        studentId: parseInt(r.studentId, 10),
        status: r.status === "PRESENT" ? "PRESENT" : "ABSENT",
        verified: true,
      }));

      await tx.attendanceRecord.createMany({
        data: recordData,
      });

      // 3. Permanent Audit Log
      await tx.auditLog.create({
        data: {
          module: "ATTENDANCE",
          action: "ATTENDANCE_SESSION_UPDATED",
          summary: `Updated attendance for ${session.subject.code} on ${date || session.date}: ${presentCount} P, ${absentCount} A.`,
          payload: JSON.stringify({
            sessionId: session.id,
            subjectCode: session.subject.code,
            date: date || session.date,
            presentCount,
            absentCount,
            totalStudents: records.length,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Attendance session updated successfully",
    });
  } catch (error: any) {
    console.error("Attendance PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update attendance session" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get("sessionId");

    if (!sessionIdParam) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    const sessionId = parseInt(sessionIdParam, 10);
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { subject: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    await prisma.attendanceSession.delete({
      where: { id: sessionId },
    });

    await prisma.auditLog.create({
      data: {
        module: "ATTENDANCE",
        action: "ATTENDANCE_SESSION_DELETED",
        summary: `Deleted attendance session for ${session.subject.code} on ${session.date}`,
        payload: JSON.stringify({ sessionId, date: session.date, subjectCode: session.subject.code }),
      },
    });

    return NextResponse.json({ success: true, message: "Attendance session deleted" });
  } catch (error: any) {
    console.error("Attendance DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}
