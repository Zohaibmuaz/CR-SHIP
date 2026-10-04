import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const section = searchParams.get("section")?.trim() || "";

    const where: any = {};
    if (section && section !== "ALL") {
      where.section = section;
    }
    if (search) {
      where.OR = [
        { rollNo: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { rollNo: "asc" },
    });

    return NextResponse.json({ success: true, students, count: students.length });
  } catch (error: any) {
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rollNo, name, section = "BSCS 7th E2" } = body;

    if (!rollNo || !name) {
      return NextResponse.json(
        { success: false, error: "Ag Number and Student Name are required." },
        { status: 400 }
      );
    }

    const trimmedRollNo = rollNo.trim();
    const trimmedName = name.trim();

    // Check if student with rollNo already exists
    const existing = await prisma.student.findUnique({
      where: { rollNo: trimmedRollNo },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Student with Ag Number ${trimmedRollNo} already exists.` },
        { status: 409 }
      );
    }

    const student = await prisma.student.create({
      data: {
        rollNo: trimmedRollNo,
        name: trimmedName,
        section,
      },
    });

    await logAudit({
      module: "STUDENTS",
      action: "CREATE",
      summary: `Added student ${student.name} (${student.rollNo})`,
      payload: { id: student.id, rollNo: student.rollNo, name: student.name, section: student.section },
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error("POST /api/students error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create student" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, rollNo, name, section } = body;

    if (!id || !rollNo || !name) {
      return NextResponse.json(
        { success: false, error: "Student ID, Ag Number, and Name are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        rollNo: rollNo.trim(),
        name: name.trim(),
        ...(section ? { section } : {}),
      },
    });

    await logAudit({
      module: "STUDENTS",
      action: "UPDATE",
      summary: `Updated student ${updated.name} (${updated.rollNo})`,
      payload: { id: updated.id, rollNo: updated.rollNo, name: updated.name },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    console.error("PUT /api/students error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found." },
        { status: 404 }
      );
    }

    await prisma.student.delete({
      where: { id: Number(id) },
    });

    await logAudit({
      module: "STUDENTS",
      action: "DELETE",
      summary: `Deleted student ${student.name} (${student.rollNo})`,
      payload: { id: student.id, rollNo: student.rollNo, name: student.name },
    });

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/students error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete student" },
      { status: 500 }
    );
  }
}
