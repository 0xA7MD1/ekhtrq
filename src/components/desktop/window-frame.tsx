"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";

import {
  MIN_HEIGHT,
  MIN_WIDTH,
  TOP_BAR_HEIGHT,
  edgeZone,
  magnetize,
  useDesktopStore,
  type AppId,
  type SnapZone,
  type WindowRect,
} from "@/store/use-desktop-store";
import { cn } from "@/lib/utils";

/**
 * A draggable, resizable, snappable window.
 *
 * Pointer events are bound to `window` for the duration of a gesture rather
 * than to the grip, so a fast drag that outruns the cursor doesn't drop the
 * window — the same reason real window managers grab the pointer.
 *
 * Geometry is absolute `left`/`top`, unaffected by the page's RTL direction.
 * The chrome, though, is not: this is an Arabic desktop, so the window controls
 * sit at the top-right corner where the page starts.
 */

type Direction = "n" | "e" | "w" | "s" | "ne" | "nw" | "se" | "sw";

/**
 * Grips sit just outside the frame so they never steal a click from the app
 * inside — a 6px strip over the content would eat the terminal's scrollbar.
 */
const GRIPS: { dir: Direction; className: string; cursor: string }[] = [
  { dir: "n", className: "-top-1 right-3 left-3 h-2", cursor: "ns-resize" },
  { dir: "s", className: "-bottom-1 right-3 left-3 h-2", cursor: "ns-resize" },
  { dir: "e", className: "-right-1 top-3 bottom-3 w-2", cursor: "ew-resize" },
  { dir: "w", className: "-left-1 top-3 bottom-3 w-2", cursor: "ew-resize" },
  { dir: "ne", className: "-top-1 -right-1 size-4", cursor: "nesw-resize" },
  { dir: "nw", className: "-top-1 -left-1 size-4", cursor: "nwse-resize" },
  { dir: "se", className: "-bottom-1 -right-1 size-4", cursor: "nwse-resize" },
  { dir: "sw", className: "-bottom-1 -left-1 size-4", cursor: "nesw-resize" },
];

/** Movement needed before a snapped window lets go of its tile. */
const RELEASE = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

/**
 * Holds the gesture's cursor across the whole page and stops text selecting
 * while a window is dragged. Returns the undo, to be called when the gesture
 * ends — including when the pointer is cancelled.
 */
function lockPointer(cursor: string) {
  const { style } = document.body;
  const previous = { cursor: style.cursor, select: style.userSelect };

  style.cursor = cursor;
  style.userSelect = "none";

  return () => {
    style.cursor = previous.cursor;
    style.userSelect = previous.select;
  };
}

/**
 * A title-bar control. The colour alone says nothing to someone who hasn't
 * used macOS, so each one carries its own mark: × closes, − hides, ⤢ fills.
 *
 * Sized to be hit, not admired. macOS can afford 12px dots because the muscle
 * memory is already there; here the marks have to be legible enough to read
 * before the first click, so the paint is 28px and the mark inside it 14px —
 * a control you aim at, not one you hunt for. The pseudo-element still pushes
 * the hit area out past the paint by 4px a side — exactly the gap between two
 * controls, so the targets meet without ever overlapping onto the wrong one.
 */
function Control({
  label,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  tone: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // The title bar is a drag handle and a double-click target; a control
      // press is neither.
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={onClick}
      style={{ backgroundColor: tone }}
      className="relative grid size-7 place-items-center rounded-full border border-black/50 text-black/80 transition-[filter] before:absolute before:-inset-1 before:content-[''] hover:brightness-125"
    >
      <Icon className="size-3.5" strokeWidth={2.75} />
    </button>
  );
}

/**
 * The tile picker that drops out of the maximize control.
 *
 * Dragging a window into a screen edge is the fast way to tile it, but it is
 * also invisible — nothing on screen says the edges do anything. This is the
 * discoverable half of the same feature: every layout drawn as the shape it
 * produces, so it can be read rather than learned.
 */
