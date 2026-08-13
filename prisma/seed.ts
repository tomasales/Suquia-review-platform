import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@example.test" },
    update: {},
    create: {
      email: "reviewer@example.test",
      displayName: "Reviewer Example",
      isAiLearningSource: true,
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: "collaborator@example.test" },
    update: {},
    create: {
      email: "collaborator@example.test",
      displayName: "Collaborator Example",
    },
  });

  await prisma.authorizedEmail.upsert({
    where: { email: reviewer.email },
    update: { active: true },
    create: {
      email: reviewer.email,
      active: true,
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

  const delivery = await prisma.delivery.create({
    data: {
      generatedTitle: "Stories example delivery",
      type: "STORIES",
      status: "SENT_FOR_REVIEW",
      generalNote: "Technical seed delivery",
      createdByUserId: collaborator.id,
      submittedAt: new Date(),
      pieces: {
        create: [
          {
            position: 1,
            initialNote: "First seed piece",
            versions: {
              create: {
                versionNumber: 1,
                uploadedByUserId: collaborator.id,
                originalFilename: "story-01.png",
                mimeType: "image/png",
                fileSizeBytes: 1024,
              },
            },
          },
        ],
      },
    },
    include: {
      pieces: {
        include: {
          versions: true,
        },
      },
    },
  });

  const piece = delivery.pieces[0];
  const version = piece.versions[0];

  await prisma.feedback.create({
    data: {
      deliveryId: delivery.id,
      pieceId: piece.id,
      pieceVersionId: version.id,
      authorUserId: reviewer.id,
      sourceType: "TOMI",
      level: "PIECE",
      body: "Technical seed feedback for model validation.",
    },
  });

  await prisma.journalEvent.create({
    data: {
      deliveryId: delivery.id,
      actorUserId: collaborator.id,
      eventType: "delivery.seeded",
      entityType: "Delivery",
      entityId: delivery.id,
      metadata: { seed: true },
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
