import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/logger";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let studentRows: { rollNo: string; name: string }[] = [];
    let sectionName = "BSCS 7th E2";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const customSection = formData.get("section") as string | null;
      if (customSection) sectionName = customSection;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Parse with XLSX
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Scan rows to find Roll Number / Ag Number and Name
      for (const row of data) {
        if (!Array.isArray(row) || row.length < 2) continue;

        let detectedRoll = "";
        let detectedName = "";

        // Check each cell in row
        for (let i = 0; i < row.length; i++) {
          const val = String(row[i] || "").trim();
          // Match standard Ag format like 2023-ag-10030 or 2022-ag-7815 or general pattern
          if (!detectedRoll && (val.toLowerCase().includes("ag-") || /^\d{4}-[a-z]+-\d+$/i.test(val))) {
            detectedRoll = val;
            // The name is typically the adjacent or next non-empty cell
            for (let j = i + 1; j < row.length; j++) {
              const nameCandidate = String(row[j] || "").trim();
              if (nameCandidate && isNaN(Number(nameCandidate)) && !nameCandidate.includes("ag-") && nameCandidate.length > 1) {
                detectedName = nameCandidate;
                break;
              }
            }
          }
        }

        // If not matched by 'ag-', check if column headers gave column 1 as roll and column 2 as name
        if (!detectedRoll && row.length >= 3) {
          const c1 = String(row[1] || "").trim();
          const c2 = String(row[2] || "").trim();
          if (c1.toLowerCase().includes("ag-") || /\d+/.test(c1)) {
            detectedRoll = c1;
            detectedName = c2;
          }
        }

        if (detectedRoll && detectedName && detectedName.toLowerCase() !== "name") {
          studentRows.push({
            rollNo: detectedRoll,
            name: detectedName,
          });
        }
      }
    } else {
      // JSON payload (e.g. pasted text or manual array)
      const body = await request.json();
      if (body.section) sectionName = body.section;
      if (Array.isArray(body.students)) {
        studentRows = body.students.filter(
          (s: any) => s.rollNo && s.name
        );
      }
    }

    if (studentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid students found in the uploaded file or data." },
        { status: 400 }
      );
    }

    // Upsert into database
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of studentRows) {
      const roll = item.rollNo.trim();
      const nm = item.name.trim();

      const existing = await prisma.student.findUnique({
        where: { rollNo: roll },
      });

      if (existing) {
        await prisma.student.update({
          where: { rollNo: roll },
          data: { name: nm, section: sectionName },
        });
        updatedCount++;
      } else {
        await prisma.student.create({
          data: {
            rollNo: roll,
            name: nm,
            section: sectionName,
          },
        });
        createdCount++;
      }
    }

    await logAudit({
      module: "STUDENTS",
      action: "IMPORT",
      summary: `Bulk imported ${createdCount + updatedCount} students into ${sectionName} (${createdCount} created, ${updatedCount} updated)`,
      payload: {
        total: createdCount + updatedCount,
        created: createdCount,
        updated: updatedCount,
        section: sectionName,
      },
    });

    return NextResponse.json({
      success: true,
      total: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      section: sectionName,
    });
  } catch (error: any) {
    console.error("POST /api/students/import error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to import students" },
      { status: 500 }
    );
  }
}
