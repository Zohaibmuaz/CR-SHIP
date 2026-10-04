import { prisma } from "./prisma";

export type AuditModule =
  | "SYSTEM"
  | "TIMETABLE"
  | "ATTENDANCE"
  | "GROUPS"
  | "MATERIALS"
  | "FACULTY"
  | "TASKS"
  | "STUDENTS";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "EXPORT"
  | "DIFF_MERGE"
  | "SYNC";

interface LogParams {
  module: AuditModule;
  action: AuditAction;
  summary: string;
  payload?: any;
}

export async function logAudit({ module, action, summary, payload }: LogParams) {
  try {
    const serializedPayload = payload ? JSON.stringify(payload) : null;
    return await prisma.auditLog.create({
      data: {
        module,
        action,
        summary,
        payload: serializedPayload,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return null;
  }
}
