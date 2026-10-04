import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export const DEFAULT_NOTIFICATION_EMAIL =
  process.env.NOTIFICATION_EMAIL || "zohaibmuaz@gmail.com";

import fs from "fs";
import path from "path";

// Check if live SMTP credentials are provided in environment
export function isLiveSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Create or return nodemailer transporter
export async function getTransporter() {
  if (isLiveSmtpConfigured()) {
    const cleanPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    
    // For Gmail, nodemailer's built-in service: "gmail" provides optimal SSL/TLS handshake
    if (host.includes("gmail") || !process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: cleanPass,
        },
      });
    }

    const isSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465";
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
    });
  }

  // Fallback: Test account via Ethereal or simulated transport
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    // If offline / no internet connection, create a json/stub transport
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }
}

// Helper: Save SMTP credentials to .env and verify connection
export async function saveAndVerifySmtpConfig(
  smtpUser: string,
  appPassword: string,
  targetEmail?: string
) {
  const cleanPass = appPassword.replace(/\s+/g, "");
  const recipient = (targetEmail || smtpUser).trim();
  const cleanUser = smtpUser.trim();

  // Test the connection with Gmail first
  const testTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
  });

  try {
    await testTransporter.verify();
  } catch (verifyErr: any) {
    console.error("Gmail SMTP Verify Error:", verifyErr);
    return {
      success: false,
      error: `Gmail Authentication Failed: ${verifyErr.message}. Ensure 2-Step Verification is active and you used a 16-character App Password from Google.`,
    };
  }

  // Update in-memory process.env immediately
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  process.env.SMTP_USER = cleanUser;
  process.env.SMTP_PASS = cleanPass;
  process.env.NOTIFICATION_EMAIL = recipient;

  // Persist to .env file on disk
  try {
    const envPath = path.join(process.cwd(), ".env");
    const envContent = `# CR-Ship - Automatic Email Notifications
NOTIFICATION_EMAIL=${recipient}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=${cleanUser}
SMTP_PASS=${cleanPass}
`;
    fs.writeFileSync(envPath, envContent, "utf-8");
  } catch (fsErr) {
    console.warn("Could not write to .env file:", fsErr);
  }

  // Send a real verification test email
  const testResult = await sendTestEmail(recipient);

  return {
    success: true,
    message: `Connected successfully to Gmail! A live test email has been sent to ${recipient}. Please check your inbox now!`,
    testResult,
  };
}

