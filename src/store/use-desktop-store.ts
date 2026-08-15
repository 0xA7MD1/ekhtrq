import { create } from "zustand";

/**
 * The window manager.
 *
 * Deliberately separate from the lab session: which windows are open is a
 * preference about the desk, not progress through the case. Resetting a case
 * doesn't rearrange your workspace, and the layout is never persisted to the
 * server.
 *
 * Geometry is plain `left`/`top` pixels rather than logical properties, so the
 * drag maths stays direction-agnostic on an RTL page.
 */

export const APP_IDS = ["terminal", "browser", "files", "guide"] as const;
export type AppId = (typeof APP_IDS)[number];

export type WindowRect = { x: number; y: number; w: number; h: number };

/**
 * A tile a window can be locked to. `full` is what used to be "maximized" —
 * folding it in means one flag answers "is this window tiled?", which is the
 * question the frame, the resize grips and the drag handler all actually ask.
 */
export type SnapZone =
  | "full"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type WindowState = WindowRect & {
  id: AppId;
  open: boolean;
  minimized: boolean;
  snap: SnapZone | null;
  z: number;
  /** Free-floating geometry to return to when a tile is released. */
  restore: WindowRect | null;
};

export const MIN_WIDTH = 380;
export const MIN_HEIGHT = 260;
/** Height of the top status bar; windows never travel underneath it. */
export const TOP_BAR_HEIGHT = 40;
/** Height of a window's title bar — the part that must stay grabbable. */
export const TITLE_BAR_HEIGHT = 40;
/**
 * Band along the bottom kept clear for the dock. Tiles stop above it, so a
 * filled window can never bury the terminal's own input line under the dock.
 */
export const DOCK_RESERVE = 70;
/** How near two edges have to come while dragging before they stick together. */
export const MAGNET = 9;
/**
 * How much of a window has to remain on screen while it is dragged. Without
 * this a window can be thrown past the edge and never grabbed again.
 */
const KEEP_VISIBLE = 160;

type Viewport = { w: number; h: number };

/**
 * The rectangle windows actually live in: below the status bar, above the
 * dock. Every tile is carved out of this, which is what keeps the chrome
 * permanently visible no matter how the desk is arranged.
 */
export function workArea(viewport: Viewport): WindowRect {
  return {
    x: 0,
    y: TOP_BAR_HEIGHT,
    w: viewport.w,
    h: Math.max(MIN_HEIGHT, viewport.h - TOP_BAR_HEIGHT - DOCK_RESERVE),
  };
}

/**
 * Geometry for a tile. Halves are split on a rounded pixel and the far side
 * takes the remainder, so two snapped windows meet on exactly one line with no
 * seam and no overlap at odd viewport widths.
 */
export function zoneRect(zone: SnapZone, viewport: Viewport): WindowRect {
  const area = workArea(viewport);
  const halfW = Math.round(area.w / 2);
  const halfH = Math.round(area.h / 2);

  const left = { x: area.x, w: halfW };
  const right = { x: area.x + halfW, w: area.w - halfW };
  const top = { y: area.y, h: halfH };
  const bottom = { y: area.y + halfH, h: area.h - halfH };

  switch (zone) {
    case "full":
      return { ...area };
    case "left":
      return { ...left, y: area.y, h: area.h };
    case "right":
      return { ...right, y: area.y, h: area.h };
    case "top-left":
      return { ...left, ...top };
    case "top-right":
      return { ...right, ...top };
    case "bottom-left":
      return { ...left, ...bottom };
    case "bottom-right":
      return { ...right, ...bottom };
  }
}

/** The tile that pairs with a half — the space snap assist offers to fill. */
export function partnerZone(zone: SnapZone): SnapZone | null {
  if (zone === "left") return "right";
  if (zone === "right") return "left";
  return null;
}

/**
 * Which tile the pointer is asking for, from where it is on screen.
 *
 * The corner bands are a quarter of the work area tall, so a deliberate drag
 * into a corner reads as a quarter while anything in the middle of the edge
 * reads as a half — the same proportions a desktop user already has muscle
 * memory for.
 */
