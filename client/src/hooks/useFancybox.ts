import { Fancybox } from "@fancyapps/ui/dist/fancybox/";
import type { FancyboxOptions } from "@fancyapps/ui/dist/fancybox/";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { useEffect, useRef } from "react";

export function useFancyboxBind(options: Partial<FancyboxOptions> = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    Fancybox.bind(root, "[data-fancybox]", {
      Carousel: { infinite: true },
      theme: "dark",
      ...options,
    });

    return () => {
      Fancybox.unbind(root);
      Fancybox.close();
    };
  }, [options]);

  return rootRef;
}

export function openFancyboxGallery(
  items: { src: string; caption?: string; thumb?: string }[],
  startIndex = 0,
  options: Partial<FancyboxOptions> = {},
) {
  Fancybox.show(
    items.map((item) => ({
      src: item.src,
      type: "image" as const,
      caption: item.caption,
      thumb: item.thumb ?? item.src,
    })),
    {
      startIndex,
      Carousel: { infinite: true },
      theme: "dark",
      ...options,
    },
  );
}
