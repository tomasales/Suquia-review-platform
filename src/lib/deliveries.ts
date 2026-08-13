import { DeliveryStatus, DeliveryType, Prisma } from "@prisma/client";

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
      reviewState: true,
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
      reviewState: true,
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        select: {
          versionNumber: true,
          originalFilename: true,
          uploadedAt: true,
        },
      },
    },
  },
} satisfies Prisma.DeliverySelect;

type DeliveryListRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryListSelect;
}>;

type DeliveryDetailRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryDetailSelect;
}>;

export type DeliveryListItem = ReturnType<typeof toDeliveryListItem>;
export type DeliveryDetail = ReturnType<typeof toDeliveryDetail>;

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

  return deliveries.map(toDeliveryListItem);
}

export async function getDeliveryById(id: string) {
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

function toDeliveryListItem(delivery: DeliveryListRecord) {
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

function toDeliveryDetail(delivery: DeliveryDetailRecord) {
  const listItem = toDeliveryListItem({
    ...delivery,
    pieces: delivery.pieces.map((piece) => ({
      reviewState: piece.reviewState,
    })),
  });

  return {
    ...listItem,
    generalNote: delivery.generalNote,
    pieces: delivery.pieces.map((piece) => {
      const latestVersion = piece.versions[0] ?? null;

      return {
        id: piece.id,
        position: piece.position,
        initialNote: piece.initialNote,
        reviewStateLabel: piece.reviewState
          ? pieceReviewStateLabel[piece.reviewState]
          : "Sin revisar",
        latestVersion: latestVersion
          ? {
              versionNumber: latestVersion.versionNumber,
              originalFilename: latestVersion.originalFilename,
              uploadedAtLabel: formatDeliveryDate(latestVersion.uploadedAt),
            }
          : null,
      };
    }),
  };
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
