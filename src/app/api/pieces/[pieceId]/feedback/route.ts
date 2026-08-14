import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  addPieceFeedback,
  pieceReviewApiError,
} from "@/lib/piece-review-actions";

export const runtime = "nodejs";

export async function POST(
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
    const result = await addPieceFeedback({
      body: input.body,
      pieceId,
      pieceVersionId: input.pieceVersionId,
      user,
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
