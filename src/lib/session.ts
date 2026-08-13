import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";

type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isActive: boolean;
  isAiLearningSource: boolean;
};

export type AuthorizationState =
  | {
      status: "unauthenticated";
      user: null;
    }
  | {
      status: "unauthorized";
      user: AuthorizedUser | null;
    }
  | {
      status: "authorized";
      user: AuthorizedUser;
    };

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      isActive: true,
      isAiLearningSource: true,
    },
  });
}

export async function getAuthorizedUser(): Promise<AuthorizationState> {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return { status: "unauthenticated", user: null };
  }

  const user = await getCurrentUser();

  if (!user?.isActive || !user.email) {
    return { status: "unauthorized", user };
  }

  const email = normalizeEmail(user.email);
  const authorizedEmail = await db.authorizedEmail.findUnique({
    where: { email },
    select: { active: true },
  });

  if (!authorizedEmail?.active) {
    return { status: "unauthorized", user };
  }

  return { status: "authorized", user };
}

export async function requireAuthorizedUser() {
  const authorization = await getAuthorizedUser();

  if (authorization.status === "unauthenticated") {
    redirect("/login");
  }

  if (authorization.status === "unauthorized") {
    redirect("/login?error=AccessDenied");
  }

  return authorization.user;
}
