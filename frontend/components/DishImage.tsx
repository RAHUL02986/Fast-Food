"use client";

import { useEffect, useState } from "react";
import { dishPlaceholder } from "@/lib/dishImages";
import { secureImageUrl } from "@/lib/images";

type DishImageProps = {
  name: string;
  category?: string | null;
  /** The dish's own photo URL, if the owner uploaded one. */
  image?: string | null;
  alt?: string;
  className?: string;
};

/**
 * Renders a dish visual: uses the uploaded photo when present and falls back
 * to an illustrated placeholder matched from the dish name/category. If the
 * photo URL fails to load, it silently swaps to the placeholder.
 */
export default function DishImage({ name, category, image, alt, className = "" }: DishImageProps) {
  const fallback = dishPlaceholder(name, category);
  const [src, setSrc] = useState(secureImageUrl(image) || fallback);

  // Keep in sync when the item (or its photo) changes, e.g. after editing.
  useEffect(() => {
    setSrc(secureImageUrl(image) || dishPlaceholder(name, category));
  }, [image, name, category]);

  return (
    <img
      src={src}
      alt={alt || name}
      className={className}
      loading="lazy"
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
