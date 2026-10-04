import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_NOTIFICATION_EMAIL,
  isLiveSmtpConfigured,
  sendTaskCreatedEmail,
  sendTaskReminderEmail,
  sendTestEmail,
  saveAndVerifySmtpConfig,
} from "@/lib/mailer";

// GET: Fetch all tasks, metrics, and email config status
export async function GET(req: NextRequest) {
  try {
    const tasks = await prisma.taskReminder.findMany({
      orderBy: [
        { isCompleted: "asc" },
        { dueDate: "asc" },
        { reminderTime: "asc" },
        { id: "desc" },
      ],
    });

    const todayStr = new Date().toISOString().split("T")[0];

    let pendingCount = 0;
    let completedCount = 0;
    let urgentCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      if (t.isCompleted) {
        completedCount++;
      } else {
        pendingCount++;
        if (t.priority === "URGENT") urgentCount++;
        if (t.dueDate === todayStr) dueTodayCount++;
        if (t.dueDate && t.dueDate < todayStr) overdueCount++;
      }
    });

    return NextResponse.json({
      success: true,
      tasks: tasks.map((t) => {
        let notified = false;
        try {
          if (t.customFields) {
            const parsed = JSON.parse(t.customFields);
            if (parsed.notifiedAt) notified = true;
          }
        } catch (e) {}

        return {
          id: t.id,
          title: t.title,
          description: t.description || "",
          dueDate: t.dueDate || "",
          reminderTime: t.reminderTime || "",
          priority: t.priority,
          category: t.category || "GENERAL",
          isCompleted: t.isCompleted,
          notified,
          createdAt: t.createdAt,
        };
      }),
      stats: {
        total: tasks.length,
        pending: pendingCount,
        completed: completedCount,
        urgent: urgentCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
      },
      emailConfig: {
        recipient: process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL,
        isLiveSmtp: isLiveSmtpConfigured(),
        smtpUser: process.env.SMTP_USER || null,
      },
    });
  } catch (error: any) {
    console.error("Tasks GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST: Create Task, Trigger Reminder, Test Email, or Toggle Complete
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // Action A: Create Task & Send Confirmation Email
    // ----------------------------------------------------
    if (action === "CREATE_TASK" || !action) {
      const { title, description, dueDate, reminderTime, priority, category } = body;

      if (!title || !title.trim()) {
        return NextResponse.json({ success: false, error: "Task title is required" }, { status: 400 });
      }

      const task = await prisma.taskReminder.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          dueDate: dueDate?.trim() || null,
          reminderTime: reminderTime?.trim() || null,
          priority: (priority || "MEDIUM").toUpperCase().trim(),
          category: (category || "GENERAL").toUpperCase().trim(),
          isCompleted: false,
        },
      });

      // 1. Send "Task Saved" Email to zohaibmuaz@gmail.com
      const emailResult = await sendTaskCreatedEmail({
        title: task.title,
        category: task.category,
        priority: task.priority,
        dueDate: task.dueDate,
        reminderTime: task.reminderTime,
        description: task.description,
      });

      // 2. Audit Log
      await prisma.auditLog.create({
        data: {
          module: "TASKS",
          action: "TASK_CREATED",
          summary: `Created task "${task.title}" (Due: ${task.dueDate || "None"} ${task.reminderTime || ""}) & dispatched email to ${DEFAULT_NOTIFICATION_EMAIL}`,
          payload: JSON.stringify({
            taskId: task.id,
            title: task.title,
            priority: task.priority,
            category: task.category,
            emailStatus: emailResult.success,
          }),
        },
      });

      return NextResponse.json({ success: true, task, emailResult });
    }

    // ----------------------------------------------------
    // Action B: Trigger Alarm / Reminder Email (When Time Arrives)
    // ----------------------------------------------------
    if (action === "TRIGGER_REMINDER") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Task id is required" }, { status: 400 });
      }

      const pId = parseInt(id, 10);
      const task = await prisma.taskReminder.findUnique({ where: { id: pId } });

      if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }

      // Check if already notified
      let custom: any = {};
      try {
        if (task.customFields) custom = JSON.parse(task.customFields);
      } catch (e) {}

      if (custom.notifiedAt) {
        return NextResponse.json({
          success: true,
          message: "Task was already notified",
          task,
        });
      }

      // Mark as notified in database
      custom.notifiedAt = new Date().toISOString();
      const updated = await prisma.taskReminder.update({
        where: { id: pId },
        data: {
          customFields: JSON.stringify(custom),
        },
      });

      // Dispatch Urgent "TIME IS UP" Email to zohaibmuaz@gmail.com
      const emailResult = await sendTaskReminderEmail({
        title: task.title,
        category: task.category,
        priority: task.priority,
        dueDate: task.dueDate,
        reminderTime: task.reminderTime,
        description: task.description,
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          module: "TASKS",
          action: "TASK_ALARM_TRIGGERED",
          summary: `ALARM FIRED: Sent "Time is Up" reminder email to ${DEFAULT_NOTIFICATION_EMAIL} for "${task.title}"`,
          payload: JSON.stringify({
            taskId: pId,
            title: task.title,
            notifiedAt: custom.notifiedAt,
            emailSent: emailResult.success,
          }),
        },
      });

      return NextResponse.json({ success: true, task: updated, emailResult });
    }

    // ----------------------------------------------------
    // Action C: Toggle Task Completion (Done / Undone)
    // ----------------------------------------------------
    if (action === "TOGGLE_COMPLETE") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Task id is required" }, { status: 400 });
      }

      const pId = parseInt(id, 10);
      const task = await prisma.taskReminder.findUnique({ where: { id: pId } });

      if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }

      const newStatus = !task.isCompleted;
      const updated = await prisma.taskReminder.update({
        where: { id: pId },
        data: { isCompleted: newStatus },
      });

      await prisma.auditLog.create({
        data: {
          module: "TASKS",
          action: newStatus ? "TASK_COMPLETED" : "TASK_REOPENED",
          summary: `${newStatus ? "Completed" : "Reopened"} task "${task.title}"`,
          payload: JSON.stringify({ taskId: pId, title: task.title, isCompleted: newStatus }),
        },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    // ----------------------------------------------------
    // Action D: Send Test Ping Email to zohaibmuaz@gmail.com
    // ----------------------------------------------------
    if (action === "TEST_EMAIL") {
      const { email } = body;
      const target = email || process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL;
      const result = await sendTestEmail(target);
      return NextResponse.json({ success: result.success, result });
    }

    // ----------------------------------------------------
    // Action E: Save and Verify Gmail SMTP App Password Credentials
    // ----------------------------------------------------
    if (action === "SAVE_SMTP_CONFIG") {
      const { smtpUser, appPassword, recipient } = body;

      if (!smtpUser || !smtpUser.trim()) {
        return NextResponse.json({ success: false, error: "Gmail address is required" }, { status: 400 });
      }
      if (!appPassword || !appPassword.trim()) {
        return NextResponse.json({ success: false, error: "16-character Google App Password is required" }, { status: 400 });
      }

      const result = await saveAndVerifySmtpConfig(
        smtpUser.trim(),
        appPassword.trim(),
        recipient?.trim() || smtpUser.trim()
      );

      if (result.success) {
        await prisma.auditLog.create({
          data: {
            module: "TASKS",
            action: "SMTP_CONFIG_SAVED",
            summary: `Configured and verified live Gmail SMTP for ${smtpUser.trim()}`,
            payload: JSON.stringify({ user: smtpUser.trim(), recipient: recipient || smtpUser.trim() }),
          },
        });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process task request" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing task
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, dueDate, reminderTime, priority, category } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Task id is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.taskReminder.findUnique({ where: { id: pId } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.taskReminder.update({
      where: { id: pId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        dueDate: dueDate !== undefined ? dueDate?.trim() || null : undefined,
        reminderTime: reminderTime !== undefined ? reminderTime?.trim() || null : undefined,
        priority: priority !== undefined ? priority.toUpperCase().trim() : undefined,
        category: category !== undefined ? category.toUpperCase().trim() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        module: "TASKS",
        action: "TASK_UPDATED",
        summary: `Updated task "${updated.title}"`,
        payload: JSON.stringify({ id: pId, title: updated.title, priority: updated.priority }),
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error("Tasks PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a single task or clear completed tasks
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearCompleted = searchParams.get("clearCompleted");

    if (clearCompleted === "true") {
      const deleted = await prisma.taskReminder.deleteMany({
        where: { isCompleted: true },
      });

      await prisma.auditLog.create({
        data: {
          module: "TASKS",
          action: "COMPLETED_TASKS_CLEARED",
          summary: `Cleared ${deleted.count} completed tasks from board`,
          payload: JSON.stringify({ count: deleted.count }),
        },
      });

      return NextResponse.json({ success: true, message: `Cleared ${deleted.count} completed tasks` });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Task id is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.taskReminder.findUnique({ where: { id: pId } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    await prisma.taskReminder.delete({ where: { id: pId } });

    await prisma.auditLog.create({
      data: {
        module: "TASKS",
        action: "TASK_DELETED",
        summary: `Deleted task "${existing.title}"`,
        payload: JSON.stringify({ id: pId, title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Tasks DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
