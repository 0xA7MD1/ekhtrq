import { BookOpen, FolderOpen, Globe, SquareTerminal } from "lucide-react";

import type { AppId } from "@/store/use-desktop-store";

/**
 * One description of each app, shared by the dock, the window title bars and
 * the status bar — so a rename lands everywhere at once.
 */
export const APP_META: Record<
  AppId,
  {
    title: string;
    /** Latin micro-label, in the type system's tracked-out mono style. */
    code: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }
> = {
  terminal: { title: "الطرفية", code: "SHELL", icon: SquareTerminal },
  browser: { title: "المتصفح", code: "NET", icon: Globe },
  files: { title: "الملفات", code: "FS", icon: FolderOpen },
  guide: { title: "الدليل", code: "GUIDE", icon: BookOpen },
};
