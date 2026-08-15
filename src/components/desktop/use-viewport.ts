"use client";

import { useEffect, useState } from "react";

/**
 * The live viewport size.
 *
 * Null until mount on purpose: the server has no window, and anything that
 * needs real pixels — a snap ghost, a tile picker — has nothing honest to draw
 * before it knows them. Callers render nothing rather than guess.
 */
export function useViewport() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return size;
}
