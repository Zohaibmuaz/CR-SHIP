import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTransporter, DEFAULT_NOTIFICATION_EMAIL } from "@/lib/mailer";

// GET: Check status of nightly email backups
export async function GET() {
  try {
    const lastBackupLog = await prisma.auditLog.findFirst({
      where: {
        module: "BACKUP",
        action: { in: ["NIGHTLY_BACKUP_EMAIL_SENT", "MANUAL_EMAIL_BACKUP_SENT"] },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      success: true,
      nightlySchedule: "22:00 (10:00 PM Daily)",
      recipient: process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL,
      lastSentAt: lastBackupLog?.timestamp || null,
      lastSummary: lastBackupLog?.summary || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Generate snapshot and dispatch backup email to zohaibmuaz@gmail.com
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isManual = body.isManual === true;
    const recipient = process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL;
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Fetch snapshot of all tables
    const [
      students,
      teachers,
      subjects,
      timetableSlots,
      attendanceSessions,
      studentGroups,
      courseMaterials,
      classLogs,
      taskReminders,
      auditLogsCount,
    ] = await Promise.all([
      prisma.student.findMany({ select: { id: true, rollNo: true, name: true, phone: true } }),
      prisma.teacher.findMany({ select: { id: true, name: true, phone: true } }),
      prisma.subject.findMany({ select: { id: true, code: true, name: true } }),
      prisma.timetableSlot.findMany(),
      prisma.attendanceSession.findMany(),
      prisma.studentGroup.findMany(),
      prisma.courseMaterial.findMany(),
      prisma.classLog.findMany(),
      prisma.taskReminder.findMany(),
      prisma.auditLog.count(),
    ]);

    const backupData = {
      metadata: {
        system: "CR-Ship",
        class: "BSCS 7th (E2)",
        institution: "University of Agriculture Faisalabad (UAF)",
        classRepresentative: "Zohaib",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        backupType: isManual ? "MANUAL_TRIGGER" : "AUTOMATED_NIGHTLY_10PM",
      },
      counts: {
        students: students.length,
        teachers: teachers.length,
        subjects: subjects.length,
        timetableSlots: timetableSlots.length,
        attendanceSessions: attendanceSessions.length,
        studentGroups: studentGroups.length,
        courseMaterials: courseMaterials.length,
        classLogs: classLogs.length,
        taskReminders: taskReminders.length,
        auditLogs: auditLogsCount,
      },
      data: {
        students,
        teachers,
        subjects,
        timetableSlots,
        attendanceSessions,
        studentGroups,
        courseMaterials,
        classLogs,
        taskReminders,
      },
    };

    const jsonBackupString = JSON.stringify(backupData, null, 2);
    const attachmentFilename = `cr_nexus_backup_${dateStr}.json`;

    // Branded High-Contrast Email Template (Zero Grey Policy)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C18; color: #FFFFFF; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #0E1529; border: 1px solid #10B981; border-radius: 20px; padding: 28px; box-shadow: 0 10px 35px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(16,185,129,0.2); color: #34D399; border: 1px solid #10B981; }
    .title { font-size: 22px; font-weight: 900; color: #FFFFFF; margin: 14px 0 6px 0; }
    .table-box { background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 16px; margin: 20px 0; }
    .table-row { display: flex; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
    .table-row:last-child { border-bottom: none; }
    .label { color: #94A3B8; font-weight: 600; }
    .val { color: #F8FAFC; font-weight: 800; }
    .highlight { color: #34D399; }
    .alert-box { background: rgba(16,185,129,0.1); border-left: 4px solid #10B981; padding: 14px; font-size: 13px; color: #E2E8F0; margin: 20px 0; border-radius: 0 10px 10px 0; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #64748B; }
  </style>
</head>
<body>
  <div class="card">
    <div>
      <span class="badge">🛡️ Daily 10:00 PM System Backup</span>
      <div class="title">CR-Ship Nightly Data Snapshot</div>
      <div style="font-size: 13px; color: #94A3B8;">BSCS 7th (E2) • Department of Computer Science, UAF</div>
    </div>

    <div class="alert-box">
      <strong>✅ Database State Secured:</strong> Your complete class database has been archived and attached to this email as a portable JSON snapshot file. You can restore this file with 1 click in CR-Ship if ever needed.
    </div>

    <div class="table-box">
      <div class="table-row">
        <span class="label">📅 Backup Timestamp:</span>
        <span class="val highlight">${dateStr} at ${timeStr}</span>
      </div>
      <div class="table-row">
        <span class="label">👥 Registered Students:</span>
        <span class="val">${backupData.counts.students} Students (Active Roster)</span>
      </div>
      <div class="table-row">
        <span class="label">📚 Official Subjects:</span>
        <span class="val">${backupData.counts.subjects} Subjects</span>
      </div>
      <div class="table-row">
        <span class="label">📅 Timetable Slots:</span>
        <span class="val">${backupData.counts.timetableSlots} Weekly Lecture Slots</span>
      </div>
      <div class="table-row">
        <span class="label">📋 Attendance Sessions:</span>
        <span class="val">${backupData.counts.attendanceSessions} Sessions Recorded</span>
      </div>
      <div class="table-row">
        <span class="label">👥 Student Group Records:</span>
        <span class="val">${backupData.counts.studentGroups} Groups Formed</span>
      </div>
      <div class="table-row">
        <span class="label">📁 Course Drive Materials:</span>
        <span class="val">${backupData.counts.courseMaterials} Files & Links Saved</span>
      </div>
      <div class="table-row">
        <span class="label">👨‍🏫 Faculty Profiles:</span>
        <span class="val">${backupData.counts.teachers} Teachers Registered</span>
      </div>
      <div class="table-row">
        <span class="label">📝 Pending / Active Tasks:</span>
        <span class="val">${backupData.counts.taskReminders} Tasks</span>
      </div>
      <div class="table-row">
        <span class="label">📜 Permanent Audit Logs:</span>
        <span class="val">${backupData.counts.auditLogs} Immutable Activity Records</span>
      </div>
    </div>

    <div style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
      📎 <strong>Attached Backup File:</strong> <code style="color: #FBBF24;">${attachmentFilename}</code><br>
      To restore: Open <strong>CR-Ship (localhost:3000)</strong> &rarr; Go to <strong>Logs & Backups</strong> &rarr; Select this file & click <strong>Restore</strong>.
    </div>

    <div class="footer">
      CR-Ship Automated Backup Daemon • Dispatched to <strong>${recipient}</strong><br>
      Class Representative Zohaib (BSCS 7th E2, UAF)
    </div>
  </div>
</body>
</html>
`;

    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"CR-Ship Backup Vault" <${process.env.SMTP_USER || "crnexus@uaf.edu.pk"}>`,
      to: recipient,
      subject: `🛡️ [CR-Ship] Daily Automated 10:00 PM System Backup (${dateStr})`,
      html,
      attachments: [
        {
          filename: attachmentFilename,
          content: jsonBackupString,
          contentType: "application/json",
        },
      ],
    });

    const actionType = isManual ? "MANUAL_EMAIL_BACKUP_SENT" : "NIGHTLY_BACKUP_EMAIL_SENT";
    await prisma.auditLog.create({
      data: {
        module: "BACKUP",
        action: actionType,
        summary: `Dispatched ${isManual ? "manual" : "nightly 10:00 PM"} backup email with JSON archive attachment to ${recipient}`,
        payload: JSON.stringify({
          recipient,
          messageId: info.messageId,
          counts: backupData.counts,
          filename: attachmentFilename,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Nightly backup email successfully dispatched to ${recipient}!`,
      recipient,
      counts: backupData.counts,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("POST /api/backup/email error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send backup email" },
      { status: 500 }
    );
  }
}