// ----------------------------------------------------
// 1. Send Email When Task is Saved / Created
// ----------------------------------------------------
export async function sendTaskCreatedEmail(task: {
  title: string;
  category?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  reminderTime?: string | null;
  description?: string | null;
}) {
  const recipient = DEFAULT_NOTIFICATION_EMAIL;
  const isLive = isLiveSmtpConfigured();

  const categoryName = task.category || "General";
  const priorityName = task.priority || "MEDIUM";
  const dueDateTime = `${task.dueDate || "Not specified"} ${task.reminderTime ? `at ${task.reminderTime}` : ""}`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C18; color: #FFFFFF; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #0E1529; border: 1px solid #6366F1; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: rgba(99,102,241,0.2); color: #818CF8; border: 1px solid #6366F1; }
    .priority { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #F59E0B; color: #000; margin-left: 8px; }
    .title { font-size: 20px; font-weight: 900; color: #FFFFFF; margin: 12px 0 6px 0; }
    .meta-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; margin: 16px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-label { color: #94A3B8; font-weight: 600; }
    .meta-val { color: #F8FAFC; font-weight: 700; }
    .desc { background: rgba(255,255,255,0.03); border-left: 3px solid #10B981; padding: 12px; font-size: 13px; color: #E2E8F0; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #64748B; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">CR-Ship Task Scheduled</span>
      <span class="priority">${priorityName} Priority</span>
      <div class="title">${task.title}</div>
      <div style="font-size: 13px; color: #94A3B8;">BSCS 7th (E2) — Class Representative Automation</div>
    </div>

    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">📁 Category:</span>
        <span class="meta-val">${categoryName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">⏰ Due Date & Time:</span>
        <span class="meta-val" style="color: #FBBF24;">${dueDateTime}</span>
      </div>
      <div class="meta-row" style="margin-bottom: 0;">
        <span class="meta-label">🔔 Scheduled Reminder:</span>
        <span class="meta-val" style="color: #34D399;">Active (You will receive an alert email when due)</span>
      </div>
    </div>

    ${task.description ? `<div class="desc"><strong>Notes / Instructions:</strong><br>${task.description}</div>` : ""}

    <div class="footer">
      This task was scheduled on CR-Ship (localhost:3000).<br>
      Recipient: <strong>${recipient}</strong> • Class Representative Zohaib
    </div>
  </div>
</body>
</html>
`;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"CR-Ship Task Board" <${process.env.SMTP_USER || "crnexus@uaf.edu.pk"}>`,
      to: recipient,
      subject: `📝 [CR-Ship] Task Scheduled: ${task.title} (${dueDateTime})`,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    await prisma.auditLog.create({
      data: {
        module: "TASKS",
        action: "EMAIL_TASK_CREATED_SENT",
        summary: `Sent "Task Saved" email notification to ${recipient} for "${task.title}" (Mode: ${isLive ? "LIVE_SMTP" : "SIMULATED"})`,
        payload: JSON.stringify({
          recipient,
          isLive,
          taskTitle: task.title,
          messageId: info.messageId,
          previewUrl: previewUrl || null,
        }),
      },
    });

    return { success: true, isLive, messageId: info.messageId, previewUrl };
  } catch (error: any) {
    console.error("Failed to send task created email:", error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// 2. Send Urgent Email When Task Reminder Time Triggers
// ----------------------------------------------------
export async function sendTaskReminderEmail(task: {
  title: string;
  category?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  reminderTime?: string | null;
  description?: string | null;
}) {
  const recipient = DEFAULT_NOTIFICATION_EMAIL;
  const isLive = isLiveSmtpConfigured();

  const categoryName = task.category || "General";
  const priorityName = task.priority || "URGENT";
  const dueDateTime = `${task.dueDate || "Today"} ${task.reminderTime ? `at ${task.reminderTime}` : ""}`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C18; color: #FFFFFF; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #0E1529; border: 2px solid #EF4444; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3); }
    .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px; }
    .alarm-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 900; text-transform: uppercase; background: #EF4444; color: #FFFFFF; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }
    .priority { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #F59E0B; color: #000; margin-left: 8px; }
    .title { font-size: 22px; font-weight: 900; color: #FFFFFF; margin: 14px 0 6px 0; }
    .urgent-banner { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 14px; margin: 16px 0; text-align: center; }
    .meta-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; margin: 16px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-label { color: #94A3B8; font-weight: 600; }
    .meta-val { color: #F8FAFC; font-weight: 700; }
    .desc { background: rgba(255,255,255,0.03); border-left: 3px solid #EF4444; padding: 12px; font-size: 13px; color: #E2E8F0; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #64748B; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="alarm-badge">🚨 TIME IS UP: ALARM DUE NOW</span>
      <span class="priority">${priorityName}</span>
      <div class="title">${task.title}</div>
      <div style="font-size: 13px; color: #94A3B8;">BSCS 7th (E2) — Immediate Attention Required</div>
    </div>

    <div class="urgent-banner">
      <div style="font-size: 16px; font-weight: 900; color: #FCA5A5;">⏰ Action Deadline Arrived!</div>
      <div style="font-size: 12px; color: #FECACA; margin-top: 4px;">This reminder alarm was scheduled for <strong>${dueDateTime}</strong>.</div>
    </div>

    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">📁 Category:</span>
        <span class="meta-val">${categoryName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">⏰ Scheduled Due:</span>
        <span class="meta-val" style="color: #EF4444;">${dueDateTime}</span>
      </div>
      <div class="meta-row" style="margin-bottom: 0;">
        <span class="meta-label">📢 WhatsApp Broadcast:</span>
        <span class="meta-val" style="color: #10B981;">Ready to send to class in 1-click on Dashboard</span>
      </div>
    </div>

    ${task.description ? `<div class="desc"><strong>Instructions & Details:</strong><br>${task.description}</div>` : ""}

    <div class="footer">
      CR-Ship Real-Time Notification Engine.<br>
      Sent to <strong>${recipient}</strong> • Class Representative Zohaib
    </div>
  </div>
</body>
</html>
`;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"🚨 CR-Ship Alarm" <${process.env.SMTP_USER || "crnexus@uaf.edu.pk"}>`,
      to: recipient,
      subject: `🚨 [CR-Ship Alarm] ${task.title} (Due Now!)`,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    await prisma.auditLog.create({
      data: {
        module: "TASKS",
        action: "EMAIL_REMINDER_ALARM_SENT",
        summary: `Sent "Time is Up" reminder email alarm to ${recipient} for "${task.title}" (Mode: ${isLive ? "LIVE_SMTP" : "SIMULATED"})`,
        payload: JSON.stringify({
          recipient,
          isLive,
          taskTitle: task.title,
          messageId: info.messageId,
          previewUrl: previewUrl || null,
        }),
      },
    });

    return { success: true, isLive, messageId: info.messageId, previewUrl };
  } catch (error: any) {
    console.error("Failed to send reminder email:", error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// 3. Test Ping Email
// ----------------------------------------------------
export async function sendTestEmail(toEmail?: string) {
  const recipient = toEmail || DEFAULT_NOTIFICATION_EMAIL;
  const isLive = isLiveSmtpConfigured();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background-color: #080C18; color: #FFFFFF; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #0E1529; border: 1px solid #10B981; border-radius: 16px; padding: 24px; text-align: center; }
    .badge { background: #10B981; color: #000; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Connection Test</span>
    <h2 style="color: #FFFFFF; margin: 16px 0 8px 0;">CR-Ship Email System Online!</h2>
    <p style="color: #94A3B8; font-size: 13px; line-height: 1.5;">
      This confirms that your automatic email notification delivery system is active for <strong>${recipient}</strong>.<br>
      Delivery Mode: <strong>${isLive ? "Live Gmail SMTP" : "Local Test / Audit Engine"}</strong>.
    </p>
    <div style="font-size: 11px; color: #64748B; margin-top: 20px;">
      CR-Ship • Class Representative Zohaib (BSCS 7th E2, UAF)
    </div>
  </div>
</body>
</html>
`;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"CR-Ship Test" <${process.env.SMTP_USER || "crnexus@uaf.edu.pk"}>`,
      to: recipient,
      subject: `✅ [CR-Ship] Email Notification Test Ping for ${recipient}`,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    await prisma.auditLog.create({
      data: {
        module: "TASKS",
        action: "EMAIL_TEST_SENT",
        summary: `Sent test ping email to ${recipient} (Mode: ${isLive ? "LIVE_SMTP" : "SIMULATED"})`,
        payload: JSON.stringify({ recipient, isLive, messageId: info.messageId, previewUrl: previewUrl || null }),
      },
    });

    return { success: true, isLive, recipient, messageId: info.messageId, previewUrl };
  } catch (error: any) {
    console.error("Test email error:", error);
    return { success: false, error: error.message };
  }
}
