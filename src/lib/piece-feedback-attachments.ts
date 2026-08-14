import "server-only";

import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  validateUploadUrlInput,
} from "@/lib/storage/validation";

export const MAX_FEEDBACK_ATTACHMENTS = 10;

export type PrepareFeedbackAttachmentInput = {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
};

export function validatePrepareFeedbackAttachmentsInput(input: unknown) {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof (input as { pieceVersionId?: unknown }).pieceVersionId !== "string" ||
    !Array.isArray((input as { attachments?: unknown }).attachments)
  ) {
    throw new Error("Payload de referencias inválido.");
  }

  const pieceVersionId = (input as { pieceVersionId: string }).pieceVersionId;
  const attachments = (input as { attachments: unknown[] }).attachments;

  if (attachments.length === 0 || attachments.length > MAX_FEEDBACK_ATTACHMENTS) {
    throw new Error("Podés adjuntar entre 1 y 10 referencias.");
  }

  return {
    attachments: attachments.map(validatePrepareFeedbackAttachmentInput),
    pieceVersionId,
  };
}

function validatePrepareFeedbackAttachmentInput(
  attachment: unknown,
): PrepareFeedbackAttachmentInput {
  if (
    typeof attachment !== "object" ||
    attachment === null ||
    typeof (attachment as { fileSizeBytes?: unknown }).fileSizeBytes !==
      "number" ||
    typeof (attachment as { filename?: unknown }).filename !== "string" ||
    typeof (attachment as { mimeType?: unknown }).mimeType !== "string"
  ) {
    throw new Error("Payload de referencia inválido.");
  }

  const input = {
    fileSizeBytes: (attachment as { fileSizeBytes: number }).fileSizeBytes,
    filename: (attachment as { filename: string }).filename,
    mimeType: (attachment as { mimeType: string }).mimeType,
  };

  validateUploadUrlInput({
    ...input,
    purpose: "feedback-attachment",
  });

  return input;
}

export function getFeedbackAttachmentClientError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No pudimos preparar las referencias.";
}

export function isValidFeedbackAttachmentFile(file: {
  size: number;
  type: string;
}) {
  return (
    file.size > 0 &&
    file.size <= MAX_UPLOAD_FILE_SIZE_BYTES &&
    (file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp")
  );
}
