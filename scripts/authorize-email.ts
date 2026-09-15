import { PrismaClient } from "@prisma/client";

import { normalizeEmail } from "../src/lib/email";

const prisma = new PrismaClient();

type ParsedArgs = {
  email: string;
  isAiLearningSource: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [email, ...flags] = argv;

  if (!email || email === "--help" || email === "-h") {
    printUsage();
    process.exit(email ? 0 : 1);
  }

  let isAiLearningSource = false;

  for (const flag of flags) {
    if (flag === "--ai-learning-source") {
      isAiLearningSource = true;
      continue;
    }

    if (flag === "--no-ai-learning-source") {
      isAiLearningSource = false;
      continue;
    }

    throw new Error(`Unknown option: ${flag}`);
  }

  return {
    email: normalizeEmail(email),
    isAiLearningSource,
  };
}

function printUsage() {
  console.log(`Usage:
  npm run allowlist:email -- user@example.com
  npm run allowlist:email -- user@example.com --ai-learning-source

Options:
  --ai-learning-source     Mark the allowlisted email as an AI learning source.
  --no-ai-learning-source  Explicitly keep AI learning source disabled.`);
}

async function main() {
  const { email, isAiLearningSource } = parseArgs(process.argv.slice(2));

  if (!email.includes("@")) {
    throw new Error("Email must include @.");
  }

  const authorizedEmail = await prisma.authorizedEmail.upsert({
    create: {
      active: true,
      email,
      isAiLearningSource,
      note: "Live pilot allowlist",
    },
    update: {
      active: true,
      isAiLearningSource,
    },
    where: {
      email,
    },
  });

  console.log(
    `Allowlisted ${authorizedEmail.email} (isAiLearningSource=${authorizedEmail.isAiLearningSource})`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
