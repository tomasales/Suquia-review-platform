import {
  DeliveryStatus,
  DeliveryType,
  FeedbackLevel,
  PieceReviewState,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  deliveryTypeLabel,
  formatDeliveryDate,
  formatPieceCount,
  formatReviewSummary,
  pieceReviewStateLabel,
} from "@/lib/delivery-presentation";
import {
  getVisualReviewPieceData,
  visualReviewAuthors,
  visualReviewDeliveries,
} from "@/lib/visual-review-data";
import { isVisualReviewMode } from "@/lib/visual-review";
import { createReadUrl } from "@/lib/storage/storage";

export const reviewQueueStatuses = [
  DeliveryStatus.SENT_FOR_REVIEW,
  DeliveryStatus.IN_REVIEW,
  DeliveryStatus.CHANGES_REQUESTED,
] as const;

export type DeliverySearchParams = Record<string, string | string[] | undefined>;

export type DeliveryFilters = {
  type?: DeliveryType;
  status?: DeliveryStatus;
  authorId?: string;
  from?: Date;
  to?: Date;
  values: {
    type: string;
    status: string;
    author: string;
    from: string;
    to: string;
  };
  isActive: boolean;
};

const deliveryListSelect = {
  id: true,
  generatedTitle: true,
  type: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  pieces: {
    select: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        select: {
          reviewState: true,
        },
        take: 1,
      },
    },
  },
} satisfies Prisma.DeliverySelect;

