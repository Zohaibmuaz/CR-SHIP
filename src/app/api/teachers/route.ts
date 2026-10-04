import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch faculty list with courses, contact details, conduction stats, and class logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");

    // 1. Fetch all teachers with their subjects and timetable slots
    const teachersRaw = await prisma.teacher.findMany({
      include: {
        subjects: {
          include: {
            classLogs: true,
          },
        },
        timetableSlots: true,
      },
      orderBy: { id: "asc" },
    });

    // 2. Fetch all subjects for course selection
    const subjects = await prisma.subject.findMany({
      include: {
        teacher: true,
      },
      orderBy: { id: "asc" },
    });

    // 3. Fetch class logs
    const classLogsWhere = subjectIdParam
      ? { subjectId: parseInt(subjectIdParam, 10) }
      : {};

    const classLogs = await prisma.classLog.findMany({
      where: classLogsWhere,
      include: {
        subject: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    // 4. Calculate stats per teacher and global totals
    let totalClassesHeld = 0;
    let totalClassesCancelled = 0;
    let totalClassesRescheduled = 0;
    let totalClassesHoliday = 0;

    const teachers = teachersRaw.map((t) => {
      let teacherHeld = 0;
      let teacherCancelled = 0;
      let teacherRescheduled = 0;
      let teacherHoliday = 0;

      t.subjects.forEach((sub) => {
        sub.classLogs.forEach((log) => {
          if (log.status === "HELD") teacherHeld++;
          else if (log.status === "CANCELLED") teacherCancelled++;
          else if (log.status === "RESCHEDULED") teacherRescheduled++;
          else if (log.status === "HOLIDAY") teacherHoliday++;
        });
      });

      totalClassesHeld += teacherHeld;
      totalClassesCancelled += teacherCancelled;
      totalClassesRescheduled += teacherRescheduled;
      totalClassesHoliday += teacherHoliday;

      const totalDeliverable = teacherHeld + teacherCancelled;
      const deliveryRate =
        totalDeliverable > 0
          ? Math.round((teacherHeld / totalDeliverable) * 100)
          : 100;

      let custom: any = {};
      try {
        if (t.customFields) custom = JSON.parse(t.customFields);
      } catch (e) {}

      return {
        id: t.id,
        name: t.name,
        phone: t.phone || "",
        email: t.email || "",
        office: t.office || custom.office || "Dept. of Computer Science",
        bestTimes: custom.bestTimes || "10:00 AM - 1:00 PM",
        department: custom.department || "Computer Science",
        role: custom.role || "Faculty",
        subjects: t.subjects.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          creditHours: s.creditHours,
        })),
        stats: {
          held: teacherHeld,
          cancelled: teacherCancelled,
          rescheduled: teacherRescheduled,
          holiday: teacherHoliday,
          total: teacherHeld + teacherCancelled + teacherRescheduled + teacherHoliday,
          deliveryRate,
        },
      };
    });

    const totalDeliverableGlobal = totalClassesHeld + totalClassesCancelled;
    const globalDeliveryRate =
      totalDeliverableGlobal > 0
        ? Math.round((totalClassesHeld / totalDeliverableGlobal) * 100)
        : 100;

    return NextResponse.json({
      success: true,
      teachers,
      subjects: subjects.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        teacherId: s.teacherId,
        teacherName: s.teacher?.name || "Unassigned",
      })),
      classLogs: classLogs.map((log) => ({
        id: log.id,
        subjectId: log.subjectId,
        subjectCode: log.subject.code,
        subjectName: log.subject.name,
        teacherName: log.subject.teacher?.name || "Faculty",
        teacherPhone: log.subject.teacher?.phone || "",
        date: log.date,
        status: log.status,
        topicCovered: log.topicCovered || "",
        reason: log.reason || "",
        createdAt: log.createdAt,
      })),
      stats: {
        totalFaculty: teachers.length,
        withPhoneCount: teachers.filter((t) => !!t.phone).length,
        totalClassesHeld,
        totalClassesCancelled,
        totalClassesRescheduled,
        totalClassesHoliday,
        globalDeliveryRate,
      },
    });
  } catch (error: any) {
    console.error("Teachers GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch faculty desk data" },
      { status: 500 }
    );
  }
}