const LAYOUTS: { zone: SnapZone; label: string; className: string }[][] = [
  [{ zone: "full", label: "ملء الشاشة", className: "col-span-2 h-12" }],
  [
    { zone: "left", label: "النصف الأيسر", className: "h-12" },
    { zone: "right", label: "النصف الأيمن", className: "h-12" },
  ],
  [
    { zone: "top-left", label: "الربع الأعلى الأيسر", className: "h-8" },
    { zone: "top-right", label: "الربع الأعلى الأيمن", className: "h-8" },
    { zone: "bottom-left", label: "الربع الأسفل الأيسر", className: "h-8" },
    { zone: "bottom-right", label: "الربع الأسفل الأيمن", className: "h-8" },
  ],
];

/**
 * The menu is drawn over the desk, not inside the window, so its width is no
 * longer rationed against the narrowest window the desktop allows (380px). The
 * tiles are scale drawings of the layouts they produce, and at the old 168px
 * the quarters came out as slivers too small to read as quarters.
 */
const MENU_WIDTH = 244;
/** Bar-to-menu gap. Bridged, so a hover survives the pointer crossing it. */
const MENU_GAP = 8;
/**
 * Fixed-size content, so its height is knowable without measuring — which lets
 * the menu decide to open upwards before it is ever painted, instead of
 * dropping off the bottom of the screen and then jumping. Keep it in step with
 * the padding and row heights above.
 */
const MENU_HEIGHT = 238;

/**
 * Mounted only while it is open — which also keeps the layout effect below off
 * the server, where it would neither run nor be legal.
 */
