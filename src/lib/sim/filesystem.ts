import type { FileNode } from "@/lib/labs/schema";

/**
 * The virtual filesystem.
 *
 * A host's files are a flat `path → node` map. Directories are never declared;
 * they are inferred from the keys, so `/home/guest/notes.txt` brings `/`,
 * `/home` and `/home/guest` into existence. Manifests stay flat and can't
 * describe a malformed tree.
 *
 * Everything here is pure. The engine merges a host's authored files with
 * whatever the session has picked up, then asks these helpers questions.
 */

export type FileMap = Record<string, FileNode>;

export type DirEntry = {
  name: string;
  path: string;
  isDir: boolean;
  node?: FileNode;
};

/** Collapses `.`, `..`, duplicate slashes and a leading `~`. Always absolute. */
export function resolvePath(cwd: string, input: string, home: string): string {
  const raw = input.trim();
  let start: string;

  if (raw === "~" || raw.startsWith("~/")) {
    start = home + raw.slice(1);
  } else if (raw.startsWith("/")) {
    start = raw;
  } else if (raw === "") {
    start = cwd;
  } else {
    start = `${cwd}/${raw}`;
  }

  const stack: string[] = [];
  for (const segment of start.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  return `/${stack.join("/")}`;
}

/** `/home/guest/notes.txt` → `notes.txt`. Root stays `/`. */
export function basename(filePath: string): string {
  if (filePath === "/") return "/";
  return filePath.slice(filePath.lastIndexOf("/") + 1);
}

/** `/home/guest/notes.txt` → `/home/guest`. */
export function dirname(filePath: string): string {
  if (filePath === "/") return "/";
  const cut = filePath.lastIndexOf("/");
  return cut <= 0 ? "/" : filePath.slice(0, cut);
}

export function isFile(files: FileMap, filePath: string): boolean {
  return Object.hasOwn(files, filePath);
}

/** True when anything lives beneath this path. `/` always exists. */
export function isDir(files: FileMap, dirPath: string): boolean {
  if (dirPath === "/") return true;
  if (isFile(files, dirPath)) return false;
  const prefix = `${dirPath}/`;
  return Object.keys(files).some((key) => key.startsWith(prefix));
}

/**
 * Immediate children of a directory — files declared directly inside it, plus
 * the first segment of any deeper path, which is how sub-directories surface.
 */
export function listDir(
  files: FileMap,
  dirPath: string,
  options: { all?: boolean } = {},
): DirEntry[] {
  const prefix = dirPath === "/" ? "/" : `${dirPath}/`;
  const seen = new Map<string, DirEntry>();

  for (const [filePath, node] of Object.entries(files)) {
    if (!filePath.startsWith(prefix)) continue;

    const rest = filePath.slice(prefix.length);
    if (rest === "") continue;

    const slash = rest.indexOf("/");
    const name = slash === -1 ? rest : rest.slice(0, slash);
    if (!options.all && name.startsWith(".")) continue;

    // A deeper path contributes its first segment as a directory.
    if (slash !== -1) {
      if (!seen.has(name)) {
        seen.set(name, { name, path: `${prefix}${name}`, isDir: true });
      }
      continue;
    }

    if (!options.all && node.hidden) continue;
    seen.set(name, { name, path: filePath, isDir: false, node });
  }

  return [...seen.values()].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Every directory in the map, for the Files app tree. */
export function allDirs(files: FileMap): string[] {
  const dirs = new Set<string>(["/"]);
  for (const filePath of Object.keys(files)) {
    let dir = dirname(filePath);
    while (dir !== "/") {
      dirs.add(dir);
      dir = dirname(dir);
    }
  }
  return [...dirs].sort();
}

/** `~` substitution for the prompt, exactly as a shell renders it. */
export function displayPath(filePath: string, home: string): string {
  if (filePath === home) return "~";
  if (home !== "/" && filePath.startsWith(`${home}/`)) {
    return `~${filePath.slice(home.length)}`;
  }
  return filePath;
}

/**
 * Whether `user` may read `node`. A file's `locked` value names the user that
 * can open it, which is what keeps loot behind a privesc without the engine
 * knowing what either of those words mean.
 */
export function canRead(node: FileNode, user: string): boolean {
  return !node.locked || node.locked === user;
}