// POST: Add Class Log or Update Teacher Profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // Action A: Add / Log Class Conduction Event
    // ----------------------------------------------------
    if (action === "ADD_CLASS_LOG" || !action) {
      const { subjectId, date, status, topicCovered, reason } = body;

      if (!subjectId || !date || !status) {
        return NextResponse.json(
          { success: false, error: "subjectId, date, and status are required" },
          { status: 400 }
        );
      }

      const pSubjectId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({
        where: { id: pSubjectId },
        include: { teacher: true },
      });

      const classLog = await prisma.classLog.create({
        data: {
          subjectId: pSubjectId,
          date: date.trim(),
          status: status.toUpperCase().trim(),
          topicCovered: topicCovered?.trim() || null,
          reason: reason?.trim() || null,
        },
      });

      // Permanent Audit Log
      await prisma.auditLog.create({
        data: {
          module: "TEACHERS",
          action: "CLASS_LOG_RECORDED",
          summary: `Recorded ${classLog.status} class on ${classLog.date} for ${subject?.code} (${subject?.teacher?.name || "Teacher"})`,
          payload: JSON.stringify({
            logId: classLog.id,
            subjectId: pSubjectId,
            date: classLog.date,
            status: classLog.status,
            topic: classLog.topicCovered,
            reason: classLog.reason,
          }),
        },
      });

      return NextResponse.json({ success: true, classLog });
    }

    // ----------------------------------------------------
    // Action B: Update Teacher Profile (Phone, Office, Best Times)
    // ----------------------------------------------------
    if (action === "UPDATE_TEACHER") {
      const { id, name, phone, email, office, bestTimes, department } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: "Teacher id is required" }, { status: 400 });
      }

      const pId = parseInt(id, 10);
      const existing = await prisma.teacher.findUnique({ where: { id: pId } });

      if (!existing) {
        return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
      }

      let currentCustom: any = {};
      try {
        if (existing.customFields) currentCustom = JSON.parse(existing.customFields);
      } catch (e) {}

      if (office !== undefined) currentCustom.office = office.trim();
      if (bestTimes !== undefined) currentCustom.bestTimes = bestTimes.trim();
      if (department !== undefined) currentCustom.department = department.trim();

      const updated = await prisma.teacher.update({
        where: { id: pId },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          phone: phone !== undefined ? phone.trim() : undefined,
          email: email !== undefined ? email.trim() : undefined,
          office: office !== undefined ? office.trim() : undefined,
          customFields: JSON.stringify(currentCustom),
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          module: "TEACHERS",
          action: "TEACHER_PROFILE_UPDATED",
          summary: `Updated profile & contact for ${updated.name} (Phone: ${updated.phone || "None"})`,
          payload: JSON.stringify({ id: pId, name: updated.name, phone: updated.phone }),
        },
      });

      return NextResponse.json({ success: true, teacher: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Teachers POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process faculty request" },
      { status: 500 }
    );
  }
}

// PUT: Edit existing Class Log
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, topicCovered, reason, date } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Class log id is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.classLog.findUnique({
      where: { id: pId },
      include: { subject: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Class log not found" }, { status: 404 });
    }

    const updated = await prisma.classLog.update({
      where: { id: pId },
      data: {
        date: date !== undefined ? date.trim() : undefined,
        status: status !== undefined ? status.toUpperCase().trim() : undefined,
        topicCovered: topicCovered !== undefined ? topicCovered?.trim() || null : undefined,
        reason: reason !== undefined ? reason?.trim() || null : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        module: "TEACHERS",
        action: "CLASS_LOG_UPDATED",
        summary: `Updated class log #${pId} on ${updated.date} for ${existing.subject.code} (${updated.status})`,
        payload: JSON.stringify({ id: pId, date: updated.date, status: updated.status }),
      },
    });

    return NextResponse.json({ success: true, classLog: updated });
  } catch (error: any) {
    console.error("Teachers PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update class log" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a Class Log
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id parameter is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.classLog.findUnique({
      where: { id: pId },
      include: { subject: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Class log not found" }, { status: 404 });
    }

    await prisma.classLog.delete({
      where: { id: pId },
    });

    await prisma.auditLog.create({
      data: {
        module: "TEACHERS",
        action: "CLASS_LOG_DELETED",
        summary: `Deleted class log #${pId} (${existing.subject.code} on ${existing.date})`,
        payload: JSON.stringify({ id: pId, subjectCode: existing.subject.code }),
      },
    });

    return NextResponse.json({ success: true, message: "Class log deleted successfully" });
  } catch (error: any) {
    console.error("Teachers DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete class log" },
      { status: 500 }
    );
  }
}