function SnapMenu({
  anchor,
  active,
  onPick,
  onHold,
  onRelease,
}: {
  anchor: React.RefObject<HTMLDivElement | null>;
  active: SnapZone | null;
  onPick: (zone: SnapZone) => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const [box, setBox] = useState<{
    left: number;
    top: number;
    /** Opened upwards, because there was no room below the bar. */
    flipped: boolean;
  } | null>(null);

  // Measured from the control group on open, because the thing it hangs off
  // moves — every drag, every snap. Placed before paint, so the menu never
  // shows up in the wrong corner first.
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;

      const below = rect.bottom + MENU_GAP;
      const flip = below + MENU_HEIGHT > window.innerHeight - 8;

      setBox({
        // The menu's start edge — the right one, on this RTL page — meets the
        // control group's, so it grows inwards over the window rather than off
        // the corner. Clamped for a window dragged half off the screen.
        left: clamp(
          rect.right - MENU_WIDTH,
          8,
          window.innerWidth - MENU_WIDTH - 8,
        ),
        top: flip ? Math.max(8, rect.top - MENU_GAP - MENU_HEIGHT) : below,
        flipped: flip,
      });
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);

  if (!box) return null;

  // Portalled to the body, which is the whole point: as a child of the title
  // bar it was clipped by the wrapper that rounds the window's corners, and
  // buried under any window stacked above this one. Out here it floats over
  // the desk at a z above every window and the dock, and can be drawn at the
  // size the tiles need.
  return createPortal(
    <div
      style={{ left: box.left, top: box.top, width: MENU_WIDTH }}
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      // Pressing bare desk dismisses the snap offer, and pressing the title bar
      // drags the window. The menu is neither.
      onPointerDown={(event) => event.stopPropagation()}
      // The `before` strip covers the gap back to the title bar — on whichever
      // side the bar ended up — so the pointer is never over nothing on its way
      // here and the hover doesn't break mid-travel.
      className={cn(
        "snap-menu fixed z-[950] before:absolute before:inset-x-0 before:h-2 before:content-['']",
        box.flipped ? "before:-bottom-2" : "before:-top-2",
      )}
    >
      <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 shadow-[0_22px_50px_-18px_rgba(0,0,0,0.95)]">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-[var(--text-primary)]">
            ترتيب النافذة
          </p>
          <span className="mono-label text-[9px]">SNAP</span>
        </div>

        <div className="flex flex-col gap-2">
          {LAYOUTS.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              {row.map((tile) => (
                <button
                  key={tile.zone}
                  type="button"
                  title={tile.label}
                  aria-label={tile.label}
                  aria-pressed={active === tile.zone}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onPick(tile.zone)}
                  className={cn(
                    "rounded-[4px] border-2 transition-colors",
                    tile.className,
                    active === tile.zone
                      ? "border-[var(--accent)] bg-[var(--accent-fill)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-fill)]",
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function WindowFrame({
  id,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  id: AppId;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  const state = useDesktopStore((store) => store.windows[id]);
  const focused = useDesktopStore((store) => store.focused === id);
  const focus = useDesktopStore((store) => store.focus);
  const close = useDesktopStore((store) => store.close);
  const minimize = useDesktopStore((store) => store.minimize);
  const toggleMaximize = useDesktopStore((store) => store.toggleMaximize);
  const snapTo = useDesktopStore((store) => store.snapTo);
  const float = useDesktopStore((store) => store.float);
  const setPreview = useDesktopStore((store) => store.setPreview);
  const move = useDesktopStore((store) => store.move);
  const resize = useDesktopStore((store) => store.resize);

  // Torn down on unmount too: a case that resets mid-drag would otherwise
  // leave listeners on `window` moving a component that no longer exists.
  const endGesture = useRef<(() => void) | null>(null);

  // The tile picker is portalled out of the frame, so it can't be opened by a
  // CSS `:hover` on an ancestor any more — the hover is tracked here instead.
  const controls = useRef<HTMLDivElement>(null);
  const closing = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(
    () => () => {
      endGesture.current?.();
      if (closing.current) window.clearTimeout(closing.current);
    },
    [],
  );

  if (!state.open || state.minimized) return null;

  const tiled = state.snap !== null;
  const filled = state.snap === "full";

  /** Cancels a pending close — the pointer made it across the gap. */
  const holdMenu = () => {
    if (closing.current) window.clearTimeout(closing.current);
    closing.current = null;
  };

  const openMenu = () => {
    holdMenu();
    setMenuOpen(true);
  };

  const closeMenu = () => {
    holdMenu();
    setMenuOpen(false);
  };

  /**
   * Leaving the controls doesn't close the menu outright: there is a gap of
   * desk between the two and the pointer is allowed the time to cross it.
   */
  const closeMenuSoon = () => {
    holdMenu();
    closing.current = window.setTimeout(() => setMenuOpen(false), 180);
  };

  /**
   * Binds a pointer gesture to the window for its duration. Handlers get the
   * raw pointer position rather than a delta, because a drag that pops a window
   * out of a tile has to re-baseline itself halfway through the gesture.
   * `pointercancel` is handled — a cancelled touch used to leave the window
   * glued to the finger.
   */
  function startGesture(
    event: React.PointerEvent,
    cursor: string,
    onMove: (point: { x: number; y: number }) => void,
    onEnd?: () => void,
  ) {
    const unlock = lockPointer(cursor);

    const handleMove = (moveEvent: PointerEvent) =>
      onMove({ x: moveEvent.clientX, y: moveEvent.clientY });

    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      unlock();
      endGesture.current = null;
      onEnd?.();
    };

    endGesture.current?.();
    endGesture.current = stop;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function beginDrag(event: React.PointerEvent) {
    if (event.button !== 0) return;
    focus(id);
    // The menu names where the window should go; dragging it is the player
    // answering that question by hand.
    closeMenu();

    const origin = { x: event.clientX, y: event.clientY };
    const start: WindowRect = { x: state.x, y: state.y, w: state.w, h: state.h };

    // The other windows are the magnets. Captured once — nothing else moves
    // while this gesture owns the pointer.
    const others = Object.values(useDesktopStore.getState().windows)
      .filter(
        (other) => other.id !== id && other.open && !other.minimized,
      )
      .map((other) => ({ x: other.x, y: other.y, w: other.w, h: other.h }));

    // Re-based when a tile pops out, so the window keeps tracking the cursor
    // from wherever it lands rather than jumping by the accumulated delta.
    let base = start;
    let anchor = origin;
    let held = state.snap !== null;
    let landing: SnapZone | null = null;

    startGesture(
      event,
      "grabbing",
      (point) => {
        if (held) {
          if (Math.hypot(point.x - origin.x, point.y - origin.y) < RELEASE) {
            return;
          }

          // Pop out at the size it had before it was tiled, keeping the grab
          // under the same proportion of the title bar — so the window comes
          // out from under the cursor instead of leaping away from it.
          const size = state.restore ?? {
            w: Math.max(MIN_WIDTH, Math.round(start.w * 0.6)),
            h: Math.max(MIN_HEIGHT, Math.round(start.h * 0.7)),
          };
          const ratio = (origin.x - start.x) / Math.max(1, start.w);

          base = {
            x: point.x - size.w * ratio,
            y: point.y - (origin.y - start.y),
            w: size.w,
            h: size.h,
          };
          anchor = point;
          held = false;
          float(id, base);
        }

        const bounds = viewport();
        const moved: WindowRect = {
          x: base.x + (point.x - anchor.x),
          y: base.y + (point.y - anchor.y),
          w: base.w,
          h: base.h,
        };

        // An edge the window is about to snap into outranks the magnets —
        // otherwise a window sticking to its neighbour can't be pulled past it
        // into the screen edge behind.
        landing = edgeZone(point, bounds);
        setPreview(landing);

        move(id, landing ? moved : magnetize(moved, others, bounds), bounds);
      },
      () => {
        if (landing) snapTo(id, landing, viewport());
        else setPreview(null);
      },
    );
  }

  function beginResize(event: React.PointerEvent, grip: (typeof GRIPS)[number]) {
    if (event.button !== 0 || filled) return;
    event.stopPropagation();
    focus(id);

    const origin = { x: event.clientX, y: event.clientY };
    const from: WindowRect = { x: state.x, y: state.y, w: state.w, h: state.h };

    startGesture(event, grip.cursor, (point) => {
      const bounds = viewport();
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      let { x, y, w, h } = from;

      if (grip.dir.includes("e")) {
        w = clamp(from.w + dx, MIN_WIDTH, bounds.w - from.x);
      }
      if (grip.dir.includes("s")) {
        h = clamp(from.h + dy, MIN_HEIGHT, bounds.h - from.y);
      }
      // On the leading edges the size is clamped first and the origin derived
      // from it — deriving the other way slides the window sideways once it
      // hits its minimum.
      if (grip.dir.includes("w")) {
        w = clamp(from.w - dx, MIN_WIDTH, from.x + from.w);
        x = from.x + from.w - w;
      }
      if (grip.dir.includes("n")) {
        h = clamp(from.h - dy, MIN_HEIGHT, from.y + from.h - TOP_BAR_HEIGHT);
        y = from.y + from.h - h;
      }

      resize(id, { x, y, w, h });
    });
  }

  const maximize = () => toggleMaximize(id, viewport());

  return (
    <section
      aria-label={title}
      onPointerDown={() => focus(id)}
      style={{
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.h,
        zIndex: state.z,
      }}
      className={cn(
        "window-frame absolute flex flex-col border bg-[var(--bg-surface)]",
        // A tile meets the edges around it, and rounded corners against a
        // neighbour or the viewport edge read as a mistake.
        //
        // Geometry only animates while tiled, which is the only time it moves
        // without a pointer already tracking it. Dragging clears the tile on
        // the first pixel of movement, so a drag is never chasing a transition.
        tiled
          ? "rounded-none transition-[left,top,width,height] duration-150 ease-out"
          : "rounded-lg",
        // Focus is carried by the border and a hard shadow, not a glow — the
        // desktop should read as panels on a desk, not lit glass.
        focused
          ? "border-[var(--border-strong)] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)]"
          : "border-[var(--border-subtle)] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)]",
      )}
    >
      {/* Clipping lives here rather than on the frame so the resize grips,
          which hang outside the border, stay hittable. 11px = 12px radius
          less the 1px border. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          tiled ? "rounded-none" : "rounded-[11px]",
        )}
      >
        <header
          onPointerDown={beginDrag}
          onDoubleClick={maximize}
          className={cn(
            // 40px, not 36 — the controls are sized to be aimed at, and a bar
            // that only just clears them reads as a squeeze.
            "relative z-20 flex h-10 shrink-0 touch-none items-center gap-2.5 border-b px-3 select-none",
            "cursor-grab active:cursor-grabbing",
            focused
              ? "border-[var(--border-strong)] bg-[var(--bg-elevated)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface)]",
          )}
        >
          {/* The focused window gets a lit edge along the bottom of its bar.
              One hairline, no glow — enough to find the active window in a
              stack of four without adding another colour to the desk. */}
          {focused ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[var(--accent)] opacity-70"
            />
          ) : null}

          {/* First in the DOM, so on this RTL page they land in the top-right
              corner — where an Arabic reader looks for them. */}
          <div
            ref={controls}
            onPointerEnter={openMenu}
            onPointerLeave={closeMenuSoon}
            // Focus still propagates through the portal along the React tree,
            // so the menu holds while a control is focused. Tab can no longer
            // walk into the tiles themselves — Ctrl+Alt+arrows are the keyboard
            // route to the same layouts, and the shortcuts sheet lists them.
            onFocus={openMenu}
            onBlur={closeMenuSoon}
            className="relative flex shrink-0 items-center gap-2"
          >
            <Control
              label="إغلاق"
              tone="var(--diff-hard)"
              icon={X}
              onClick={() => {
                closeMenu();
                close(id);
              }}
            />
            <Control
              label="تصغير"
              tone="var(--gold)"
              icon={Minus}
              onClick={() => {
                closeMenu();
                minimize(id);
              }}
            />
            <Control
              label={filled ? "استعادة" : "تكبير"}
              tone="var(--accent)"
              icon={filled ? Minimize2 : Maximize2}
              onClick={maximize}
            />

            {menuOpen ? (
              <SnapMenu
                anchor={controls}
                active={state.snap}
                onHold={holdMenu}
                onRelease={closeMenuSoon}
                onPick={(zone) => {
                  closeMenu();
                  if (zone === state.snap) toggleMaximize(id, viewport());
                  else snapTo(id, zone, viewport());
                }}
              />
            ) : null}
          </div>

          <Icon
            className={cn(
              "ms-1 size-3.5 shrink-0",
              focused ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
            )}
            strokeWidth={1.75}
          />

          <span
            className={cn(
              "min-w-0 truncate text-[12.5px] font-semibold",
              focused ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
            )}
          >
            {title}
          </span>

          {/* Left-hand end of the bar: the app's code, or the live shell
              prompt. Latin either way, and never upper-cased — the terminal's
              own prompt is lower-case and the two have to match. */}
          {subtitle ? (
            <span
              dir="ltr"
              className="ms-auto max-w-[45%] min-w-0 truncate font-mono text-[10px] tracking-[0.14em] text-[var(--text-muted)]"
            >
              {subtitle}
            </span>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-[var(--bg-surface)]">
          {children}
        </div>
      </div>

      {/* A filled window has no edge left to pull. Half and quarter tiles keep
          theirs — dragging one is how you override the layout by hand. */}
      {filled
        ? null
        : GRIPS.map((grip) => (
            <span
              key={grip.dir}
              aria-hidden="true"
              onPointerDown={(event) => beginResize(event, grip)}
              style={{ cursor: grip.cursor }}
              className={cn("absolute z-10 touch-none", grip.className)}
            />
          ))}
    </section>
  );
}
