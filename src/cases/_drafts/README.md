# Drafts — parked cases, not live

The case loader (`src/lib/labs/registry.ts`) only reads **top-level** `.json`
files in `src/cases/`. Anything inside this `_drafts/` subfolder is invisible to
the build, `generateStaticParams`, and every route — exactly so a case can be
written and reviewed before it goes live.

## What's here

- **`02-the-market.json`** — «السوق». Sequel to `01-the-name`: you hunt «الساعي»,
  the broker who sold you the lead in case 01 and then resold the victims.
  Teaches a different chain from case 01 on purpose:

  | Step | Case 01 (live) | Case 02 (this draft) |
  | --- | --- | --- |
  | recon | port scan → dir enum | **DNS** — `dig` leaks the origin behind a CDN |
  | access | crack a bcrypt hash | **exposed secret** — a leaked SSH private key |
  | login | password over SSH | **key auth** — `ssh -i` |
  | privesc | `sudo find` misconfig | **SUID `env`** (`/opt/tools/env /bin/sh -p`) |

  Both the privesc chain and every guide command were played end-to-end through
  the engine before parking it, and it passes `parseLabManifest` (the same
  cross-field validator that runs during `next build`).

## Promoting a draft to live

1. Move the file up one level: `src/cases/_drafts/02-the-market.json` →
   `src/cases/02-the-market.json`. **No edits needed** — the filename already
   matches its `id`.
2. `next build` re-validates it and it appears at `/cases/02-the-market`.

That's the whole step. Nothing imports these files by path, so moving one is the
only thing that turns it on.
