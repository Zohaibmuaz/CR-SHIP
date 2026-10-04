import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch materials for subject, subjects list, category stats, and master drive link
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdParam = searchParams.get("subjectId");

    // 1. Fetch all subjects with material counts
    const allSubjectsRaw = await prisma.subject.findMany({
      include: {
        teacher: true,
        materials: {
          select: { id: true, category: true },
        },
      },
      orderBy: { id: "asc" },
    });

    if (allSubjectsRaw.length === 0) {
      return NextResponse.json({
        success: true,
        allSubjects: [],
        activeSubject: null,
        activeSubjectId: null,
        mainDriveLink: "",
        materials: [],
        categoryCounts: { total: 0, SLIDES: 0, BOOKS: 0, HANDOUTS: 0, PAST_PAPERS: 0, ASSIGNMENTS: 0 },
      });
    }

    // Determine active subject
    let activeSubjectId = subjectIdParam
      ? parseInt(subjectIdParam, 10)
      : allSubjectsRaw[0].id;

    let activeSubject = allSubjectsRaw.find((s) => s.id === activeSubjectId) || allSubjectsRaw[0];
    activeSubjectId = activeSubject.id;

    // Parse mainDriveLink from customFields
    let mainDriveLink = "";
    try {
      if (activeSubject.customFields) {
        const parsed = JSON.parse(activeSubject.customFields);
        if (parsed.mainDriveLink) {
          mainDriveLink = parsed.mainDriveLink;
        }
      }
    } catch (e) {}

    // 2. Fetch materials for active subject
    const materials = await prisma.courseMaterial.findMany({
      where: { subjectId: activeSubjectId },
      orderBy: { id: "desc" },
    });

    // 3. Category Counts
    const categoryCounts = {
      total: materials.length,
      SLIDES: materials.filter((m) => m.category === "SLIDES").length,
      BOOKS: materials.filter((m) => m.category === "BOOKS").length,
      HANDOUTS: materials.filter((m) => m.category === "HANDOUTS").length,
      PAST_PAPERS: materials.filter((m) => m.category === "PAST_PAPERS").length,
      ASSIGNMENTS: materials.filter((m) => m.category === "ASSIGNMENTS").length,
    };

    const allSubjects = allSubjectsRaw.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      creditHours: s.creditHours,
      teacherName: s.teacher?.name || "Unassigned",
      totalMaterials: s.materials.length,
    }));

    return NextResponse.json({
      success: true,
      allSubjects,
      activeSubjectId,
      activeSubject: {
        id: activeSubject.id,
        code: activeSubject.code,
        name: activeSubject.name,
        creditHours: activeSubject.creditHours,
        teacherName: activeSubject.teacher?.name || "Unassigned",
        mainDriveLink,
      },
      mainDriveLink,
      materials,
      categoryCounts,
    });
  } catch (error: any) {
    console.error("Materials GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

// POST: Add Material, Bulk Add, or Set Main Drive Link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ----------------------------------------------------
    // Action A: Add Single Material
    // ----------------------------------------------------
    if (action === "ADD_MATERIAL" || !action) {
      const { subjectId, title, category, linkOrPath, description } = body;

      if (!subjectId || !title || !linkOrPath) {
        return NextResponse.json(
          { success: false, error: "Subject, title, and link are required" },
          { status: 400 }
        );
      }

      const pSubjectId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: pSubjectId } });

      const material = await prisma.courseMaterial.create({
        data: {
          subjectId: pSubjectId,
          title: title.trim(),
          category: (category || "SLIDES").toUpperCase().trim(),
          linkOrPath: linkOrPath.trim(),
          description: description?.trim() || null,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          module: "MATERIALS",
          action: "MATERIAL_ADDED",
          summary: `Added ${material.category} "${material.title}" to ${subject?.code || "Subject"}`,
          payload: JSON.stringify({
            materialId: material.id,
            subjectId: pSubjectId,
            title: material.title,
            category: material.category,
            link: material.linkOrPath,
          }),
        },
      });

      return NextResponse.json({ success: true, material });
    }

    // ----------------------------------------------------
    // Action B: Bulk Add Parsed Materials (From Raw Text Parser)
    // ----------------------------------------------------
    if (action === "BULK_ADD") {
      const { subjectId, items } = body;

      if (!subjectId || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: "subjectId and items array are required" },
          { status: 400 }
        );
      }

      const defaultSubId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: defaultSubId } });

      const createdItems = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const item of items) {
          const targetSubId = item.subjectId ? parseInt(item.subjectId, 10) : defaultSubId;
          const created = await tx.courseMaterial.create({
            data: {
              subjectId: targetSubId,
              title: item.title?.trim() || "Untitled Material",
              category: (item.category || "SLIDES").toUpperCase().trim(),
              linkOrPath: item.linkOrPath?.trim() || "",
              description: item.description?.trim() || null,
            },
          });
          results.push(created);
        }

        // Consolidated Audit Log
        await tx.auditLog.create({
          data: {
            module: "MATERIALS",
            action: "MATERIALS_BULK_ORGANIZED",
            summary: `Auto-organized and saved ${items.length} study materials for ${subject?.code || "Subject"}`,
            payload: JSON.stringify({
              subjectId: defaultSubId,
              count: items.length,
              items: items.map((i: any) => ({ title: i.title, category: i.category })),
            }),
          },
        });

        return results;
      });

      return NextResponse.json({
        success: true,
        message: `Successfully organized and saved ${createdItems.length} materials`,
        count: createdItems.length,
      });
    }

    // ----------------------------------------------------
    // Action C: Set Master Google Drive Folder Link for Subject
    // ----------------------------------------------------
    if (action === "SET_MAIN_DRIVE") {
      const { subjectId, mainDriveLink } = body;

      if (!subjectId) {
        return NextResponse.json({ success: false, error: "subjectId is required" }, { status: 400 });
      }

      const pSubjectId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: pSubjectId } });

      let currentCustom: any = {};
      try {
        if (subject?.customFields) {
          currentCustom = JSON.parse(subject.customFields);
        }
      } catch (e) {}

      currentCustom.mainDriveLink = (mainDriveLink || "").trim();

      await prisma.subject.update({
        where: { id: pSubjectId },
        data: {
          customFields: JSON.stringify(currentCustom),
        },
      });

      await prisma.auditLog.create({
        data: {
          module: "MATERIALS",
          action: "MAIN_DRIVE_FOLDER_UPDATED",
          summary: `Updated Master Google Drive Folder Link for ${subject?.code || "Subject"}`,
          payload: JSON.stringify({ subjectId: pSubjectId, link: currentCustom.mainDriveLink }),
        },
      });

      return NextResponse.json({
        success: true,
        mainDriveLink: currentCustom.mainDriveLink,
        message: "Master Drive link updated successfully",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Materials POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process materials request" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing material
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, category, linkOrPath, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Material id is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.courseMaterial.findUnique({
      where: { id: pId },
      include: { subject: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Material not found" }, { status: 404 });
    }

    const updated = await prisma.courseMaterial.update({
      where: { id: pId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        category: category !== undefined ? category.toUpperCase().trim() : undefined,
        linkOrPath: linkOrPath !== undefined ? linkOrPath.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        module: "MATERIALS",
        action: "MATERIAL_UPDATED",
        summary: `Updated material "${updated.title}" (${existing.subject.code})`,
        payload: JSON.stringify({ id: pId, title: updated.title, category: updated.category }),
      },
    });

    return NextResponse.json({ success: true, material: updated });
  } catch (error: any) {
    console.error("Materials PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update material" },
      { status: 500 }
    );
  }
}

// DELETE: Delete single material or clear subject materials
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");
    const clearAll = searchParams.get("clearAll");

    if (clearAll === "true" && subjectId) {
      const pSubId = parseInt(subjectId, 10);
      const subject = await prisma.subject.findUnique({ where: { id: pSubId } });

      const count = await prisma.courseMaterial.deleteMany({
        where: { subjectId: pSubId },
      });

      await prisma.auditLog.create({
        data: {
          module: "MATERIALS",
          action: "MATERIALS_CLEARED",
          summary: `Cleared all ${count.count} materials for ${subject?.code || "Subject"}`,
          payload: JSON.stringify({ subjectId: pSubId, deletedCount: count.count }),
        },
      });

      return NextResponse.json({ success: true, message: `Cleared ${count.count} materials` });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Material id is required" }, { status: 400 });
    }

    const pId = parseInt(id, 10);
    const existing = await prisma.courseMaterial.findUnique({
      where: { id: pId },
      include: { subject: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Material not found" }, { status: 404 });
    }

    await prisma.courseMaterial.delete({
      where: { id: pId },
    });

    await prisma.auditLog.create({
      data: {
        module: "MATERIALS",
        action: "MATERIAL_DELETED",
        summary: `Deleted material "${existing.title}" (${existing.subject.code})`,
        payload: JSON.stringify({ id: pId, title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: "Material deleted successfully" });
  } catch (error: any) {
    console.error("Materials DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete material" },
      { status: 500 }
    );
  }
}
