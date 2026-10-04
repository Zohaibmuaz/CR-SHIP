const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialSlots = [
  // Monday
  {
    dayOfWeek: "Monday",
    startTime: "2:00",
    endTime: "3:40",
    subjectName: "IT-601-P",
    room: "Second Floor Lab #1",
    teacherName: "Miss Amina Amir",
    type: "LAB",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },
  {
    dayOfWeek: "Monday",
    startTime: "3:40",
    endTime: "5:20",
    subjectName: "CS-605-P",
    room: "G-Floor Room #3",
    teacherName: "Miss Faiza",
    type: "LAB",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },
  {
    dayOfWeek: "Monday",
    startTime: "5:20",
    endTime: "7:00",
    subjectName: "CS-603-P",
    room: "G-Floor Room #2",
    teacherName: "Ms. Anum Khalid",
    type: "LAB",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },

  // Tuesday
  {
    dayOfWeek: "Tuesday",
    startTime: "2:00",
    endTime: "3:40",
    subjectName: "CS-605-T",
    room: "Second Floor Lab #4",
    teacherName: "Miss Faiza",
    type: "LECTURE",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },
  {
    dayOfWeek: "Tuesday",
    startTime: "3:40",
    endTime: "5:20",
    subjectName: "CS-603-P",
    room: "Second Floor Lab #4",
    teacherName: "Ms. Anum Khalid",
    type: "LAB",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },

  // Wednesday
  {
    dayOfWeek: "Wednesday",
    startTime: "2:00",
    endTime: "3:40",
    subjectName: "IT-601-T",
    room: "Second Floor Lab #2",
    teacherName: "Miss Amina Amir",
    type: "LECTURE",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },
  {
    dayOfWeek: "Wednesday",
    startTime: "4:30",
    endTime: "7:00",
    subjectName: "BBA-603",
    room: "IT-Building Room #2",
    teacherName: "Pending",
    type: "LECTURE",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },

  // Thursday
  {
    dayOfWeek: "Thursday",
    startTime: "2:00",
    endTime: "4:30",
    subjectName: "CS-601-T",
    room: "IT-Building CS-Lab",
    teacherName: "Ms. Kainat Amjad",
    type: "LECTURE",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },

  // Friday
  {
    dayOfWeek: "Friday",
    startTime: "2:00",
    endTime: "4:30",
    subjectName: "ARE-508",
    room: "IT-Building Room #2",
    teacherName: "Sir Hassan Zulfiqar",
    type: "LECTURE",
    section: "BSCS 7th E2",
    status: "SCHEDULED",
  },
];

async function seed() {
  console.log("Seeding reference timetable...");
  // Clear any previous timetable slots
  await prisma.timetableSlot.deleteMany({});

  for (const slot of initialSlots) {
    await prisma.timetableSlot.create({
      data: slot,
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      module: "TIMETABLE",
      action: "INIT",
      summary: "Initialized BSCS 7th E2 Active Schedule from Reference Image",
      payload: JSON.stringify({ count: initialSlots.length, section: "BSCS 7th E2" }),
    },
  });

  console.log("Seeded successfully!");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
