"use client";

import { useEffect } from "react";

import { APP_IDS, useDesktopStore } from "@/store/use-desktop-store";

/**
 * Keyboard control of the desk.
 *
 * Every binding goes through `event.code`, not `event.key`. This is an Arabic
 * product and a player on an Arabic layout gets "ت" where a US layout gets "t"
 * — `code` names the physical key, so the shortcuts survive the layout the
 * player actually types their commands in.
 *
 * `Ctrl+Alt` is the modifier for window management because the terminal owns
 * plain Ctrl (Ctrl+C, Ctrl+L) and the player is typing into it constantly. No
 * binding here can fire while a command is being written.
 */

export type Shortcut = {
  /** Rendered as pressed keys, in order. */
  keys: string[];
  label: string;
};

export const SHORTCUTS: Shortcut[] = [
  { keys: ["Alt", "1—4"], label: "فتح أو إخفاء تطبيق" },
  { keys: ["Ctrl", "Alt", "→"], label: "إلصاق النافذة يمينًا" },
  { keys: ["Ctrl", "Alt", "←"], label: "إلصاق النافذة يسارًا" },
  { keys: ["Ctrl", "Alt", "↑"], label: "ملء الشاشة" },
  { keys: ["Ctrl", "Alt", "↓"], label: "فك الإلصاق أو التصغير" },
  { keys: ["Ctrl", "Alt", "T"], label: "توزيع كل النوافذ" },
  { keys: ["Ctrl", "Alt", "S"], label: "التنقل بين النوافذ" },
  { keys: ["Ctrl", "Alt", "W"], label: "إغلاق النافذة النشطة" },
  { keys: ["Ctrl", "Alt", "R"], label: "استعادة الترتيب الافتراضي" },
  { keys: ["Ctrl", "Alt", "H"], label: "عرض هذه القائمة" },
];

export function useShortcuts(onToggleHelp: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const store = useDesktopStore.getState();
      const viewport = { w: window.innerWidth, h: window.innerHeight };

      // Alt alone: jump to an app by position in the dock.
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(
          event.code,
        );
        if (index !== -1) {
          event.preventDefault();
          store.toggle(APP_IDS[index]);
        }
        return;
      }

      if (!event.ctrlKey || !event.altKey || event.metaKey) return;

      // Layout-wide commands work with nothing focused; the rest need a window
      // to act on, so they resolve the target first.
      switch (event.code) {
        case "KeyT":
          event.preventDefault();
          store.tileAll(viewport);
          return;
        case "KeyR":
          event.preventDefault();
          store.resetLayout(viewport);
          return;
        case "KeyS":
          event.preventDefault();
          store.cycleFocus();
          return;
        case "KeyH":
          event.preventDefault();
          onToggleHelp();
          return;
      }

      const id = store.focused;
      if (!id) return;

      switch (event.code) {
        case "ArrowLeft":
          event.preventDefault();
          store.snapTo(id, "left", viewport);
          break;
        case "ArrowRight":
          event.preventDefault();
          store.snapTo(id, "right", viewport);
          break;
        case "ArrowUp":
          event.preventDefault();
          store.snapTo(id, "full", viewport);
          break;
        // Down steps back out the way it came in: a tiled window drops its
        // tile, and a window that is already free gets out of the way.
        case "ArrowDown":
          event.preventDefault();
          if (store.windows[id].snap) store.release(id, viewport);
          else store.minimize(id);
          break;
        case "KeyW":
          event.preventDefault();
          store.close(id);
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggleHelp]);
}
