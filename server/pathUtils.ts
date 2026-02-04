import path from "path";

export function safeResolve(baseDir: string, targetPath: string): string {
  // nosemgrep: path-join-resolve-traversal
  const resolvedBase = path.resolve(baseDir);
  // nosemgrep: path-join-resolve-traversal
  const resolvedTarget = path.resolve(baseDir, targetPath);
  const base = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;

  const baseKey = process.platform === "win32" ? base.toLowerCase() : base;
  const targetKey = process.platform === "win32" ? resolvedTarget.toLowerCase() : resolvedTarget;

  if (!targetKey.startsWith(baseKey)) {
    throw new Error("Invalid storage path");
  }

  return resolvedTarget;
}
