"use client";

import { useState } from "react";
import { ArrowRight, Download, Globe, House, Search, TriangleAlert } from "lucide-react";

import type { LabManifest } from "@/lib/labs/schema";
import { hasFlags } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";

/**
 * The fake internet.
 *
 * Nothing here fetches anything. A query is matched against the manifest's
 * phrase map and a URL against its `sites` map; everything else is a dead
 * host. Pages are authored markup rendered as-is — trusted content from our
 * own JSON, never player input.
 */
export function BrowserApp({ manifest }: { manifest: LabManifest }) {
  const session = useLabStore((store) => store.session);
  const view = useLabStore((store) => store.browser);
  const input = useLabStore((store) => store.browserInput);
  const canGoBack = useLabStore((store) => store.browserHistory.length > 0);
  const setInput = useLabStore((store) => store.setBrowserInput);
  const navigate = useLabStore((store) => store.navigate);
  const goHome = useLabStore((store) => store.goHome);
  const back = useLabStore((store) => store.back);
  const download = useLabStore((store) => store.download);

  const [homeQuery, setHomeQuery] = useState("");

  if (!session) return null;

  /** Anchors inside authored pages navigate the fake browser, never the app. */
  function onPageClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    event.preventDefault();
    const href = anchor.getAttribute("href");
    if (href) navigate(href);
  }

  const site = view.kind === "site" ? manifest.browser.sites[view.url] : null;
  const downloads =
    site?.downloads.filter((item) => hasFlags(manifest, session, item.requires)) ??
    [];

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2">
        <button
          type="button"
          onClick={back}
          disabled={!canGoBack}
          aria-label="رجوع"
          className="grid size-7 shrink-0 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          <ArrowRight className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={goHome}
          aria-label="الصفحة الرئيسية"
          className="grid size-7 shrink-0 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <House className="size-4" strokeWidth={1.75} />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate(input);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-2.5 py-1.5"
        >
          <Globe
            className="size-3.5 shrink-0 text-[var(--text-muted)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            dir="ltr"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="ابحث أو اكتب عنوانًا"
            aria-label="شريط العنوان"
            className="force-ltr min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-[var(--text-primary)] outline-none placeholder:font-sans placeholder:text-[var(--text-muted)]"
          />
        </form>
      </div>

      <div
        onClick={onPageClick}
        className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-base)]"
      >
        {view.kind === "blank" ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 px-6">
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <Search className="size-5 text-[var(--accent)]" strokeWidth={1.75} />
              <span className="text-lg font-bold text-[var(--text-primary)]">
                بحث
              </span>
            </span>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate(homeQuery);
                setHomeQuery("");
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2.5"
            >
              <input
                value={homeQuery}
                onChange={(event) => setHomeQuery(event.target.value)}
                placeholder="ابحث في الشبكة…"
                aria-label="بحث"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="rounded-md bg-[var(--paper)] px-3 py-1 text-[12.5px] font-bold text-[var(--paper-foreground)] transition-colors hover:bg-[var(--paper-hover)]"
              >
                بحث
              </button>
            </form>

            <p className="text-center text-[12.5px] leading-[1.9] text-[var(--text-muted)]">
              كل ما تحتاجه للوصول إلى الهدف موجود على هذه الشبكة. ابدأ بما تعرفه.
            </p>
          </div>
        ) : null}

        {view.kind === "results" ? (
          <div className="mx-auto max-w-2xl px-5 py-5">
            {/* The query is the player's own text and can be either script;
                isolating it keeps the guillemets on the right sides of it. */}
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              نتائج البحث عن «
              <span dir="auto" className="bidi-isolate">
                {view.query}
              </span>
              »
            </p>
            <ul className="flex flex-col gap-2">
              {view.results.map((result) => (
                <li key={result.url}>
                  <button
                    type="button"
                    onClick={() => navigate(result.url)}
                    className="block w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 text-start transition-colors hover:border-[var(--accent)]"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {result.title}
                      </span>
                      {result.badge ? (
                        <span className="rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                          {result.badge}
                        </span>
                      ) : null}
                    </span>
                    <span
                      dir="ltr"
                      className="force-ltr mt-1 block font-mono text-[11.5px] text-[var(--accent)]"
                    >
                      {result.url}
                    </span>
                    {result.snippet ? (
                      <span className="mt-1.5 block text-[12.5px] leading-[1.85] text-[var(--text-secondary)]">
                        {result.snippet}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {view.kind === "noResults" ? (
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              {manifest.browser.noResults}
            </p>
            <p className="mt-2 text-[12.5px] text-[var(--text-muted)]">
              لم يُعثر على «
              <span dir="auto" className="bidi-isolate">
                {view.query}
              </span>
              ».
            </p>
          </div>
        ) : null}

        {view.kind === "offline" ? (
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <TriangleAlert
              className="mx-auto size-7 text-[var(--gold)]"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="mt-3 text-[14px] font-semibold text-[var(--text-primary)]">
              {manifest.browser.offline}
            </p>
            <p dir="ltr" className="force-ltr mt-2 font-mono text-[11.5px] text-[var(--text-muted)]">
              {view.url}
            </p>
          </div>
        ) : null}

        {view.kind === "site" && site ? (
          <article className="mx-auto max-w-2xl px-5 py-5">
            <div
              className="lab-page"
              // Authored page markup from the case manifest — never user input.
              dangerouslySetInnerHTML={{ __html: site.html }}
            />

            {downloads.length > 0 ? (
              <div className="mt-5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3">
                <p className="mono-label mb-2 text-[9.5px]">FILES ON THIS PAGE</p>
                <ul className="flex flex-col gap-1.5">
                  {downloads.map((item) => (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => download(item)}
                        className="flex w-full items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-start transition-colors hover:border-[var(--accent)]"
                      >
                        <Download
                          className="size-4 shrink-0 text-[var(--accent)]"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span
                          dir="ltr"
                          className="force-ltr min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--text-primary)]"
                        >
                          {item.label ?? item.path}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                          تنزيل
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>
  );
}
