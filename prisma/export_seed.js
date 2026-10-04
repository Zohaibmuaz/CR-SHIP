const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function exportSeed() {
  console.log("Exporting database snapshot for seed...");

  const [
    students,
    teachers,
    subjects,
    timetableSlots,
    attendanceSessions,
    attendanceRecords,
    studentGroups,
    groupMembers,
    courseMaterials,
    classLogs,
    taskReminders,
  ] = await Promise.all([
    prisma.student.findMany({ orderBy: { id: "asc" } }),
    prisma.teacher.findMany({ orderBy: { id: "asc" } }),
    prisma.subject.findMany({ orderBy: { id: "asc" } }),
    prisma.timetableSlot.findMany({ orderBy: { id: "asc" } }),
    prisma.attendanceSession.findMany({ orderBy: { id: "asc" } }),
    prisma.attendanceRecord.findMany({ orderBy: { id: "asc" } }),
    prisma.studentGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.groupMember.findMany({ orderBy: { id: "asc" } }),
    prisma.courseMaterial.findMany({ orderBy: { id: "asc" } }),
    prisma.classLog.findMany({ orderBy: { id: "asc" } }),
    prisma.taskReminder.findMany({ orderBy: { id: "asc" } }),
  ]);

  const seedData = {
    metadata: {
      appName: "CR-Ship",
      exportedAt: new Date().toISOString(),
      class: "BSCS 7th (E2)",
      institution: "University of Agriculture Faisalabad (UAF)",
      representative: "Zohaib",
    },
    students,
    teachers,
    subjects,
    timetableSlots,
    attendanceSessions,
    attendanceRecords,
    studentGroups,
    groupMembers,
    courseMaterials,
    classLogs,
    taskReminders,
  };

  const seedPath = path.join(__dirname, "seed_data.json");
  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), "utf-8");

  console.log(`✅ Seed snapshot exported to ${seedPath}`);
  console.log(`Counts:
    - Students: ${students.length}
    - Teachers: ${teachers.length}
    - Subjects: ${subjects.length}
    - Timetable Slots: ${timetableSlots.length}
    - Attendance Sessions: ${attendanceSessions.length}
    - Groups: ${studentGroups.length}
    - Materials: ${courseMaterials.length}
    - Tasks: ${taskReminders.length}`);

  await prisma.$disconnect();
}

exportSeed().catch((err) => {
  console.error("Export seed failed:", err);
  process.exit(1);
});