export function edgeZone(
  point: { x: number; y: number },
  viewport: Viewport,
): SnapZone | null {
  const area = workArea(viewport);
  const EDGE = 18;

  if (point.y <= TOP_BAR_HEIGHT + 6) return "full";

  const near = point.x <= EDGE ? "left" : point.x >= viewport.w - EDGE ? "right" : null;
  if (!near) return null;

  const corner = area.h * 0.25;
  if (point.y <= area.y + corner) return near === "left" ? "top-left" : "top-right";
  if (point.y >= area.y + area.h - corner) {
    return near === "left" ? "bottom-left" : "bottom-right";
  }
  return near;
}

/**
 * Sticks a dragged window to the edges around it.
 *
 * Both the outer edges of the work area and every other visible window are
 * candidates, in both alignments — my leading edge to your trailing edge
 * (windows sitting flush against each other) and my leading edge to yours
 * (windows lining up in a column). The nearest candidate inside the threshold
 * wins, and each axis is decided on its own so a window can stick sideways
 * while still moving freely up and down.
 */
export function magnetize(
  rect: WindowRect,
  others: WindowRect[],
  viewport: Viewport,
): { x: number; y: number } {
  const area = workArea(viewport);

  const pull = (value: number, candidates: number[]) => {
    let best = value;
    let distance = MAGNET;
    for (const candidate of candidates) {
      const gap = Math.abs(candidate - value);
      if (gap < distance) {
        distance = gap;
        best = candidate;
      }
    }
    return best;
  };

  const xs = [area.x, area.x + area.w - rect.w];
  const ys = [area.y, area.y + area.h - rect.h];

  for (const other of others) {
    xs.push(
      other.x,
      other.x + other.w,
      other.x - rect.w,
      other.x + other.w - rect.w,
    );
    ys.push(
      other.y,
      other.y + other.h,
      other.y - rect.h,
      other.y + other.h - rect.h,
    );
  }

  return { x: pull(rect.x, xs), y: pull(rect.y, ys) };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Opening positions, laid out so the two windows a case opens with sit side by
 * side rather than on top of each other, with the rest cascaded behind them.
 * Clamped to the viewport on mount — these are only sane defaults, not
 * guarantees.
 */
const DEFAULTS: Record<AppId, WindowRect> = {
  terminal: { x: 40, y: 76, w: 840, h: 560 },
  browser: { x: 220, y: 120, w: 960, h: 620 },
  files: { x: 150, y: 170, w: 780, h: 500 },
  guide: { x: 912, y: 76, w: 452, h: 640 },
};

const INITIALLY_OPEN: AppId[] = ["terminal", "guide"];

/** The offer to fill the space left over after a window is snapped to a half. */
type Assist = { zone: SnapZone; candidates: AppId[] };

type DesktopState = {
  windows: Record<AppId, WindowState>;
  focused: AppId | null;
  /** Tile the current drag would land in, drawn as a ghost while it happens. */
  preview: SnapZone | null;
  assist: Assist | null;

  open: (id: AppId) => void;
  close: (id: AppId) => void;
  toggle: (id: AppId) => void;
  minimize: (id: AppId) => void;
  focus: (id: AppId) => void;
  move: (id: AppId, position: { x: number; y: number }, viewport: Viewport) => void;
  resize: (id: AppId, rect: WindowRect) => void;

  snapTo: (id: AppId, zone: SnapZone, viewport: Viewport) => void;
  /** Releases a tile back into a free-floating rect, mid-drag. */
  float: (id: AppId, rect: WindowRect) => void;
  /** Drops a tile and returns the window to the size it had before it. */
  release: (id: AppId, viewport: Viewport) => void;
  toggleMaximize: (id: AppId, viewport: Viewport) => void;
  setPreview: (zone: SnapZone | null) => void;
  dismissAssist: () => void;

  /** Cycles focus through the visible windows, newest stack order first. */
  cycleFocus: () => void;
  /** Fills the work area with every visible window, no overlap. */
  tileAll: (viewport: Viewport) => void;
  /** Pulls every window back inside the viewport after a mount or resize. */
  clampAll: (viewport: Viewport) => void;
  resetLayout: (viewport: Viewport) => void;
};

function seed(): Record<AppId, WindowState> {
  const windows = Object.fromEntries(
    APP_IDS.map((id, index) => [
      id,
      {
        id,
        ...DEFAULTS[id],
        open: INITIALLY_OPEN.includes(id),
        minimized: false,
        snap: null,
        z: index + 1,
        restore: null,
      } satisfies WindowState,
    ]),
  ) as Record<AppId, WindowState>;

  // The window we start focused has to start on top too, or the desktop opens
  // with the terminal wearing the focus border from underneath the guide.
  return restack(windows, "terminal");
}

/**
 * Re-stacks so `id` sits on top, rewriting every z back into 1…APP_IDS.length.
 *
 * A monotonic counter would eventually climb past the dock and the status bar
 * and start rendering windows over them; normalising on every raise keeps the
 * desktop's z range small and permanently below the chrome.
 */
function restack(
  windows: Record<AppId, WindowState>,
  id: AppId,
): Record<AppId, WindowState> {
  const below = APP_IDS.filter((candidate) => candidate !== id).sort(
    (a, b) => windows[a].z - windows[b].z,
  );

  const next = { ...windows };
  [...below, id].forEach((candidate, index) => {
    next[candidate] = { ...next[candidate], z: index + 1 };
  });
  return next;
}

/** Whatever is highest and still visible, for when the focused window leaves. */
function topmostVisible(windows: Record<AppId, WindowState>): AppId | null {
  return visible(windows).sort((a, b) => windows[b].z - windows[a].z)[0] ?? null;
}

function visible(windows: Record<AppId, WindowState>): AppId[] {
  return APP_IDS.filter((id) => windows[id].open && !windows[id].minimized);
}

const rectOf = (state: WindowState): WindowRect => ({
  x: state.x,
  y: state.y,
  w: state.w,
  h: state.h,
});

/** Pulls a set of windows back inside a viewport. Shared by mount and reset. */
function clampWindows(
  windows: Record<AppId, WindowState>,
  viewport: Viewport,
): Record<AppId, WindowState> {
  const next = { ...windows };
  const area = workArea(viewport);

  for (const id of APP_IDS) {
    const current = next[id];

    // A tiled window is defined by its zone, not by stored pixels — so a
    // resized viewport re-derives it rather than dragging stale geometry along.
    if (current.snap) {
      next[id] = { ...current, ...zoneRect(current.snap, viewport) };
      continue;
    }

    const w = Math.min(current.w, Math.max(MIN_WIDTH, viewport.w - 24));
    const h = Math.min(current.h, Math.max(MIN_HEIGHT, area.h - 16));

    next[id] = {
      ...current,
      w,
      h,
      x: clamp(current.x, 12, viewport.w - w - 12),
      y: clamp(current.y, area.y + 8, area.y + area.h - h),
    };
  }

  return next;
}

/**
 * Lays visible windows out edge to edge. One window fills; two split; three put
 * the focused one down the side with the other two stacked beside it; four take
 * a quarter each. Beyond that there are no more apps, so there is no more case.
 */
const TILINGS: Record<number, SnapZone[]> = {
  1: ["full"],
  2: ["left", "right"],
  3: ["left", "top-right", "bottom-right"],
  4: ["top-left", "bottom-left", "top-right", "bottom-right"],
};

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: seed(),
  focused: "terminal",
  preview: null,
  assist: null,

  focus: (id) =>
    set((state) => {
      if (state.focused === id && !state.windows[id].minimized) {
        return state.assist ? { assist: null } : state;
      }
      const windows = restack(state.windows, id);
      windows[id] = { ...windows[id], minimized: false };
      return { focused: id, windows, assist: null };
    }),

  open: (id) =>
    set((state) => {
      const windows = restack(state.windows, id);
      windows[id] = { ...windows[id], open: true, minimized: false };
      return { focused: id, windows, assist: null };
    }),

  close: (id) =>
    set((state) => {
      const windows = {
        ...state.windows,
        // Closing drops the tile too: a window that is re-opened later should
        // come back as itself, not inherit a half of a layout nobody set up.
        [id]: {
          ...state.windows[id],
          ...(state.windows[id].restore ?? {}),
          open: false,
          minimized: false,
          snap: null,
          restore: null,
        },
      };
      // Focus falls to whatever is highest and still visible.
      return { windows, focused: topmostVisible(windows), assist: null };
    }),

  toggle: (id) => {
    const current = get().windows[id];
    if (!current.open) return get().open(id);
    if (current.minimized || get().focused !== id) return get().focus(id);
    return get().minimize(id);
  },

  minimize: (id) =>
    set((state) => {
      const windows = {
        ...state.windows,
        [id]: { ...state.windows[id], minimized: true },
      };
      return { windows, focused: topmostVisible(windows), assist: null };
    }),

  snapTo: (id, zone, viewport) =>
    set((state) => {
      const current = state.windows[id];
      const windows = restack(state.windows, id);

      windows[id] = {
        ...windows[id],
        ...zoneRect(zone, viewport),
        open: true,
        minimized: false,
        snap: zone,
        // Only recorded on the way in from free-floating, so re-snapping
        // between tiles never overwrites the size to come back to.
        restore: current.snap ? current.restore : rectOf(current),
      };

      // Snapping to a half leaves an obvious hole. Offer to fill it, the way a
      // desktop does — but only when there is something to put there.
      const partner = partnerZone(zone);
      const candidates = partner
        ? APP_IDS.filter(
            (candidate) =>
              candidate !== id && windows[candidate].snap !== partner,
          )
        : [];

      return {
        windows,
        focused: id,
        preview: null,
        assist:
          partner && candidates.length > 0
            ? { zone: partner, candidates }
            : null,
      };
    }),

  float: (id, rect) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], ...rect, snap: null, restore: null },
      },
      assist: null,
    })),

  release: (id, viewport) =>
    set((state) => {
      const current = state.windows[id];
      if (!current.snap) return state;

      // Re-clamped on the way down: the viewport may have shrunk while the
      // window was tiled, and the stored rect would no longer fit.
      const restored = current.restore ?? DEFAULTS[id];
      return {
        windows: clampWindows(
          {
            ...state.windows,
            [id]: { ...current, ...restored, snap: null, restore: null },
          },
          viewport,
        ),
        assist: null,
      };
    }),

  toggleMaximize: (id, viewport) =>
    get().windows[id].snap === "full"
      ? get().release(id, viewport)
      : get().snapTo(id, "full", viewport),

  setPreview: (zone) =>
    set((state) => (state.preview === zone ? state : { preview: zone })),

  dismissAssist: () => set((state) => (state.assist ? { assist: null } : state)),

  cycleFocus: () =>
    set((state) => {
      const order = visible(state.windows).sort(
        (a, b) => state.windows[b].z - state.windows[a].z,
      );
      if (order.length < 2) return state;

      // Send the top window to the back of the visible stack, which surfaces
      // the one underneath — the behaviour every window switcher has.
      const next = order[1];
      return { windows: restack(state.windows, next), focused: next, assist: null };
    }),

  tileAll: (viewport) =>
    set((state) => {
      const order = visible(state.windows).sort(
        (a, b) => state.windows[a].z - state.windows[b].z,
      );
      const layout = TILINGS[order.length];
      if (!layout) return state;

      const windows = { ...state.windows };
      order.forEach((id, index) => {
        const zone = layout[index];
        windows[id] = {
          ...windows[id],
          ...zoneRect(zone, viewport),
          snap: zone,
          restore: windows[id].restore ?? rectOf(windows[id]),
        };
      });

      return { windows, assist: null };
    }),

  move: (id, position, viewport) =>
    set((state) => {
      const current = state.windows[id];
      return {
        windows: {
          ...state.windows,
          [id]: {
            ...current,
            // A window may hang off an edge, but never far enough that its
            // title bar becomes ungrabbable.
            x: clamp(
              position.x,
              KEEP_VISIBLE - current.w,
              viewport.w - KEEP_VISIBLE,
            ),
            y: clamp(position.y, TOP_BAR_HEIGHT, viewport.h - TITLE_BAR_HEIGHT),
          },
        },
      };
    }),

  resize: (id, rect) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          x: rect.x,
          y: Math.max(TOP_BAR_HEIGHT, rect.y),
          w: Math.max(MIN_WIDTH, rect.w),
          h: Math.max(MIN_HEIGHT, rect.h),
          // Resizing by hand is the player overriding the tile, so the tile
          // stops owning the geometry from here on.
          snap: null,
          restore: null,
        },
      },
      assist: null,
    })),

  clampAll: (viewport) =>
    set((state) => ({ windows: clampWindows(state.windows, viewport) })),

  resetLayout: (viewport) =>
    set({
      windows: clampWindows(seed(), viewport),
      focused: "terminal",
      preview: null,
      assist: null,
    }),
}));
