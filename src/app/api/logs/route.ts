import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const moduleFilter = searchParams.get("module") || "";
    const format = searchParams.get("format") || "json";
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    const where: any = {};
    if (moduleFilter && moduleFilter !== "ALL") {
      where.module = moduleFilter;
    }
    if (search.trim()) {
      where.OR = [
        { summary: { contains: search } },
        { action: { contains: search } },
        { module: { contains: search } },
        { payload: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: format === "csv" ? 1000 : limit,
    });

    if (format === "csv") {
      const dateStr = new Date().toISOString().split("T")[0];
      const csvHeader = "ID,Timestamp,Module,Action,Summary\n";
      const csvRows = logs.map((l) => {
        const cleanSummary = (l.summary || "").replace(/"/g, '""');
        return `${l.id},"${new Date(l.timestamp).toLocaleString()}","${l.module}","${l.action}","${cleanSummary}"`;
      }).join("\n");

      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cr_nexus_audit_logs_${dateStr}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { module, action, summary, payload } = body;

    const newLog = await prisma.auditLog.create({
      data: {
        module: module || "SYSTEM",
        action: action || "EVENT",
        summary: summary || "General action logged",
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    return NextResponse.json({ success: true, log: newLog });
  } catch (error) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}
