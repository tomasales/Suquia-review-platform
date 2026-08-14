export type VersionIdentity = {
  id: string;
  versionNumber: number;
};

export type FinalizeFailureInput = {
  code?: string;
  isNetworkError?: boolean;
  status?: number;
};

export type FinalizeFailureResolution = {
  description: string;
  discardAttempt: boolean;
  title: string;
};

export type ReviewMutationFailureInput = {
  code?: string;
  operation: "feedback" | "review";
};

export type ReviewMutationFailureResolution = {
  description: string;
  shouldRefresh: boolean;
  title: string;
};

export function mergePieceVersions<TVersion extends VersionIdentity>(
  persisted: TVersion[],
  optimistic: TVersion[],
) {
  const seenIds = new Set<string>();
  const seenVersionNumbers = new Set<number>();
  const merged: TVersion[] = [];

  for (const version of persisted) {
    merged.push(version);
    seenIds.add(version.id);
    seenVersionNumbers.add(version.versionNumber);
  }

  for (const version of optimistic) {
    if (seenIds.has(version.id) || seenVersionNumbers.has(version.versionNumber)) {
      continue;
    }

    merged.push(version);
    seenIds.add(version.id);
    seenVersionNumbers.add(version.versionNumber);
  }

  return merged.sort((left, right) => right.versionNumber - left.versionNumber);
}

export function getOptimisticVersionIdsToDrop<
  TVersion extends VersionIdentity,
>(persisted: TVersion[], optimistic: TVersion[]) {
  const persistedIds = new Set(persisted.map((version) => version.id));
  const persistedVersionNumbers = new Set(
    persisted.map((version) => version.versionNumber),
  );

  return optimistic
    .filter(
      (version) =>
        persistedIds.has(version.id) ||
        persistedVersionNumbers.has(version.versionNumber),
    )
    .map((version) => version.id);
}

export function resolveFinalizeFailure({
  code,
  isNetworkError,
  status,
}: FinalizeFailureInput): FinalizeFailureResolution {
  if (code === "VERSION_CONFLICT") {
    return {
      description: "Volvé a intentar para crear la siguiente versión.",
      discardAttempt: true,
      title: "Hay una versión más nueva",
    };
  }

  if (code === "DELIVERY_CLOSED") {
    return {
      description: "Ya no se pueden guardar cambios en esta entrega.",
      discardAttempt: true,
      title: "La entrega está cerrada",
    };
  }

  if (status === 409) {
    return {
      description:
        "El archivo ya está subido. Podés reintentar sin volver a cargarlo.",
      discardAttempt: false,
      title: "No pudimos terminar de guardar la versión",
    };
  }

  if (status && status >= 400 && status < 500) {
    return {
      description: "Volvé a intentar desde la subida del archivo.",
      discardAttempt: true,
      title: "No pudimos subir la nueva versión",
    };
  }

  if (isNetworkError || !status || status >= 500) {
    return {
      description:
        "El archivo ya está subido. Podés reintentar sin volver a cargarlo.",
      discardAttempt: false,
      title: "No pudimos terminar de guardar la versión",
    };
  }

  return {
    description: "Intentá nuevamente.",
    discardAttempt: true,
    title: "No pudimos subir la nueva versión",
  };
}

export function resolveReviewMutationFailure({
  code,
  operation,
}: ReviewMutationFailureInput): ReviewMutationFailureResolution {
  if (code === "HISTORICAL_VERSION") {
    return {
      description:
        operation === "feedback"
          ? "Tu texto sigue acá. Revisá la versión actual antes de enviarlo."
          : "Revisá la versión actual.",
      shouldRefresh: true,
      title: "Hay una versión más nueva",
    };
  }

  if (code === "DELIVERY_CLOSED") {
    return {
      description: "Ya no se pueden guardar cambios en esta entrega.",
      shouldRefresh: true,
      title: "La entrega está cerrada",
    };
  }

  return {
    description:
      operation === "feedback"
        ? "Tu texto sigue acá. Intentá nuevamente."
        : "Intentá nuevamente.",
    shouldRefresh: false,
    title:
      operation === "feedback"
        ? "No pudimos guardar el feedback"
        : "No pudimos guardar la revisión",
  };
}
