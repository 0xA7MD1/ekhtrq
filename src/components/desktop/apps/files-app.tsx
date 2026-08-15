"use client";

import { useState } from "react";
import { ChevronLeft, FileLock, FileText, Folder, HardDrive } from "lucide-react";

import type { LabManifest } from "@/lib/labs/schema";
import {
  basename,
  canRead,
  dirname,
  listDir,
  type DirEntry,
} from "@/lib/sim/filesystem";
import { currentUser, hostFiles } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";
import { cn } from "@/lib/utils";

/**
 * The file manager.
 *
 * A window onto the same virtual filesystem the terminal walks — authored
 * files plus everything picked up during play. Hidden files stay hidden and
 * root-owned files stay unreadable, so browsing can never hand a player
 * something `cat` would have refused.
 */
export function FilesApp({ manifest }: { manifest: LabManifest }) {
  const session = useLabStore((store) => store.session);
  const [dir, setDir] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  if (!session) return null;

  const user = currentUser(manifest, session);
  const files = hostFiles(manifest, session);
  const host = manifest.hosts[session.hostKey];
  // `dir` is null until the player navigates, so switching hosts drops them
  // back at that host's home rather than a path that no longer exists.
  const cwd = dir ?? host.home;
  const entries = listDir(files, cwd);
  const openNode = selected ? files[selected] : null;

  const crumbs = cwd === "/" ? ["/"] : ["/", ...cwd.slice(1).split("/")];

  function openEntry(entry: DirEntry) {
    if (entry.isDir) {
      setDir(entry.path);
      setSelected(null);
      return;
    }
    setSelected(entry.path);
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2">
        <button
          type="button"
          onClick={() => {
            setDir(dirname(cwd));
            setSelected(null);
          }}
          disabled={cwd === "/"}
          aria-label="المجلد الأعلى"
          className="grid size-7 shrink-0 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          <ChevronLeft className="size-4 rotate-180" strokeWidth={1.75} />
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1">
          <HardDrive
            className="size-3.5 text-[var(--accent)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span dir="ltr" className="font-mono text-[11.5px] text-[var(--text-primary)]">
            {host.hostname}
          </span>
        </span>

        <nav
          dir="ltr"
          className="force-ltr flex min-w-0 flex-1 items-center gap-1 overflow-x-auto font-mono text-[11.5px]"
        >
          {crumbs.map((crumb, index) => {
            const path =
              index === 0 ? "/" : `/${crumbs.slice(1, index + 1).join("/")}`;
            return (
              <span key={path} className="flex shrink-0 items-center gap-1">
                {index > 0 ? (
                  <span className="text-[var(--text-muted)]">/</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setDir(path);
                    setSelected(null);
                  }}
                  className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  {index === 0 ? "/" : crumb}
                </button>
              </span>
            );
          })}
        </nav>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,240px)_1fr]">
        <ul className="min-h-0 overflow-y-auto border-e border-[var(--border-strong)] bg-[var(--bg-surface)] p-1.5">
          {entries.length === 0 ? (
            <li className="px-2 py-3 text-[12px] text-[var(--text-muted)]">
              المجلد فارغ.
            </li>
          ) : null}

          {entries.map((entry) => {
            const locked = entry.node ? !canRead(entry.node, user) : false;
            const Icon = entry.isDir ? Folder : locked ? FileLock : FileText;

            return (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => openEntry(entry)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-start transition-colors",
                    selected === entry.path
                      ? "border-[var(--accent)] bg-[var(--bg-elevated)]"
                      : "border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      locked
                        ? "text-[var(--diff-hard)]"
                        : entry.isDir
                          ? "text-[var(--gold)]"
                          : "text-[var(--text-muted)]",
                    )}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span
                    dir="ltr"
                    className="force-ltr min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--text-primary)]"
                  >
                    {entry.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="min-h-0 overflow-y-auto bg-[var(--bg-base)]">
          {!openNode ? (
            <p className="px-4 py-6 text-[12.5px] leading-[1.9] text-[var(--text-muted)]">
              اختر ملفًا لعرض محتواه. الملفات المحمية تحتاج صلاحيات أعلى.
            </p>
          ) : !canRead(openNode, user) ? (
            <div className="px-4 py-6">
              <p className="text-[13px] font-semibold text-[var(--diff-hard)]">
                لا تملك صلاحية قراءة هذا الملف.
              </p>
              <p
                dir="ltr"
                className="force-ltr mt-2 font-mono text-[11.5px] text-[var(--text-muted)]"
              >
                owner: {openNode.locked} · you: {user}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
                <span
                  dir="ltr"
                  className="force-ltr truncate font-mono text-[12px] text-[var(--text-primary)]"
                >
                  {openNode.label ?? basename(selected ?? "")}
                </span>
                <span className="mono-label shrink-0 text-[9.5px]">
                  {openNode.kind}
                </span>
              </div>

              {openNode.kind === "image" ? (
                <div className="p-3">
                  {/* Authored data/asset URL from the manifest. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={openNode.content}
                    alt={openNode.label ?? "ملف صورة"}
                    className="max-w-full rounded-md border border-[var(--border-strong)]"
                  />
                </div>
              ) : (
                /* A file's contents are whatever the case wrote — Arabic
                   notes as often as Latin dumps — so each line takes its own
                   direction instead of the whole view being forced LTR. */
                <pre className="bidi-plaintext flex-1 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-[1.7] whitespace-pre-wrap text-[var(--text-secondary)]">
                  {openNode.content}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
