import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAiLearningSource: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAiLearningSource?: boolean;
  }
}
