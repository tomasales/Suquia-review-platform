import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import { db } from "@/lib/db";

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

export async function requireAuthorizedUser() {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    redirect("/login");
  }

  return user;
}
