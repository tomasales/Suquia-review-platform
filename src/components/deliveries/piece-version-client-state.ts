export type VersionIdentity = {
  id: string;
  versionNumber: number;
};

export type FinalizeFailureInput = {
  isNetworkError?: boolean;
  status?: number;
};

export type FinalizeFailureResolution = {
  description: string;
  discardAttempt: boolean;
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
  isNetworkError,
  status,
}: FinalizeFailureInput): FinalizeFailureResolution {
  if (status === 409) {
    return {
      description: "Volvé a intentar para crear la siguiente versión.",
      discardAttempt: true,
      title: "Hay una versión más nueva",
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
