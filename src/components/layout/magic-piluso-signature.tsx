import Image from "next/image";

type MagicPilusoSignatureProps = {
  variant?: "compact" | "login";
};

export function MagicPilusoSignature({
  variant = "compact",
}: MagicPilusoSignatureProps) {
  const isLogin = variant === "login";
  const logoHeight = isLogin ? 32 : 24;
  const logoWidth = isLogin ? 28 : 21;

  return (
    <div
      className={`flex items-center justify-center ${isLogin ? "gap-2" : "gap-1.5"}`}
    >
      <span
        className={`text-subtle-foreground ${
          isLogin ? "text-[11px]" : "text-[10px]"
        }`}
      >
        Creado por
      </span>
      <Image
        alt="Magic Piluso"
        className="h-auto"
        height={logoHeight}
        src="/magic-piluso-logo.svg"
        unoptimized
        width={logoWidth}
      />
    </div>
  );
}
