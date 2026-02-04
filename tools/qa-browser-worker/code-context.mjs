import fs from "node:fs";
import path from "node:path";

function safeRead(filePath, maxChars = 12000) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw.slice(0, maxChars);
  } catch {
    return "";
  }
}

function listDirSafe(dirPath, depth = 1, maxEntries = 80) {
  const out = [];
  function walk(current, d) {
    if (d > depth) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxEntries) return;
      const full = path.join(current, entry.name);
      const rel = path.relative(dirPath, full);
      if (entry.isDirectory()) {
        out.push(`${rel}/`);
        walk(full, d + 1);
      } else {
        out.push(rel);
      }
    }
  }
  walk(dirPath, 0);
  return out;
}

function extractServerRoutes(source) {
  const routes = [];
  const regex = /app\.(get|post|put|patch|delete)\s*\(\s*["'`](.+?)["'`]/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes.slice(0, 80);
}

function extractClientHints(source) {
  const hints = [];
  const patterns = [
    /<Route[^>]+path=["'`](.+?)["'`]/g,
    /createBrowserRouter\(/g,
    /createRoutesFromElements\(/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (match[1]) hints.push(match[1]);
      else hints.push(match[0]);
    }
  }
  return hints.slice(0, 80);
}

export function buildCodeContext(repoRoot) {
  const context = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    topLevel: [],
    serverRoutes: [],
    clientRouteHints: [],
    keyFiles: {},
  };

  context.topLevel = listDirSafe(repoRoot, 1, 120);

  const serverIndex = path.join(repoRoot, "server", "index.ts");
  const appTsx = path.join(repoRoot, "src", "App.tsx");
  const mainTsx = path.join(repoRoot, "src", "main.tsx");
  const routesTsx = path.join(repoRoot, "src", "routes.tsx");

  const serverSource = safeRead(serverIndex);
  const appSource = safeRead(appTsx);
  const mainSource = safeRead(mainTsx);
  const routesSource = safeRead(routesTsx);

  if (serverSource) {
    context.serverRoutes = extractServerRoutes(serverSource);
    context.keyFiles["server/index.ts"] = serverSource.slice(0, 2000);
  }
  if (appSource) {
    context.clientRouteHints.push(...extractClientHints(appSource));
    context.keyFiles["src/App.tsx"] = appSource.slice(0, 1500);
  }
  if (mainSource) {
    context.clientRouteHints.push(...extractClientHints(mainSource));
    context.keyFiles["src/main.tsx"] = mainSource.slice(0, 1200);
  }
  if (routesSource) {
    context.clientRouteHints.push(...extractClientHints(routesSource));
    context.keyFiles["src/routes.tsx"] = routesSource.slice(0, 1200);
  }

  context.clientRouteHints = Array.from(new Set(context.clientRouteHints));

  return context;
}
