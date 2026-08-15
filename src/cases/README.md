# Adding a case

A case is one JSON file in this folder. The engine is generic: it renders the
desktop, the terminal, the browser, the files and the guide entirely from the
manifest you write here. **Adding a case is never a code change** — drop a
`.json` file in, and it appears at its own route.

```
src/cases/01-the-name.json   →   /cases/01-the-name
src/cases/02-your-case.json  →   /cases/02-your-case   (once you add it)
```

`_shared/` is not a case — it holds content every case draws on, starting with
[`toolbox.json`](_shared/toolbox.json), the Arabic manual for every tool the
platform simulates.

Four rules the loader enforces at build time, so a broken case fails loudly
instead of shipping:

1. **The filename is the URL and the id.** `02-your-case.json` must set
   `"id": "02-your-case"`.
2. **Every objective must be reachable.** If an objective waits on a flag
   nothing grants, or has no guide entry, the build stops and tells you which.
3. **Every tool you install must be documented.** A name in `tools` with no
   entry in the toolbox fails the build — otherwise `help` and `man` would have
   nothing to say about it.
4. **Every command the Guide prints must actually run.** Each `code` line in a
   guide block is tested against your terminal rules. A Guide that tells a
   stuck player to type something the engine rejects is the worst bug this
   platform can ship, so it can't be committed.

## The mental model

Everything the terminal, browser and files "do" is a lookup. There is no real
network, shell or filesystem — just scripted strings keyed by where the player
is and what they've unlocked.

- **Flags are the only state.** The session holds a `Set<string>`. A command,
  a download or a visited page can `unlock` flags; other commands, files and
  pages are gated behind `requires`. That single mechanism is what makes the
  path linear-but-earned: you can't `john` a hash you never downloaded.
- **The current user is also a flag.** A privesc that sets `user: "root"`
  satisfies both `"requires": "root"` and `"done": "root"` — no separate
  concept.
- **Objectives read flags.** `objectives[].done` names the flag that completes
  each step; the progress bar, the top-bar chip and the active guide entry all
  derive from that.

Design the flag graph first. For Mission 01 it is:

```
(browser) robots.txt ─┐
                      ├─► dir_found ─► [download admin.bak] ─► hash_downloaded
(nmap) port_scan_done ─┘                                              │
   └─► (gobuster) dir_found                                          ▼
                                                        (john) creds_cracked
                                                                     │
                                            (ssh + password) ssh_ok ◄┘  → switch host
                                                                     │
                                                (sudo -l) privesc_vector
                                                                     │
                                        (sudo find -exec) user=root ◄┘
                                                                     │
                                          (cat /root/victims.db) data_exfiltrated
                                                                     │
                                    (sh restore_to_owners.sh) mission_complete
```

## Manifest shape

The authoritative definition is the zod schema in
[`src/lib/labs/schema.ts`](../lib/labs/schema.ts) — read it alongside this. The
big pieces:

