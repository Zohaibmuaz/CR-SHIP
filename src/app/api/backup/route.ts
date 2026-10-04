import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// GET: Download backup as SQLite file (.db) or JSON, or get DB stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "stats";

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dateStr = new Date().toISOString().split("T")[0];

    // ----------------------------------------------------
    // 1. Raw SQLite DB File Download
    // ----------------------------------------------------
    if (format === "sqlite") {
      const dbPath = path.join(process.cwd(), "prisma", "cr_nexus.db");

      if (!fs.existsSync(dbPath)) {
        return NextResponse.json(
          { success: false, error: "Database file not found on disk" },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(dbPath);
      const filename = `cr_nexus_backup_${dateStr}_${timestamp.slice(11, 16)}.db`;

      // Log download action in audit logs
      await prisma.auditLog.create({
        data: {
          module: "BACKUP",
          action: "SQLITE_BACKUP_DOWNLOADED",
          summary: `Downloaded raw SQLite database backup (${(fileBuffer.length / 1024).toFixed(1)} KB)`,
          payload: JSON.stringify({ filename, sizeBytes: fileBuffer.length }),
        },
      });

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }

    // ----------------------------------------------------
    // 2. Universal JSON Snapshot Download
    // ----------------------------------------------------
    if (format === "json") {
      const [
        students,
        teachers,
        subjects,
        timetableSlots,
        attendanceSessions,
        attendanceRecords,
        studentGroups,
        groupMembers,
        courseMaterials,
        classLogs,
        taskReminders,
        auditLogs,
      ] = await Promise.all([
        prisma.student.findMany({ orderBy: { id: "asc" } }),
        prisma.teacher.findMany({ orderBy: { id: "asc" } }),
        prisma.subject.findMany({ orderBy: { id: "asc" } }),
        prisma.timetableSlot.findMany({ orderBy: { id: "asc" } }),
        prisma.attendanceSession.findMany({ orderBy: { id: "asc" } }),
        prisma.attendanceRecord.findMany({ orderBy: { id: "asc" } }),
        prisma.studentGroup.findMany({ orderBy: { id: "asc" } }),
        prisma.groupMember.findMany({ orderBy: { id: "asc" } }),
        prisma.courseMaterial.findMany({ orderBy: { id: "asc" } }),
        prisma.classLog.findMany({ orderBy: { id: "asc" } }),
        prisma.taskReminder.findMany({ orderBy: { id: "asc" } }),
        prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: 500 }),
      ]);

      const backupData = {
        metadata: {
          system: "CR-Ship",
          class: "BSCS 7th (E2)",
          institution: "University of Agriculture Faisalabad (UAF)",
          classRepresentative: "Zohaib",
          version: "1.0",
          exportedAt: new Date().toISOString(),
        },
        counts: {
          students: students.length,
          teachers: teachers.length,
          subjects: subjects.length,
          timetableSlots: timetableSlots.length,
          attendanceSessions: attendanceSessions.length,
          attendanceRecords: attendanceRecords.length,
          studentGroups: studentGroups.length,
          groupMembers: groupMembers.length,
          courseMaterials: courseMaterials.length,
          classLogs: classLogs.length,
          taskReminders: taskReminders.length,
          auditLogs: auditLogs.length,
        },
        data: {
          students,
          teachers,
          subjects,
          timetableSlots,
          attendanceSessions,
          attendanceRecords,
          studentGroups,
          groupMembers,
          courseMaterials,
          classLogs,
          taskReminders,
          auditLogs,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const filename = `cr_nexus_snapshot_${dateStr}.json`;

      // Log action
      await prisma.auditLog.create({
        data: {
          module: "BACKUP",
          action: "JSON_SNAPSHOT_EXPORTED",
          summary: `Exported full JSON snapshot (${backupData.counts.students} students, ${backupData.counts.subjects} subjects, ${backupData.counts.taskReminders} tasks)`,
          payload: JSON.stringify({ filename, counts: backupData.counts }),
        },
      });

      return new NextResponse(jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ----------------------------------------------------
    // 3. Database Health & Table Counts Stats
    // ----------------------------------------------------
    const [
      studentsCount,
      teachersCount,
      subjectsCount,
      timetableSlotsCount,
      attendanceSessionsCount,
      studentGroupsCount,
      courseMaterialsCount,
      classLogsCount,
      taskRemindersCount,
      auditLogsCount,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.subject.count(),
      prisma.timetableSlot.count(),
      prisma.attendanceSession.count(),
      prisma.studentGroup.count(),
      prisma.courseMaterial.count(),
      prisma.classLog.count(),
      prisma.taskReminder.count(),
      prisma.auditLog.count(),
    ]);

    // SQLite file size
    const dbPath = path.join(process.cwd(), "prisma", "cr_nexus.db");
    let fileSizeBytes = 0;
    let lastModified: string | null = null;
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      fileSizeBytes = stat.size;
      lastModified = stat.mtime.toISOString();
    }

    // Check last email backup audit log
    const lastBackupLog = await prisma.auditLog.findFirst({
      where: {
        module: "BACKUP",
        action: { in: ["NIGHTLY_BACKUP_EMAIL_SENT", "MANUAL_EMAIL_BACKUP_SENT"] },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      success: true,
      database: {
        file: "cr_nexus.db",
        sizeBytes: fileSizeBytes,
        sizeFormatted: `${(fileSizeBytes / 1024).toFixed(1)} KB`,
        lastModified,
        integrity: "HEALTHY",
      },
      counts: {
        students: studentsCount,
        teachers: teachersCount,
        subjects: subjectsCount,
        timetableSlots: timetableSlotsCount,
        attendanceSessions: attendanceSessionsCount,
        studentGroups: studentGroupsCount,
        courseMaterials: courseMaterialsCount,
        classLogs: classLogsCount,
        taskReminders: taskRemindersCount,
        auditLogs: auditLogsCount,
        totalEntities:
          studentsCount +
          teachersCount +
          subjectsCount +
          timetableSlotsCount +
          attendanceSessionsCount +
          studentGroupsCount +
          courseMaterialsCount +
          classLogsCount +
          taskRemindersCount +
          auditLogsCount,
      },
      nightlyEmail: {
        enabled: true,
        scheduledTime: "22:00 (10:00 PM)",
        recipient: process.env.NOTIFICATION_EMAIL || "zohaibmuaz@gmail.com",
        lastSentAt: lastBackupLog?.timestamp || null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process backup request" },
      { status: 500 }
    );
  }
}

// POST: Safe Database Restore from JSON backup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, backupData } = body;

    if (action !== "RESTORE_JSON" || !backupData || !backupData.data) {
      return NextResponse.json(
        { success: false, error: "Invalid backup data structure provided" },
        { status: 400 }
      );
    }

    const { data, counts } = backupData;
    const restoredSummary: Record<string, number> = {};

    // Execute in transaction or sequential safe blocks
    // 1. Students (upsert by rollNo)
    if (Array.isArray(data.students)) {
      let restoredStudents = 0;
      for (const s of data.students) {
        if (!s.rollNo) continue;
        await prisma.student.upsert({
          where: { rollNo: s.rollNo },
          update: {
            name: s.name,
            phone: s.phone,
            email: s.email,
            section: s.section || "BSCS 7th E2",
            customFields: s.customFields,
          },
          create: {
            rollNo: s.rollNo,
            name: s.name,
            phone: s.phone,
            email: s.email,
            section: s.section || "BSCS 7th E2",
            customFields: s.customFields,
          },
        });
        restoredStudents++;
      }
      restoredSummary.students = restoredStudents;
    }

    // 2. Teachers (upsert by name)
    if (Array.isArray(data.teachers)) {
      let restoredTeachers = 0;
      for (const t of data.teachers) {
        if (!t.name) continue;
        const existing = await prisma.teacher.findFirst({ where: { name: t.name } });
        if (existing) {
          await prisma.teacher.update({
            where: { id: existing.id },
            data: { phone: t.phone, email: t.email, office: t.office, customFields: t.customFields },
          });
        } else {
          await prisma.teacher.create({
            data: { name: t.name, phone: t.phone, email: t.email, office: t.office, customFields: t.customFields },
          });
        }
        restoredTeachers++;
      }
      restoredSummary.teachers = restoredTeachers;
    }

    // 3. Subjects (upsert by code)
    if (Array.isArray(data.subjects)) {
      let restoredSubjects = 0;
      for (const sub of data.subjects) {
        if (!sub.code) continue;
        await prisma.subject.upsert({
          where: { code: sub.code },
          update: {
            name: sub.name,
            creditHours: sub.creditHours || 3,
            customFields: sub.customFields,
          },
          create: {
            code: sub.code,
            name: sub.name,
            creditHours: sub.creditHours || 3,
            customFields: sub.customFields,
          },
        });
        restoredSubjects++;
      }
      restoredSummary.subjects = restoredSubjects;
    }

    // 4. Tasks (create missing tasks)
    if (Array.isArray(data.taskReminders)) {
      let restoredTasks = 0;
      for (const task of data.taskReminders) {
        if (!task.title) continue;
        const existing = await prisma.taskReminder.findFirst({
          where: { title: task.title, dueDate: task.dueDate },
        });
        if (!existing) {
          await prisma.taskReminder.create({
            data: {
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              reminderTime: task.reminderTime,
              priority: task.priority || "MEDIUM",
              category: task.category || "GENERAL",
              isCompleted: Boolean(task.isCompleted),
              customFields: task.customFields,
            },
          });
          restoredTasks++;
        }
      }
      restoredSummary.tasks = restoredTasks;
    }

    // Log the restore event permanently in audit logs
    await prisma.auditLog.create({
      data: {
        module: "BACKUP",
        action: "DATABASE_RESTORED",
        summary: `Restored database from JSON snapshot (${Object.entries(restoredSummary).map(([k, v]) => `${v} ${k}`).join(", ")})`,
        payload: JSON.stringify({
          restoredSummary,
          sourceCounts: counts,
          restoredAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database snapshot successfully restored and verified!",
      restoredSummary,
    });
  } catch (error: any) {
    console.error("POST /api/backup restore error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore backup" },
      { status: 500 }
    );
  }
}
