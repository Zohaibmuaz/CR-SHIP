import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Quick test query to ensure SQLite is working
    const studentCount = await prisma.student.count();
    const subjectCount = await prisma.subject.count();
    const logsCount = await prisma.auditLog.count();

    return NextResponse.json({
      status: "ONLINE",
      database: "SQLite Connected",
      stats: {
        students: studentCount,
        subjects: subjectCount,
        logs: logsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("System health check failed:", error);
    return NextResponse.json(
      {
        status: "ERROR",
        database: "Disconnected",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
