import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slots, section = "BSCS 7th E2" } = body;

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: "No slots provided to merge." },
        { status: 400 }
      );
    }

    // Capture previous state for audit log snapshot
    const previousSlots = await prisma.timetableSlot.findMany();

    // Replace all slots for this section
    await prisma.timetableSlot.deleteMany({
      where: {
        OR: [{ section }, { section: null }],
      },
    });

    const created = [];
    for (const s of slots) {
      const newSlot = await prisma.timetableSlot.create({
        data: {
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectName: s.subjectName,
          room: s.room,
          teacherName: s.teacherName || "Pending",
          type: s.type || "LECTURE",
          section,
          status: "SCHEDULED",
        },
      });
      created.push(newSlot);
    }

    await logAudit({
      module: "TIMETABLE",
      action: "DIFF_MERGE",
      summary: `Applied & Merged University Master Excel Timetable (${created.length} active classes)`,
      payload: {
        totalMerged: created.length,
        section,
        previousCount: previousSlots.length,
        newSchedule: created,
      },
    });

    return NextResponse.json({
      success: true,
      count: created.length,
      slots: created,
    });
  } catch (error: any) {
    console.error("POST /api/timetable/merge error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to merge timetable" },
      { status: 500 }
    );
  }
}