| Key | What it is |
| --- | --- |
| `intro` | The cold open shown before the desktop boots (`headline`, `body`, `mission`). |
| `hosts` | Each machine the player can sit at: its own `filesystem`, `prompt`, login `user`. The first host is the start; `matrix` becomes reachable only after `ssh_ok`. |
| `tools` | Which tools are installed on this case's machines. Every name must exist in [`_shared/toolbox.json`](_shared/toolbox.json), which supplies its `help` line, its `man` page and its failure text. |
| `terminal` | The scripted commands. Ordered — the first rule whose `match`, `host` and `requires` all fit wins. |
| `browser` | `search` (query → result cards), `sites` (url → authored page), and the downloads a page can hand to Files. |
| `objectives` | Ordered list; each `done` is the flag that completes it. |
| `guide` | Three layers per objective id: `nudge` → `hint` → `solution` (+ optional `concept`). See [Writing a guide layer](#writing-a-guide-layer). |
| `completion` | The flag that ends the case, the closing `message`, and a `teaser` for the next one. |

### Shorthands

- A filesystem entry can be a bare string — `"/home/guest/notes.txt": "hi"` is
  the same as `{ "content": "hi" }`.
- `unlocks`, `requires`, `host` accept a string or an array: `"unlocks": "x"`
  and `"unlocks": ["x","y"]` both work.
- Regex `match` is tested case-insensitively by default. In JSON, escape
  backslashes: match a literal dot with `"\\."`.

### A terminal rule

```jsonc
{
  "host": "local",                       // omit for "any host"
  "match": "^gobuster\\s+.*target\\.io", // regex against the input line
  "requires": "port_scan_done",          // gate on flags
  "lockedOutput": "…realistic failure…", // shown when the gate is unmet
  "output": "…scripted result…",
  "stream": true,                        // reveal line by line
  "delayMs": 1100,                       // "working…" pause first
  "unlocks": "dir_found"                 // flags granted on success
}
```

For an interactive step (an `ssh` password), add `prompt` + `expectInput`;
the next line the player types is checked against `expectInput`, and
`onSuccess` can `switchHost`, `setState`, `setUser`, `addFiles`.

## Writing a guide layer

Prose and commands are separate fields. This is not cosmetic: a command buried
inside an Arabic sentence gets reordered by the bidirectional algorithm, so its
slashes and punctuation land on the wrong side and the player copies something
subtly broken. Keep the sentence in `text`, the commands in `code`.

```jsonc
"crack": {
  "nudge": "وجدت النسخة الاحتياطية…",          // a bare string is still fine
  "hint": {
    "text": "نزّل الملف ثم اكسر التجزئة:",      // Arabic prose only
    "code": "john admin.bak"                    // one command, or an array
  },
  "solution": {
    "text": "نزّل الملف من صفحة `/backups`:",   // `backticks` → inline chip
    "code": [
      "wget http://target.io/backups/admin.bak",
      "john admin.bak"
    ],
    "note": "ستنتهي الأداة بسطر يحمل كلمة المرور."
  },
  "concept": "المواقع لا تخزّن كلمات المرور كنصّ صريح…"
}
```

- `code` renders as one copyable block, left-to-right and monospaced, with a
  copy button. Use a second layer if two commands must be copied separately.
- Backticks inside `text` become small isolated Latin chips — use them for a
  filename, a path or a single flag. Never for a whole command.
- Anything in `code` whose first word is one of this case's `tools` is checked
  against your terminal rules at build time.
- Never hand-place LRM/RLM marks to force direction. Every block renders with
  `dir="auto"`, so a correctly split layer needs no invisible characters.

## The toolbox

`_shared/toolbox.json` is one Arabic manual per tool, shared by every case:

```jsonc
"john": {
  "category": "كسر التجزئة",
  "summary": "يكسر تجزئات كلمات المرور بالتخمين.",  // the `help` line
  "description": "التجزئة دالّة أحادية الاتجاه…",   // the teaching paragraph
  "usage": "john [options] <hash-file>",
  "options":  [{ "flag": "--show", "note": "اعرض ما سبق كسره." }],
  "examples": [{ "code": "john admin.bak", "note": "اكسر تجزئة الملف." }],
  "errors": {
    "noTarget": "No password hashes loaded (see FAQ)",  // run bare
    "noMatch":  "No password hashes loaded (see FAQ)"   // run off-path
  }
}
```

A case never repeats this. It picks the tool by name in `tools`, and scripts
what that tool *does here* with terminal rules. `man <tool>` prints the page,
`<tool> --help` prints the usage, and `help` lists everything installed.

Both `errors` strings are what the player sees when a command doesn't lead
anywhere, so they must read as ordinary tool failures and stay identical no
matter how close the player is — see below.

## The one rule that matters most

**Off-path input must never leak a hint.** An unmet gate, an unknown command,
a dead URL — all return a plain, realistic failure that looks identical whether
the player is one step away or completely lost. The *only* place that tells a
player what to do next is the Guide. Keep it that way: it is the whole reason
hints are a deliberate, three-layer choice instead of something the game blurts
out by accident.

## Checklist before you commit

- [ ] `id` matches the filename.
- [ ] Play it start → finish. Every objective flips.
- [ ] Every objective is unblockable from the Guide's three layers alone.
- [ ] Off-path commands and wrong URLs give realistic negatives — no leaks.
- [ ] Every tool in `tools` reads well under `man`, and its `help` line is true.
- [ ] Guide prose holds no full commands, and no invisible direction marks.
- [ ] `pnpm lint` and `npx tsc --noEmit` pass (the loader validates the
      manifest during `next build`; `listCases()` validates them all at once).

## Progress persistence (optional)

Progress saves to `localStorage` for everyone automatically. For signed-in
players it also mirrors to Postgres via `/api/progress` — but only once Clerk
and `DATABASE_URL` are configured. Until then the route reports "no mirror" and
play stays fully offline. If you add the database, apply the migration in
[`/drizzle`](../../drizzle) with `npx drizzle-kit migrate`.
