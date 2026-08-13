import Image from "next/image";

type PiecePreviewProps = {
  aspect: "feed" | "story";
  imageSrc: string | null;
  label: string;
  mode?: "card" | "modal" | "reference";
};

export function PiecePreview({
  aspect,
  imageSrc,
  label,
  mode = "card",
}: PiecePreviewProps) {
  const frame =
    aspect === "story"
      ? mode === "modal"
        ? "h-full max-h-[76vh] aspect-[9/16]"
        : "aspect-[9/16]"
      : mode === "modal"
        ? "h-[72vh] max-h-[680px] aspect-square max-w-full"
        : "aspect-square";

  const base =
    mode === "reference"
      ? "aspect-[4/3] w-full"
      : `${frame} ${mode === "modal" ? "max-w-full" : "w-full"}`;

  return (
    <div
      className={`relative ${base} overflow-hidden rounded-[8px] border border-border bg-surface-muted`}
    >
      {imageSrc ? (
        <Image
          alt={label}
          className="h-full w-full object-contain"
          fill
          sizes={
            mode === "modal"
              ? "(min-width: 1024px) 760px, 100vw"
              : "(min-width: 1024px) 220px, 45vw"
          }
          src={imageSrc}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
          Preview no disponible
        </div>
      )}
    </div>
  );
}
