const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 [CR-Ship] Starting database seed routine...");

  const seedPath = path.join(__dirname, "seed_data.json");
  if (!fs.existsSync(seedPath)) {
    console.warn("⚠️ No seed_data.json found. Skipping seeding.");
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  // 1. Teachers
  if (Array.isArray(seedData.teachers)) {
    console.log(`Seeding ${seedData.teachers.length} faculty profiles...`);
    for (const t of seedData.teachers) {
      await prisma.teacher.upsert({
        where: { id: t.id },
        update: {
          name: t.name,
          phone: t.phone,
          email: t.email,
          office: t.office,
          customFields: t.customFields,
        },
        create: {
          id: t.id,
          name: t.name,
          phone: t.phone,
          email: t.email,
          office: t.office,
          customFields: t.customFields,
        },
      });
    }
  }

  // 2. Subjects
  if (Array.isArray(seedData.subjects)) {
    console.log(`Seeding ${seedData.subjects.length} official courses...`);
    for (const s of seedData.subjects) {
      await prisma.subject.upsert({
        where: { code: s.code },
        update: {
          name: s.name,
          creditHours: s.creditHours,
          teacherId: s.teacherId,
          customFields: s.customFields,
        },
        create: {
          id: s.id,
          code: s.code,
          name: s.name,
          creditHours: s.creditHours,
          teacherId: s.teacherId,
          customFields: s.customFields,
        },
      });
    }
  }

  // 3. Students
  if (Array.isArray(seedData.students)) {
    console.log(`Seeding ${seedData.students.length} students roster...`);
    for (const st of seedData.students) {
      await prisma.student.upsert({
        where: { rollNo: st.rollNo },
        update: {
          name: st.name,
          phone: st.phone,
          email: st.email,
          section: st.section || "BSCS 7th E2",
          customFields: st.customFields,
        },
        create: {
          id: st.id,
          rollNo: st.rollNo,
          name: st.name,
          phone: st.phone,
          email: st.email,
          section: st.section || "BSCS 7th E2",
          customFields: st.customFields,
        },
      });
    }
  }

  // 4. Timetable Slots
  if (Array.isArray(seedData.timetableSlots)) {
    console.log(`Seeding ${seedData.timetableSlots.length} weekly timetable slots...`);
    for (const slot of seedData.timetableSlots) {
      await prisma.timetableSlot.upsert({
        where: { id: slot.id },
        update: {
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: slot.subjectName,
          teacherName: slot.teacherName,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          room: slot.room,
          type: slot.type || "LECTURE",
          section: slot.section || "BSCS 7th E2",
          status: slot.status || "SCHEDULED",
          customFields: slot.customFields,
        },
        create: {
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: slot.subjectName,
          teacherName: slot.teacherName,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          room: slot.room,
          type: slot.type || "LECTURE",
          section: slot.section || "BSCS 7th E2",
          status: slot.status || "SCHEDULED",
          customFields: slot.customFields,
        },
      });
    }
  }

  // 5. Attendance Sessions & Records
  if (Array.isArray(seedData.attendanceSessions)) {
    console.log(`Seeding ${seedData.attendanceSessions.length} attendance sessions...`);
    for (const ses of seedData.attendanceSessions) {
      await prisma.attendanceSession.upsert({
        where: { id: ses.id },
        update: {
          subjectId: ses.subjectId,
          date: ses.date,
          slotTime: ses.slotTime,
          totalStudents: ses.totalStudents,
          presentCount: ses.presentCount,
          absentCount: ses.absentCount,
          photoPath: ses.photoPath,
          notes: ses.notes,
          customFields: ses.customFields,
        },
        create: {
          id: ses.id,
          subjectId: ses.subjectId,
          date: ses.date,
          slotTime: ses.slotTime,
          totalStudents: ses.totalStudents,
          presentCount: ses.presentCount,
          absentCount: ses.absentCount,
          photoPath: ses.photoPath,
          notes: ses.notes,
          customFields: ses.customFields,
        },
      });
    }
  }

  if (Array.isArray(seedData.attendanceRecords)) {
    for (const rec of seedData.attendanceRecords) {
      await prisma.attendanceRecord.upsert({
        where: { id: rec.id },
        update: {
          sessionId: rec.sessionId,
          studentId: rec.studentId,
          status: rec.status,
          verified: rec.verified,
          customFields: rec.customFields,
        },
        create: {
          id: rec.id,
          sessionId: rec.sessionId,
          studentId: rec.studentId,
          status: rec.status,
          verified: rec.verified,
          customFields: rec.customFields,
        },
      });
    }
  }

  // 6. Student Groups & Members
  if (Array.isArray(seedData.studentGroups)) {
    console.log(`Seeding ${seedData.studentGroups.length} project groups...`);
    for (const grp of seedData.studentGroups) {
      await prisma.studentGroup.upsert({
        where: { id: grp.id },
        update: {
          subjectId: grp.subjectId,
          groupNumber: grp.groupNumber,
          groupName: grp.groupName,
          topic: grp.topic,
          customFields: grp.customFields,
        },
        create: {
          id: grp.id,
          subjectId: grp.subjectId,
          groupNumber: grp.groupNumber,
          groupName: grp.groupName,
          topic: grp.topic,
          customFields: grp.customFields,
        },
      });
    }
  }

  if (Array.isArray(seedData.groupMembers)) {
    for (const mem of seedData.groupMembers) {
      await prisma.groupMember.upsert({
        where: { id: mem.id },
        update: {
          groupId: mem.groupId,
          studentId: mem.studentId,
          role: mem.role || "MEMBER",
          customFields: mem.customFields,
        },
        create: {
          id: mem.id,
          groupId: mem.groupId,
          studentId: mem.studentId,
          role: mem.role || "MEMBER",
          customFields: mem.customFields,
        },
      });
    }
  }

  // 7. Course Materials
  if (Array.isArray(seedData.courseMaterials)) {
    console.log(`Seeding ${seedData.courseMaterials.length} course materials & Drive links...`);
    for (const mat of seedData.courseMaterials) {
      await prisma.courseMaterial.upsert({
        where: { id: mat.id },
        update: {
          subjectId: mat.subjectId,
          title: mat.title,
          category: mat.category,
          linkOrPath: mat.linkOrPath,
          description: mat.description,
          customFields: mat.customFields,
        },
        create: {
          id: mat.id,
          subjectId: mat.subjectId,
          title: mat.title,
          category: mat.category,
          linkOrPath: mat.linkOrPath,
          description: mat.description,
          customFields: mat.customFields,
        },
      });
    }
  }

  // 8. Class Conduction Logs
  if (Array.isArray(seedData.classLogs)) {
    for (const log of seedData.classLogs) {
      await prisma.classLog.upsert({
        where: { id: log.id },
        update: {
          subjectId: log.subjectId,
          date: log.date,
          status: log.status,
          topicCovered: log.topicCovered,
          reason: log.reason,
          customFields: log.customFields,
        },
        create: {
          id: log.id,
          subjectId: log.subjectId,
          date: log.date,
          status: log.status,
          topicCovered: log.topicCovered,
          reason: log.reason,
          customFields: log.customFields,
        },
      });
    }
  }

  // 9. Tasks
  if (Array.isArray(seedData.taskReminders)) {
    console.log(`Seeding ${seedData.taskReminders.length} task reminders...`);
    for (const t of seedData.taskReminders) {
      await prisma.taskReminder.upsert({
        where: { id: t.id },
        update: {
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          reminderTime: t.reminderTime,
          priority: t.priority,
          isCompleted: t.isCompleted,
          category: t.category,
          customFields: t.customFields,
        },
        create: {
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          reminderTime: t.reminderTime,
          priority: t.priority,
          isCompleted: t.isCompleted,
          category: t.category,
          customFields: t.customFields,
        },
      });
    }
  }

  // 10. Audit Log Entry for Seeding
  await prisma.auditLog.create({
    data: {
      module: "SYSTEM",
      action: "DATABASE_SEEDED",
      summary: "Database auto-seeded from seed_data.json snapshot",
      payload: JSON.stringify({
        seededAt: new Date().toISOString(),
        students: seedData.students?.length || 0,
        subjects: seedData.subjects?.length || 0,
        teachers: seedData.teachers?.length || 0,
      }),
    },
  });

  console.log("✨ [CR-Ship] Database seeding completed successfully!");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