const deliveryDetailSelect = {
  id: true,
  generatedTitle: true,
  type: true,
  status: true,
  generalNote: true,
  submittedAt: true,
  createdAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  pieces: {
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
      position: true,
      initialNote: true,
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        select: {
          id: true,
          fileSizeBytes: true,
          mimeType: true,
          versionNumber: true,
          originalFilename: true,
          reviewState: true,
          storageKey: true,
          uploadedAt: true,
          uploadedBy: {
            select: {
              email: true,
              name: true,
            },
          },
          feedback: {
            where: {
              level: FeedbackLevel.PIECE,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              attachments: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  createdAt: true,
                  fileSizeBytes: true,
                  id: true,
                  mimeType: true,
                  originalFilename: true,
                  storageKey: true,
                  uploadedBy: {
                    select: {
                      email: true,
                      name: true,
                    },
                  },
                },
              },
              id: true,
              body: true,
              createdAt: true,
              sourceType: true,
              author: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DeliverySelect;

export type DeliveryListRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryListSelect;
}>;

type DeliveryListLike = Omit<DeliveryListRecord, "pieces"> & {
  pieces: Array<{ reviewState: PieceReviewState | null }>;
};

export type DeliveryDetailRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryDetailSelect;
}>;

export type DeliveryListItem = ReturnType<typeof toDeliveryListItem>;
export type DeliveryDetail = Awaited<ReturnType<typeof toDeliveryDetail>>;

export function parseDeliveryFilters(params: DeliverySearchParams = {}) {
  const typeValue = getFirstParam(params.type);
  const statusValue = getFirstParam(params.status);
  const authorValue = getFirstParam(params.author);
  const fromValue = getFirstParam(params.from);
  const toValue = getFirstParam(params.to);

  const type = isDeliveryType(typeValue) ? typeValue : undefined;
  const status = isDeliveryStatus(statusValue) ? statusValue : undefined;
  const from = parseDateStart(fromValue);
  const to = parseDateEnd(toValue);

  return {
    type,
    status,
    authorId: authorValue || undefined,
    from,
    to,
    values: {
      type: typeValue,
      status: statusValue,
      author: authorValue,
      from: fromValue,
      to: toValue,
    },
    isActive: Boolean(type || status || authorValue || from || to),
  } satisfies DeliveryFilters;
}

export async function listDeliveries(
  filters: DeliveryFilters = parseDeliveryFilters(),
  options: {
    statuses?: readonly DeliveryStatus[];
    take?: number;
  } = {},
) {
  if (isVisualReviewMode()) {
    return visualReviewDeliveries
      .filter((delivery) =>
        matchesVisualReviewFilters(delivery, filters, options.statuses),
      )
      .slice(0, options.take)
      .map(normalizeDeliveryListRecord)
      .map(toDeliveryListItem);
  }

  const where = buildDeliveryWhere(filters, options.statuses);

  const deliveries = await db.delivery.findMany({
    where,
    orderBy: [
      { submittedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: options.take,
    select: deliveryListSelect,
  });

  return deliveries.map(normalizeDeliveryListRecord).map(toDeliveryListItem);
}

export async function getDeliveryById(id: string) {
  if (isVisualReviewMode()) {
    const delivery = visualReviewDeliveries.find((item) => item.id === id);

    return delivery ? await toDeliveryDetail(delivery) : null;
  }

  const delivery = await db.delivery.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: deliveryDetailSelect,
  });

  if (!delivery) {
    return null;
  }

  return toDeliveryDetail(delivery);
}

export async function listDeliveryAuthors() {
  if (isVisualReviewMode()) {
    return visualReviewAuthors;
  }

  return db.user.findMany({
    where: {
      createdDeliveries: {
        some: {
          deletedAt: null,
        },
      },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

function matchesVisualReviewFilters(
  delivery: DeliveryDetailRecord,
  filters: DeliveryFilters,
  statuses?: readonly DeliveryStatus[],
) {
  const effectiveDate = delivery.submittedAt ?? delivery.createdAt;

  return (
    (!filters.type || delivery.type === filters.type) &&
    (!filters.status || delivery.status === filters.status) &&
    (!statuses?.length || statuses.includes(delivery.status)) &&
    (!filters.authorId || delivery.creator.id === filters.authorId) &&
    (!filters.from || effectiveDate >= filters.from) &&
    (!filters.to || effectiveDate <= filters.to)
  );
}

function buildDeliveryWhere(
  filters: DeliveryFilters,
  statuses?: readonly DeliveryStatus[],
): Prisma.DeliveryWhereInput {
  const and: Prisma.DeliveryWhereInput[] = [];

  if (filters.type) {
    and.push({ type: filters.type });
  }

  if (filters.status) {
    and.push({ status: filters.status });
  } else if (statuses?.length) {
    and.push({ status: { in: [...statuses] } });
  }

  if (filters.authorId) {
    and.push({ createdByUserId: filters.authorId });
  }

  if (filters.from) {
    and.push({
      OR: [
        { submittedAt: { gte: filters.from } },
        { submittedAt: null, createdAt: { gte: filters.from } },
      ],
    });
  }

  if (filters.to) {
    and.push({
      OR: [
        { submittedAt: { lte: filters.to } },
        { submittedAt: null, createdAt: { lte: filters.to } },
      ],
    });
  }

  return {
    deletedAt: null,
    ...(and.length ? { AND: and } : {}),
  };
}

function normalizeDeliveryListRecord(
  delivery: DeliveryListRecord | DeliveryDetailRecord,
): DeliveryListLike {
  return {
    ...delivery,
    pieces: delivery.pieces.map((piece) => ({
      reviewState: getCurrentPieceReviewState(piece),
    })),
  };
}

function toDeliveryListItem(delivery: DeliveryListLike) {
  const effectiveDate = delivery.submittedAt ?? delivery.createdAt;
  const authorLabel = delivery.creator.name ?? delivery.creator.email;

  return {
    id: delivery.id,
    title: delivery.generatedTitle,
    type: delivery.type,
    typeLabel: deliveryTypeLabel[delivery.type],
    status: delivery.status,
    statusLabel: deliveryStatusLabel[delivery.status],
    statusTone: deliveryStatusTone[delivery.status],
    pieceCount: delivery.pieces.length,
    pieceCountLabel: formatPieceCount(delivery.pieces.length),
    reviewSummary: formatReviewSummary(delivery.pieces),
    date: effectiveDate,
    dateLabel: formatDeliveryDate(effectiveDate),
    authorLabel,
  };
}

async function toDeliveryDetail(delivery: DeliveryDetailRecord) {
  const listItem = toDeliveryListItem(normalizeDeliveryListRecord(delivery));
  const pieces = await Promise.all(
    delivery.pieces.map(async (piece) => {
      const latestVersion = piece.versions[0] ?? null;
      const visualReviewData = getVisualReviewPieceData(piece.id);
      const versions =
        visualReviewData?.versions.map((version) => {
          const persistedVersion = piece.versions.find(
            (item) => item.versionNumber === version.versionNumber,
          );
          const reviewState = persistedVersion?.reviewState ?? null;

          return {
            ...version,
            reviewState,
            reviewStateLabel: reviewState
              ? pieceReviewStateLabel[reviewState]
              : "Sin revisar",
            reviewStateTone: getPieceReviewTone(reviewState),
          };
        }) ??
        (await Promise.all(
          piece.versions.map(async (version) => {
            const readUrl = version.storageKey
              ? await createReadUrl(version.storageKey)
                  .then((result) => result.readUrl)
                  .catch(() => null)
              : null;

            return {
              id: version.id,
              fileSizeBytes: Number(version.fileSizeBytes),
              mimeType: version.mimeType,
              originalFilename: version.originalFilename,
              reviewState: version.reviewState,
              reviewStateLabel: version.reviewState
                ? pieceReviewStateLabel[version.reviewState]
                : "Sin revisar",
              reviewStateTone: getPieceReviewTone(version.reviewState),
              versionNumber: version.versionNumber,
              uploadedAtLabel: formatDeliveryDate(version.uploadedAt),
              uploaderLabel: version.uploadedBy.name ?? version.uploadedBy.email,
              imageSrc: readUrl,
              feedback: await Promise.all(
                version.feedback.map(async (item) => ({
                  id: item.id,
                  author: item.author.name ?? item.author.email,
                  body: item.body,
                  createdAtLabel: formatFeedbackDate(item.createdAt),
                  sourceType: item.sourceType,
                  attachments: await Promise.all(
                    item.attachments.map(async (attachment) => ({
                      createdAtLabel: formatFeedbackDate(attachment.createdAt),
                      fileSizeBytes: Number(attachment.fileSizeBytes),
                      id: attachment.id,
                      imageSrc: attachment.storageKey
                        ? await createReadUrl(attachment.storageKey)
                            .then((result) => result.readUrl)
                            .catch(() => null)
                        : null,
                      mimeType: attachment.mimeType,
                      originalFilename: attachment.originalFilename,
                      uploadedByLabel:
                        attachment.uploadedBy.name ?? attachment.uploadedBy.email,
                    })),
                  ),
                })),
              ),
              references: [],
              conversation: [],
            };
          }),
        ));

      return {
        id: piece.id,
        position: piece.position,
        initialNote: piece.initialNote,
        reviewState: latestVersion?.reviewState ?? null,
        reviewStateLabel: latestVersion?.reviewState
          ? pieceReviewStateLabel[latestVersion.reviewState]
          : "Sin revisar",
        reviewStateTone: getPieceReviewTone(latestVersion?.reviewState ?? null),
        aspect: visualReviewData?.aspect ?? getPieceAspect(delivery.type),
        versions,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              fileSizeBytes: Number(latestVersion.fileSizeBytes),
              mimeType: latestVersion.mimeType,
              originalFilename: latestVersion.originalFilename,
              reviewState: latestVersion.reviewState,
              reviewStateLabel: latestVersion.reviewState
                ? pieceReviewStateLabel[latestVersion.reviewState]
                : "Sin revisar",
              uploadedAtLabel: formatDeliveryDate(latestVersion.uploadedAt),
              uploaderLabel:
                latestVersion.uploadedBy.name ?? latestVersion.uploadedBy.email,
              versionNumber: latestVersion.versionNumber,
            }
          : null,
      };
    }),
  );

  return {
    ...listItem,
    generalNote: delivery.generalNote,
    pieces: pieces.map((piece) => ({
      ...piece,
      versions: piece.versions.map((version) => ({
        ...version,
        references: getReferencesFromFeedback(version.feedback),
      })),
    })),
  };
}

function getReferencesFromFeedback(
  feedback: Array<{
    attachments?: Array<{
      id: string;
      imageSrc: string | null;
      originalFilename: string;
    }>;
    id: string;
  }>,
) {
  return feedback.flatMap((item) =>
    (item.attachments ?? []).map((attachment) => ({
      feedbackId: item.id,
      id: attachment.id,
      imageSrc: attachment.imageSrc,
      title: attachment.originalFilename,
    })),
  );
}

const feedbackDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

function formatFeedbackDate(date: Date) {
  return feedbackDateFormatter.format(date);
}

function getCurrentPieceReviewState(piece: {
  versions: Array<{ reviewState: PieceReviewState | null }>;
}) {
  return piece.versions[0]?.reviewState ?? null;
}

function getPieceAspect(deliveryType: DeliveryType) {
  return deliveryType === DeliveryType.STORIES ? "story" : "feed";
}

function getPieceReviewTone(reviewState: PieceReviewState | null) {
  if (reviewState === PieceReviewState.OK) {
    return "success";
  }

  if (reviewState === PieceReviewState.NEEDS_CHANGES) {
    return "warning";
  }

  return "neutral";
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isDeliveryType(value: string): value is DeliveryType {
  return Object.values(DeliveryType).includes(value as DeliveryType);
}

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return Object.values(DeliveryStatus).includes(value as DeliveryStatus);
}

function parseDateStart(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
