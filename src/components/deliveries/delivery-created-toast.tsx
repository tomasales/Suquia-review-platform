"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast";

export function DeliveryCreatedToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (searchParams.get("created") !== "1") {
      return;
    }

    if (hasShownToast.current) {
      return;
    }

    hasShownToast.current = true;

    const pieceCount = Number(searchParams.get("pieces"));
    const pieceCountLabel =
      Number.isFinite(pieceCount) && pieceCount > 0
        ? `${pieceCount} ${pieceCount === 1 ? "pieza lista" : "piezas listas"} para revisar.`
        : "Las piezas quedaron listas para revisar.";

    showToast({
      title: "Entrega creada",
      description: pieceCountLabel,
      tone: "success",
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("created");
    nextSearchParams.delete("pieces");

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, showToast]);

  return null;
}
