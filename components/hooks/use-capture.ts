"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/image-upload";
import type { DraftResult } from "@/lib/types";

/**
 * Foto, captura o texto del draft. La imagen se optimiza en el dispositivo antes de
 * subirla; cada selección nueva invalida la preparación anterior.
 */
export function useCapture() {
  const [draftText, setDraftText] = useState("");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [pendingImageName, setPendingImageName] = useState("");
  const [imageDetails, setImageDetails] = useState<{
    originalBytes: number;
    wasCompressed: boolean;
  } | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const request = useRef(0);

  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  const readImage = useCallback(
    async (
      file: File | undefined,
      { onStart, onError }: { onStart: () => void; onError: (message: string) => void },
    ) => {
      if (!file) return;
      const current = ++request.current;
      onStart();
      setDraft(null);
      setPendingImageName(file.name);
      setPreparingImage(true);
      try {
        const prepared = await prepareImage(file);
        if (request.current !== current) return;
        setImage(prepared.dataUrl);
        setImageName(file.name);
        setImageDetails({
          originalBytes: prepared.originalBytes,
          wasCompressed: prepared.wasCompressed,
        });
      } catch (cause) {
        if (request.current !== current) return;
        onError(
          cause instanceof Error
            ? cause.message
            : "No pudimos leer la imagen. Vuelve a seleccionarla.",
        );
      } finally {
        if (request.current === current) {
          setPreparingImage(false);
          setPendingImageName("");
        }
      }
    },
    [],
  );

  const clearImage = useCallback(() => {
    request.current += 1;
    setImage("");
    setImageName("");
    setPendingImageName("");
    setImageDetails(null);
    setPreparingImage(false);
    setDraft(null);
  }, []);

  const cancelImagePreparation = useCallback(() => {
    request.current += 1;
    setPreparingImage(false);
    setPendingImageName("");
    setDraft(null);
  }, []);

  /** Limpia todo lo privado de la captura (cambio de cuenta o salida). */
  const reset = useCallback(() => {
    clearImage();
    setDraftText("");
  }, [clearImage]);

  return {
    draftText,
    setDraftText,
    image,
    imageName,
    pendingImageName,
    imageDetails,
    preparingImage,
    draft,
    setDraft,
    readImage,
    clearImage,
    cancelImagePreparation,
    reset,
  };
}

export type Capture = ReturnType<typeof useCapture>;
