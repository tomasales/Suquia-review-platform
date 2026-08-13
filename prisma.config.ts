import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

const baseConfig = {
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
};

export default databaseUrl
  ? defineConfig({
      ...baseConfig,
      engine: "classic",
      datasource: {
        url: databaseUrl,
      },
    })
  : defineConfig(baseConfig);
