import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// DELETE: Remove a member from a group (moves student back to unassigned)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupIdParam = searchParams.get("groupId");
    const studentIdParam = searchParams.get("studentId");

    if (!groupIdParam || !studentIdParam) {
      return NextResponse.json(
        { success: false, error: "groupId and studentId are required" },
        { status: 400 }
      );
    }

    const groupId = parseInt(groupIdParam, 10);
    const studentId = parseInt(studentIdParam, 10);

    const member = await prisma.groupMember.findFirst({
      where: { groupId, studentId },
      include: { student: true, group: { include: { subject: true } } },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found in group" }, { status: 404 });
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    await prisma.auditLog.create({
      data: {
        module: "GROUPS",
        action: "GROUP_MEMBER_REMOVED",
        summary: `Removed ${member.student.name} from ${member.group.groupName} (${member.group.subject.code})`,
        payload: JSON.stringify({ groupId, studentId, studentName: member.student.name }),
      },
    });

    return NextResponse.json({ success: true, message: "Member removed from group" });
  } catch (error: any) {
    console.error("Group member DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
