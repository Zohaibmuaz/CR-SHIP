import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch groups, unassigned students, and subjects for the group builder
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");

    // 1. Fetch all 6 official subjects with group count
    const allSubjects = await prisma.subject.findMany({
      include: {
        teacher: true,
        groups: {
          select: { id: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const subjectsSummary = allSubjects.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      creditHours: s.creditHours,
      teacherName: s.teacher?.name || "Pending Faculty",
      totalGroups: s.groups.length,
    }));

    const activeSubjectId = subjectIdParam
      ? parseInt(subjectIdParam, 10)
      : allSubjects[0]?.id || 1;

    const activeSubject = allSubjects.find((s) => s.id === activeSubjectId) || allSubjects[0];

    // 2. Fetch all registered students (63 students)
    const allStudents = await prisma.student.findMany({
      orderBy: { id: "asc" },
    });

    // 3. Fetch groups for this active subject
    const groups = await prisma.studentGroup.findMany({
      where: { subjectId: activeSubjectId },
      include: {
        members: {
          include: {
            student: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { groupNumber: "asc" },
    });

    // 4. Determine assigned vs unassigned students for this subject
    const assignedStudentIds = new Set<number>();
    groups.forEach((g) => {
      g.members.forEach((m) => {
        assignedStudentIds.add(m.studentId);
      });
    });

    const unassignedStudents = allStudents.filter(
      (st) => !assignedStudentIds.has(st.id)
    );

    let maxMembers = 4;
    try {
      if (activeSubject.customFields) {
        const parsed = JSON.parse(activeSubject.customFields);
        if (parsed.maxMembers) maxMembers = parseInt(parsed.maxMembers, 10);
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      activeSubjectId,
      maxMembers,
      activeSubject: {
        id: activeSubject.id,
        code: activeSubject.code,
        name: activeSubject.name,
        creditHours: activeSubject.creditHours,
        teacherName: activeSubject.teacher?.name || "Pending Faculty",
        maxMembers,
      },
      allSubjects: subjectsSummary,
      groups: groups.map((g) => ({
        id: g.id,
        subjectId: g.subjectId,
        groupNumber: g.groupNumber,
        groupName: g.groupName,
        topic: g.topic || "",
        members: g.members.map((m) => ({
          memberId: m.id,
          studentId: m.student.id,
          regNo: m.student.rollNo,
          name: m.student.name,
        })),
      })),
      allStudents: allStudents.map((s, idx) => ({
        id: s.id,
        srNo: idx + 1,
        regNo: s.rollNo,
        name: s.name,
      })),
      unassignedStudents: unassignedStudents.map((s) => {
        const fullIndex = allStudents.findIndex((st) => st.id === s.id);
        return {
          id: s.id,
          srNo: fullIndex + 1,
          regNo: s.rollNo,
          name: s.name,
        };
      }),
      stats: {
        totalStudents: allStudents.length,
        assignedCount: assignedStudentIds.size,
        unassignedCount: unassignedStudents.length,
        totalGroups: groups.length,
      },
    });
  } catch (error: any) {
    console.error("Groups GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST: Handles Create Single Group, Bulk Import from Raw Text, Add Member, Move Member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // Action A: Create a Single Empty Group
    // ----------------------------------------------------
    if (action === "CREATE_GROUP") {
      const { subjectId, groupName, topic } = body;
      if (!subjectId) {
        return NextResponse.json({ success: false, error: "subjectId is required" }, { status: 400 });
      }

      // Find highest groupNumber currently
      const existing = await prisma.studentGroup.findMany({
        where: { subjectId: parseInt(subjectId, 10) },
        orderBy: { groupNumber: "desc" },
        take: 1,
      });

      const nextNumber = existing.length > 0 ? existing[0].groupNumber + 1 : 1;
      const finalName = groupName?.trim() || `Group ${nextNumber}`;

      const created = await prisma.studentGroup.create({
        data: {
          subjectId: parseInt(subjectId, 10),
          groupNumber: nextNumber,
          groupName: finalName,
          topic: topic?.trim() || null,
        },
        include: { members: { include: { student: true } } },
      });

      const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId, 10) } });
      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "GROUP_CREATED",
          summary: `Created ${finalName} for ${subject?.code || "Subject"}`,
          payload: JSON.stringify({ groupId: created.id, groupNumber: nextNumber, subjectId }),
        },
      });

      return NextResponse.json({ success: true, group: created });
    }

    // ----------------------------------------------------
    // Action B: Bulk Import Groups from Raw Text Parser
    // ----------------------------------------------------
    if (action === "BULK_IMPORT") {
      const { subjectId, groups, replaceExisting } = body;
      if (!subjectId || !Array.isArray(groups)) {
        return NextResponse.json(
          { success: false, error: "subjectId and groups array are required" },
          { status: 400 }
        );
      }

      const parsedSubId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: parsedSubId } });

      await prisma.$transaction(async (tx) => {
        if (replaceExisting) {
          // Delete existing groups for this subject
          await tx.studentGroup.deleteMany({
            where: { subjectId: parsedSubId },
          });
        }

        // Get starting group number if appending
        let nextGroupNum = 1;
        if (!replaceExisting) {
          const currentMax = await tx.studentGroup.findMany({
            where: { subjectId: parsedSubId },
            orderBy: { groupNumber: "desc" },
            take: 1,
          });
          if (currentMax.length > 0) {
            nextGroupNum = currentMax[0].groupNumber + 1;
          }
        }

        for (const grp of groups) {
          const groupNum = grp.groupNumber || nextGroupNum;
          const groupName = grp.groupName?.trim() || `Group ${groupNum}`;
          const topic = grp.topic?.trim() || null;

          const createdGroup = await tx.studentGroup.create({
            data: {
              subjectId: parsedSubId,
              groupNumber: groupNum,
              groupName,
              topic,
            },
          });

          if (Array.isArray(grp.studentIds) && grp.studentIds.length > 0) {
            // Remove students from any other group in this subject first to prevent duplicates
            const studentIdsInt = grp.studentIds.map((id: any) => parseInt(id, 10));
            await tx.groupMember.deleteMany({
              where: {
                studentId: { in: studentIdsInt },
                group: { subjectId: parsedSubId },
              },
            });

            await tx.groupMember.createMany({
              data: studentIdsInt.map((sid: number) => ({
                groupId: createdGroup.id,
                studentId: sid,
                role: "MEMBER",
              })),
            });
          }

          nextGroupNum = Math.max(nextGroupNum + 1, groupNum + 1);
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            module: "GROUPS",
            action: "GROUPS_BULK_IMPORTED",
            summary: `Imported ${groups.length} groups for ${subject?.code || "Subject"} (Replace: ${!!replaceExisting})`,
            payload: JSON.stringify({
              subjectId: parsedSubId,
              subjectCode: subject?.code,
              importedCount: groups.length,
              replaceExisting: !!replaceExisting,
            }),
          },
        });
      });

      return NextResponse.json({ success: true, message: `Successfully imported ${groups.length} groups` });
    }

    // ----------------------------------------------------
    // Action C: Add Member to Group
    // ----------------------------------------------------
    if (action === "ADD_MEMBER") {
      const { groupId, studentId, subjectId, maxMembers } = body;
      if (!groupId || !studentId) {
        return NextResponse.json({ success: false, error: "groupId and studentId are required" }, { status: 400 });
      }

      const pGroupId = parseInt(groupId, 10);
      const pStudentId = parseInt(studentId, 10);
      const pSubjectId = subjectId ? parseInt(subjectId, 10) : undefined;

      // Check maxMembers capacity constraint if provided
      if (maxMembers) {
        const count = await prisma.groupMember.count({ where: { groupId: pGroupId } });
        if (count >= parseInt(maxMembers, 10)) {
          return NextResponse.json(
            { success: false, error: `This group has reached the maximum capacity of ${maxMembers} members.` },
            { status: 400 }
          );
        }
      }

      // If student is already in another group in this subject, remove them from that group first
      if (pSubjectId) {
        await prisma.groupMember.deleteMany({
          where: {
            studentId: pStudentId,
            group: { subjectId: pSubjectId },
          },
        });
      }

      // Check if already in this group
      const existing = await prisma.groupMember.findFirst({
        where: { groupId: pGroupId, studentId: pStudentId },
      });

      if (existing) {
        return NextResponse.json({ success: true, member: existing });
      }

      const member = await prisma.groupMember.create({
        data: {
          groupId: pGroupId,
          studentId: pStudentId,
          role: "MEMBER",
        },
        include: { student: true, group: true },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "GROUP_MEMBER_ADDED",
          summary: `Added ${member.student.name} to ${member.group.groupName}`,
          payload: JSON.stringify({ groupId: pGroupId, studentId: pStudentId }),
        },
      });

      return NextResponse.json({ success: true, member });
    }

    // ----------------------------------------------------
    // Action D: Move Member (Drag & Drop between groups or unassigned)
    // ----------------------------------------------------
    if (action === "MOVE_MEMBER") {
      const { studentId, toGroupId, subjectId, maxMembers } = body;
      if (!studentId || !toGroupId) {
        return NextResponse.json(
          { success: false, error: "studentId and toGroupId are required" },
          { status: 400 }
        );
      }

      const pStudentId = parseInt(studentId, 10);
      const pToGroupId = parseInt(toGroupId, 10);
      const pSubjectId = subjectId ? parseInt(subjectId, 10) : undefined;

      // Check capacity of target group
      if (maxMembers) {
        const targetCount = await prisma.groupMember.count({ where: { groupId: pToGroupId } });
        if (targetCount >= parseInt(maxMembers, 10)) {
          return NextResponse.json(
            { success: false, error: `Target group has reached the maximum capacity of ${maxMembers} members.` },
            { status: 400 }
          );
        }
      }

      // Remove from any group in this subject
      if (pSubjectId) {
        await prisma.groupMember.deleteMany({
          where: {
            studentId: pStudentId,
            group: { subjectId: pSubjectId },
          },
        });
      } else {
        await prisma.groupMember.deleteMany({
          where: { studentId: pStudentId },
        });
      }

      // Add to new group
      const member = await prisma.groupMember.create({
        data: {
          groupId: pToGroupId,
          studentId: pStudentId,
          role: "MEMBER",
        },
        include: { student: true, group: true },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "GROUP_MEMBER_MOVED",
          summary: `Moved ${member.student.name} to ${member.group.groupName}`,
          payload: JSON.stringify({ studentId: pStudentId, toGroupId: pToGroupId }),
        },
      });

      return NextResponse.json({ success: true, member });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Groups POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process group request" },
      { status: 500 }
    );
  }
}

