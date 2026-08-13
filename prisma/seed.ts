import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@example.test" },
    update: {},
    create: {
      email: "reviewer@example.test",
      name: "Reviewer Example",
      isAiLearningSource: true,
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: "collaborator@example.test" },
    update: {},
    create: {
      email: "collaborator@example.test",
      name: "Collaborator Example",
    },
  });

  await prisma.authorizedEmail.upsert({
    where: { email: reviewer.email },
    update: { active: true, isAiLearningSource: true },
    create: {
      email: reviewer.email,
      active: true,
      isAiLearningSource: true,
      note: "Technical seed user",
      invitedByUserId: reviewer.id,
    },
  });

  await prisma.authorizedEmail.upsert({
    where: { email: collaborator.email },
    update: { active: true },
    create: {
      email: collaborator.email,
      active: true,
      isAiLearningSource: false,
      note: "Technical seed user",
      invitedByUserId: reviewer.id,
    },
  });

  await prisma.driveSyncState.upsert({
    where: { key: "primary" },
    update: {},
    create: {
      key: "primary",
      status: "CHECKING",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
