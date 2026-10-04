import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/logger";

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "";

    const where: any = {};
    if (section && section !== "ALL") {
      where.section = section;
    }

    const slots = await prisma.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Sort by standard week day order
    slots.sort((a, b) => {
      const orderA = DAY_ORDER[a.dayOfWeek] || 99;
      const orderB = DAY_ORDER[b.dayOfWeek] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error("GET /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dayOfWeek,
      startTime,
      endTime,
      subjectName,
      room,
      teacherName,
      type = "LECTURE",
      section = "BSCS 7th E2",
    } = body;

    if (!dayOfWeek || !startTime || !endTime || !subjectName || !room) {
      return NextResponse.json(
        { success: false, error: "Day, Start Time, End Time, Subject, and Room are required." },
        { status: 400 }
      );
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        dayOfWeek,
        startTime,
        endTime,
        subjectName,
        room,
        teacherName: teacherName || "Pending",
        type,
        section,
        status: "SCHEDULED",
      },
    });

    await logAudit({
      module: "TIMETABLE",
      action: "CREATE",
      summary: `Added ${slot.dayOfWeek} ${slot.subjectName} (${slot.startTime}-${slot.endTime}) in ${slot.room}`,
      payload: slot,
    });

    return NextResponse.json({ success: true, slot });
  } catch (error: any) {
    console.error("POST /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create slot" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, dayOfWeek, startTime, endTime, subjectName, room, teacherName, type, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Slot ID is required." }, { status: 400 });
    }

    const existing = await prisma.timetableSlot.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Slot not found." }, { status: 404 });
    }

    const updated = await prisma.timetableSlot.update({
      where: { id: Number(id) },
      data: {
        ...(dayOfWeek ? { dayOfWeek } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(subjectName ? { subjectName } : {}),
        ...(room ? { room } : {}),
        ...(teacherName !== undefined ? { teacherName } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
    });

    await logAudit({
      module: "TIMETABLE",
      action: "UPDATE",
      summary: `Updated ${updated.dayOfWeek} ${updated.subjectName} (Room: ${updated.room}, Time: ${updated.startTime}-${updated.endTime})`,
      payload: { before: existing, after: updated },
    });

    return NextResponse.json({ success: true, slot: updated });
  } catch (error: any) {
    console.error("PUT /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update slot" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Slot ID is required." }, { status: 400 });
    }

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: Number(id) },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: "Slot not found." }, { status: 404 });
    }

    await prisma.timetableSlot.delete({
      where: { id: Number(id) },
    });

    await logAudit({
      module: "TIMETABLE",
      action: "DELETE",
      summary: `Deleted ${slot.dayOfWeek} ${slot.subjectName} in ${slot.room}`,
      payload: slot,
    });

    return NextResponse.json({ success: true, message: "Slot deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/timetable error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete slot" },
      { status: 500 }
    );
  }
}