// PUT: Update Group (Topic, Name) OR Re-number / Re-order Groups
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // Action A: Update Single Group Name or Topic
    // ----------------------------------------------------
    if (action === "UPDATE_GROUP") {
      const { groupId, groupName, topic } = body;
      if (!groupId) {
        return NextResponse.json({ success: false, error: "groupId is required" }, { status: 400 });
      }

      const pGroupId = parseInt(groupId, 10);
      const updated = await prisma.studentGroup.update({
        where: { id: pGroupId },
        data: {
          groupName: groupName !== undefined ? groupName.trim() : undefined,
          topic: topic !== undefined ? topic.trim() : undefined,
        },
        include: { subject: true },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "GROUP_UPDATED",
          summary: `Updated topic/name for ${updated.groupName} (${updated.subject.code}): "${updated.topic || "No topic"}"`,
          payload: JSON.stringify({ groupId: pGroupId, groupName: updated.groupName, topic: updated.topic }),
        },
      });

      return NextResponse.json({ success: true, group: updated });
    }

    // ----------------------------------------------------
    // Action B: Renumber & Reorder Groups via Drag & Drop
    // ----------------------------------------------------
    if (action === "REORDER_GROUPS") {
      const { subjectId, orderedGroupIds } = body;
      if (!subjectId || !Array.isArray(orderedGroupIds)) {
        return NextResponse.json(
          { success: false, error: "subjectId and orderedGroupIds array are required" },
          { status: 400 }
        );
      }

      const pSubId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: pSubId } });

      await prisma.$transaction(async (tx) => {
        // Update each group's groupNumber and groupName sequentially
        for (let i = 0; i < orderedGroupIds.length; i++) {
          const gId = parseInt(orderedGroupIds[i], 10);
          const newNumber = i + 1;
          await tx.studentGroup.update({
            where: { id: gId },
            data: {
              groupNumber: newNumber,
              groupName: `Group ${newNumber}`,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            module: "GROUPS",
            action: "GROUPS_RENUMBERED",
            summary: `Renumbered ${orderedGroupIds.length} groups for ${subject?.code || "Subject"}`,
            payload: JSON.stringify({ subjectId: pSubId, count: orderedGroupIds.length }),
          },
        });
      });

      return NextResponse.json({ success: true, message: "Groups renumbered successfully" });
    }

    // ----------------------------------------------------
    // Action C: Update Subject Max Members Limit
    // ----------------------------------------------------
    if (action === "UPDATE_SUBJECT_MAX_MEMBERS") {
      const { subjectId, maxMembers } = body;
      if (!subjectId || !maxMembers) {
        return NextResponse.json({ success: false, error: "subjectId and maxMembers required" }, { status: 400 });
      }

      const pSubId = parseInt(subjectId, 10);
      const sub = await prisma.subject.findUnique({ where: { id: pSubId } });
      let currentData: any = {};
      try {
        if (sub?.customFields) currentData = JSON.parse(sub.customFields);
      } catch (e) {}

      currentData.maxMembers = parseInt(maxMembers, 10);

      await prisma.subject.update({
        where: { id: pSubId },
        data: { customFields: JSON.stringify(currentData) },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "SUBJECT_MAX_MEMBERS_UPDATED",
          summary: `Updated max group members limit for ${sub?.code} to ${maxMembers}`,
          payload: JSON.stringify({ subjectId: pSubId, maxMembers }),
        },
      });

      return NextResponse.json({ success: true, maxMembers: currentData.maxMembers });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Groups PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update group" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a group or reset all groups for a subject
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupIdParam = searchParams.get("groupId");
    const subjectIdParam = searchParams.get("subjectId");
    const resetAll = searchParams.get("all") === "true";

    // Delete single group
    if (groupIdParam) {
      const groupId = parseInt(groupIdParam, 10);
      const group = await prisma.studentGroup.findUnique({
        where: { id: groupId },
        include: { subject: true, members: true },
      });

      if (!group) {
        return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
      }

      await prisma.studentGroup.delete({
        where: { id: groupId },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "GROUP_DELETED",
          summary: `Deleted ${group.groupName} (${group.subject.code}). ${group.members.length} students moved to unassigned pool.`,
          payload: JSON.stringify({ groupId, groupName: group.groupName, subjectCode: group.subject.code }),
        },
      });

      return NextResponse.json({ success: true, message: "Group deleted" });
    }

    // Reset all groups for a subject
    if (subjectIdParam && resetAll) {
      const subjectId = parseInt(subjectIdParam, 10);
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

      const deleted = await prisma.studentGroup.deleteMany({
        where: { subjectId },
      });

      await prisma.auditLog.create({
        data: {
          module: "GROUPS",
          action: "ALL_GROUPS_RESET",
          summary: `Reset all ${deleted.count} groups for ${subject?.code || "Subject"}. All students unassigned.`,
          payload: JSON.stringify({ subjectId, deletedCount: deleted.count }),
        },
      });

      return NextResponse.json({ success: true, message: `Reset ${deleted.count} groups` });
    }

    return NextResponse.json({ success: false, error: "groupId or (subjectId and all=true) required" }, { status: 400 });
  } catch (error: any) {
    console.error("Groups DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete group" },
      { status: 500 }
    );
  }
}
