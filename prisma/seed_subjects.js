const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SUBJECTS = [
  { code: "ARE-508", name: "HUMAN RESOURCE MANAGEMENT", creditHours: 3, teacher: "Sir Hassan Zulfiqar" },
  { code: "CS-601", name: "GRAPH THEORY", creditHours: 3, teacher: "Ms. Kainat Amjad" },
  { code: "IT-601", name: "HUMAN COMPUTER INTERACTION", creditHours: 3, teacher: "Miss Amina Amir" },
  { code: "CS-603", name: "COMPILER CONSTRUCTION", creditHours: 3, teacher: "Ms. Anum Khalid" },
  { code: "BBA-603", name: "ENTREPRENEURSHIP", creditHours: 3, teacher: "Pending Faculty" },
  { code: "CS-605", name: "THEORY OF AUTOMATA", creditHours: 3, teacher: "Miss Faiza" },
];

async function main() {
  console.log("Seeding Semester 7 official subjects...");

  for (const sub of SUBJECTS) {
    let teacherRecord = null;
    if (sub.teacher) {
      teacherRecord = await prisma.teacher.findFirst({
        where: { name: sub.teacher },
      });

      if (!teacherRecord) {
        teacherRecord = await prisma.teacher.create({
          data: {
            name: sub.teacher,
            customFields: JSON.stringify({ department: "Computer Science", role: "Faculty" }),
          },
        });
      }
    }

    const subjectRecord = await prisma.subject.upsert({
      where: { code: sub.code },
      update: {
        name: sub.name,
        creditHours: sub.creditHours,
        teacherId: teacherRecord ? teacherRecord.id : null,
      },
      create: {
        code: sub.code,
        name: sub.name,
        creditHours: sub.creditHours,
        teacherId: teacherRecord ? teacherRecord.id : null,
        customFields: JSON.stringify({ semester: "7th", section: "BSCS 7th E2" }),
      },
    });

    console.log(`[+] Seeded: ${subjectRecord.code} - ${subjectRecord.name}`);
  }

  console.log("Subject seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
