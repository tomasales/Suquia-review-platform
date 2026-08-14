import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  pieceReviewApiError,
  updatePieceReviewState,
} from "@/lib/piece-review-actions";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ pieceId: string }> },
) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const { pieceId } = await context.params;

  try {
    const input = await request.json();
    const result = await updatePieceReviewState({
      pieceId,
      pieceVersionId: input.pieceVersionId,
      reviewState: input.reviewState,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = pieceReviewApiError(error);

    return NextResponse.json(
      { code: apiError.code, error: apiError.message },
      { status: apiError.status },
    );
  }
}
