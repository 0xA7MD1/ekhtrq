import { cn } from "@/lib/utils";

/**
 * Decorative operation log. Purely visual — nothing here talks to a real lab.
 *
 * Deliberately static: a typing effect is the single clearest tell of a
 * template "hacker" site, so the panel reads as a transcript already on file
 * rather than a live shell performing for the visitor. No client JS.
 */
const COMMAND = "ekhtrq scan --target 10.10.14.7 --deep";

const OUTPUT = [
  { tag: "[*]", tone: "muted", text: "fingerprinting 10.10.14.7 …" },
  { tag: "[+]", tone: "accent", text: "22/tcp    ssh    OpenSSH 8.9p1" },
  { tag: "[+]", tone: "accent", text: "8080/tcp  http   Apache Tomcat 9.0.65" },
  {
    tag: "[!]",
    tone: "alert",
    text: "/manager/html — default credentials accepted",
  },
  {
    tag: "  →",
    tone: "flag",
    text: "foothold confirmed · flag 1/6 captured",
  },
] as const;

const TONE: Record<(typeof OUTPUT)[number]["tone"], string> = {
  muted: "text-[var(--text-muted)]",
  accent: "text-[var(--accent)]",
  alert: "text-[var(--gold)]",
  flag: "text-[var(--accent)]",
};

/** Window buttons. Filled, because three empty rings read as a loading state. */
const DOTS = ["var(--diff-hard)", "var(--gold)", "var(--accent)"];

export function HeroTerminal() {
  return (
    <div
      aria-hidden="true"
      // Shell content is left-to-right regardless of the page direction.
      dir="ltr"
      className="force-ltr rounded-card relative overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.95)]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3">
        {DOTS.map((dot) => (
          <span
            key={dot}
            style={{ background: dot }}
            className="size-2.5 rounded-full"
          />
        ))}
        <span className="mono-label ml-3 text-[10px]">
          EKHTRQ@LAB — MAIL_RELAY
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[var(--accent)]" />
          <span className="mono-label text-[9px] text-[var(--accent)]">
            LIVE
          </span>
        </span>
      </div>

      {/*
       * The shell body is a well cut into the panel — darker than the page
       * itself. That step is what makes the chrome above read as a frame
       * around it rather than another flat band.
       */}
      {/* No scanlines. The darker fill is already what makes this read as a
          screen, and a ruled overlay behind live text is just noise. */}
      <div className="well-noir relative min-h-[268px] space-y-1.5 p-5 font-mono text-[12.5px] leading-6 sm:min-h-[264px] sm:text-[13px]">
        <p className="relative flex flex-wrap items-baseline gap-x-2">
          <span className="text-[var(--accent)]">ekhtrq@lab</span>
          <span className="text-[var(--text-muted)]">~$</span>
          <span className="text-[var(--text-primary)]">{COMMAND}</span>
        </p>

        {OUTPUT.map((line) => (
          <p key={line.text} className="relative flex gap-2">
            <span className={cn("shrink-0", TONE[line.tone])}>{line.tag}</span>
            <span
              className={cn(
                "text-[var(--text-secondary)]",
                line.tone === "flag" && "text-[var(--accent)]",
              )}
            >
              {line.text}
            </span>
          </p>
        ))}

        {/* Resting cursor. Static — a blinking one would perform for the
            visitor, which is what the panel is written to avoid. */}
        <p className="relative flex items-center gap-2">
          <span className="text-[var(--accent)]">ekhtrq@lab</span>
          <span className="text-[var(--text-muted)]">~$</span>
          <span className="inline-block h-4 w-[7px] bg-[var(--accent)]" />
        </p>
      </div>

      {/* Footer strip — one label, not two. */}
      <div className="border-t border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5">
        <span className="mono-label text-[10px]">6 FLAGS · 3 HOSTS</span>
      </div>
    </div>
  );
}
