import Image from "next/image";

type MagicPilusoSignatureProps = {
  align?: "center" | "start";
  variant?: "compact" | "login";
};

export function MagicPilusoSignature({
  align = "center",
  variant = "compact",
}: MagicPilusoSignatureProps) {
  const isLogin = variant === "login";
  const justifyClass = align === "start" ? "justify-start" : "justify-center";
  const logoHeight = 36;
  const logoWidth = 31;

  return (
    <div
      className={`flex items-center ${justifyClass} ${isLogin ? "gap-2" : "gap-1.5"}`}
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
