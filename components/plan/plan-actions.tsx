"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanActions({ text }: { text: () => string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setStatus("Build copiada.");
    } catch {
      setStatus("No pudimos copiar. Selecciona el texto para copiarlo.");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" onClick={() => void copy()}>
        <Copy size={17} aria-hidden="true" />
        Copiar build
      </Button>
      <span role="status" className="text-small text-neutral-400">
        {status}
      </span>
    </div>
  );
}
