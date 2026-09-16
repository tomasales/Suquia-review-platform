"use client";

import { ExternalLink, FileText, RefreshCw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";

type BrandManualGuideline = {
  fileSizeLabel: string;
  id: string;
  mimeType: string;
  originalFilename: string;
  updatedAtLabel: string;
  uploadedByLabel: string;
};

type PreparedGuidelineUpload = {
  attemptToken: string;
  guidelineId: string;
  storageKey: string;
  uploaded: boolean;
  uploadUrl: string;
};

type PrepareGuidelineResponse = {
  attemptToken: string;
  guidelineId: string;
  storageKey: string;
  uploadUrl: string;
};

type FinalizeGuidelineResponse = {
  alreadyFinalized: boolean;
  manual: BrandManualGuideline;
};

type ReadUrlResponse = {
  expiresAt: string;
  readUrl: string;
  storageKey: string;
};

type UploadPhase = "idle" | "preparing" | "uploading" | "finalizing";

type BrandManualPanelProps = {
  initialManual: BrandManualGuideline | null;
};

function isPdfFile(file: File) {
  return file.type === "application/pdf" && /\.pdf$/i.test(file.name);
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined
        ? undefined
        : {
            "Content-Type": "application/json",
          },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(payload?.error ?? "No pudimos procesar el manual.");
  }

  return response.json() as Promise<T>;
}

function getClientErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Tus cambios siguen acá. Intentá nuevamente.";
}

export function BrandManualPanel({ initialManual }: BrandManualPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState(initialManual);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedUpload, setPreparedUpload] =
    useState<PreparedGuidelineUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [isOpening, setIsOpening] = useState(false);
  const isBusy = phase !== "idle";

  function openFilePicker() {
    if (isBusy) {
      return;
    }

    inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setPreparedUpload(null);
      setError("Solo se admite un archivo PDF.");
      return;
    }

    setSelectedFile(file);
    setPreparedUpload(null);
    setError(null);
  }

  async function prepareUpload(file: File) {
    const result = await postJson<PrepareGuidelineResponse>(
      "/api/guidelines/brand-manual/prepare",
      {
        fileSizeBytes: file.size,
        filename: file.name,
        mimeType: file.type,
      },
    );

    return {
      attemptToken: result.attemptToken,
      guidelineId: result.guidelineId,
      storageKey: result.storageKey,
      uploaded: false,
      uploadUrl: result.uploadUrl,
    };
  }

  async function uploadFile(upload: PreparedGuidelineUpload, file: File) {
    const response = await fetch(upload.uploadUrl, {
      body: file,
      headers: {
        "Content-Type": file.type,
      },
      method: "PUT",
    });

    if (!response.ok) {
      throw new Error("No pudimos subir el PDF.");
    }

    return {
      ...upload,
      uploaded: true,
    };
  }

  async function handleSubmit() {
    if (!selectedFile || isBusy) {
      return;
    }

    setError(null);

    try {
      setPhase(preparedUpload ? "finalizing" : "preparing");
      const prepared = preparedUpload ?? (await prepareUpload(selectedFile));
      setPreparedUpload(prepared);

      let uploaded = prepared;

      if (!prepared.uploaded) {
        setPhase("uploading");
        uploaded = await uploadFile(prepared, selectedFile);
        setPreparedUpload(uploaded);
      }

      setPhase("finalizing");
      const result = await postJson<FinalizeGuidelineResponse>(
        "/api/guidelines/brand-manual/finalize",
        {
          attemptToken: uploaded.attemptToken,
        },
      );

      setManual(result.manual);
      setSelectedFile(null);
      setPreparedUpload(null);
      showToast({
        title: "Manual actualizado",
        description: result.alreadyFinalized
          ? "El manual ya estaba finalizado."
          : "El manual de marca quedó vigente.",
        tone: "success",
      });
      router.refresh();
    } catch (uploadError) {
      const message = getClientErrorMessage(uploadError);
      setError(message);
      showToast({
        title: "No pudimos subir el manual",
        description: message,
        tone: "error",
      });
    } finally {
      setPhase("idle");
    }
  }

  async function handleOpenManual() {
    if (!manual || isOpening) {
      return;
    }

    setIsOpening(true);
    setError(null);

    try {
      const result = await postJson<ReadUrlResponse>(
        "/api/guidelines/brand-manual/read-url",
      );
      const anchor = document.createElement("a");
      anchor.href = result.readUrl;
      anchor.rel = "noreferrer";
      anchor.target = "_blank";
      anchor.click();
    } catch (readError) {
      const message = getClientErrorMessage(readError);
      setError(message);
      showToast({
        title: "No pudimos abrir el manual",
        description: message,
        tone: "error",
      });
    } finally {
      setIsOpening(false);
    }
  }

  const submitLabel = manual ? "Reemplazar manual" : "Subir manual";
  const phaseLabel = {
    finalizing: "Finalizando...",
    idle: submitLabel,
    preparing: "Preparando...",
    uploading: "Subiendo...",
  }[phase];

  return (
    <Surface
      title="Manual de marca"
      description="Referencia oficial de identidad de SUQUIA."
      action={
        manual ? (
          <Button disabled={isOpening} onClick={handleOpenManual} size="sm">
            <ExternalLink className="mr-1.5 size-4" strokeWidth={1.8} />
            {isOpening ? "Abriendo..." : "Abrir manual"}
          </Button>
        ) : null
      }
    >
      <input
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {manual ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-muted/40 text-muted-foreground">
                <FileText className="size-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Manual de marca
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {manual.originalFilename}
                </p>
                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-subtle-foreground">
                      Actualizado
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {manual.updatedAtLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-subtle-foreground">
                      Subido por
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {manual.uploadedByLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-subtle-foreground">
                      Tamaño
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {manual.fileSizeLabel}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
          <Button
            disabled={isBusy}
            onClick={openFilePicker}
            size="sm"
            variant="secondary"
          >
            <RefreshCw className="mr-1.5 size-4" strokeWidth={1.8} />
            Reemplazar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Subí el PDF vigente para que el equipo pueda consultarlo.
          </p>
          <Button disabled={isBusy} onClick={openFilePicker}>
            <Upload className="mr-1.5 size-4" strokeWidth={1.8} />
            Subir manual
          </Button>
        </div>
      )}

      {selectedFile ? (
        <div className="mt-4 rounded-[8px] border border-border bg-surface-muted/25 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedFile.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                PDF · {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={isBusy}
                onClick={() => {
                  setSelectedFile(null);
                  setPreparedUpload(null);
                  setError(null);
                }}
                size="sm"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button disabled={isBusy} onClick={handleSubmit} size="sm">
                {phaseLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
          {error}
        </p>
      ) : null}
    </Surface>
  );
}
