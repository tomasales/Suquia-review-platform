import Image from "next/image";

type MagicPilusoSignatureProps = {
  variant?: "compact" | "login";
};

export function MagicPilusoSignature({
  variant = "compact",
}: MagicPilusoSignatureProps) {
  const isLogin = variant === "login";

  return (
    <div
      className={`flex flex-col items-center ${isLogin ? "gap-2" : "gap-1.5"}`}
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
        className={`w-auto ${isLogin ? "h-16" : "h-12"}`}
        height={isLogin ? 64 : 48}
        src="/magic-piluso-logo.svg"
        unoptimized
        width={isLogin ? 56 : 42}
      />
    </div>
  );
}
