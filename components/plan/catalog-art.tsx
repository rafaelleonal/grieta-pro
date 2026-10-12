"use client";
import { useState } from "react";
import Image from "next/image";
import { Gem, Package, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";

type ArtKind = "item" | "rune" | "spell" | "style";
/** Catalogue artwork with a stable frame and an explicit fallback for missing assets. */
export function CatalogArt({
  entry,
  kind,
  prominent = false,
}: {
  entry?: { image: string; name: string };
  kind: ArtKind;
  prominent?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const Icon = kind === "item" ? Package : kind === "spell" ? Zap : Gem;
  const available = entry?.image && failedSource !== entry.image;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-divider bg-bg",
        prominent ? "size-14" : "size-11",
      )}
    >
      {available ? (
        <Image
          src={entry.image}
          alt=""
          width={prominent ? 56 : 44}
          height={prominent ? 56 : 44}
          loading="lazy"
          unoptimized
          onError={() => setFailedSource(entry.image)}
          className={cn(
            "size-full",
            kind === "rune" || kind === "style" ? "object-contain p-1" : "object-cover",
          )}
        />
      ) : (
        <Icon size={24} className="text-neutral-500" />
      )}
    </span>
  );
}

/** Older plans can store a displayed name rather than a catalogue ID. Never guess a match. */
export function resolveEntry<T extends { name: string }>(entries: Map<string, T>, value: string) {
  return entries.get(value) || [...entries.values()].find((entry) => entry.name === value);
}
