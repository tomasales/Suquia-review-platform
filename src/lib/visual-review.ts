import type { AuthorizationState } from "@/lib/session";

export function isVisualReviewMode() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.SUQUIA_VISUAL_REVIEW === "1"
  );
}

export function getVisualReviewAuthorization(): AuthorizationState {
  return {
    status: "authorized",
    user: {
      id: "visual-review-user",
      email: "visual-review@suquia.local",
      name: "Tomi Preview",
      image: null,
      isActive: true,
      isAiLearningSource: false,
    },
  };
}
