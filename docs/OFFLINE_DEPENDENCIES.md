# Offline Dependency Recovery & Build Guide
Use this when the environment blocks `registry.npmjs.org` (403) or the network is restricted. The goal is for any engineer or AI agent unpacking this repository to know exactly how to restore dependencies without live npm access.

## 1. Preferred fix: point npm to a reachable mirror
1. Create/request a private mirror or cache (Verdaccio, Nexus, GitHub Packages, etc.) that proxies the npm registry. Host it behind an accessible URL (e.g., `https://packages.mycorp.local`).
2. Run in this repo and under `server/`:
   ```powershell
   npm config set registry https://packages.mycorp.local
   npm install
   ```
3. When the mirror is in use, leave the configuration in place (it is per-user). Document the URL and credential workflow so Lexis or internal teams can keep it running.
4. Once dependencies install, commit the lockfiles (`package-lock.json`) if new packages are added and document the mirrored source in `docs/OFFLINE_DEPENDENCIES.md` for future diligence.

## 2. Guaranteed fallback: use the cached npm cache archive
This project ships with a recovery script and a cached npm archive. Proceed when `npm install` cannot reach the mirror or default registry.

1. Download two artifacts from the secure artifact store:
   - `npm-cache.zip` (npm cache snapshot for both root + server)
   Store it under `scripts/cache/` in the repo (create the directory if needed).
2. Run the helper script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/install-offline-deps.ps1
   ```
   The script:
   - Restores the npm cache
   - Deletes `node_modules` and `server/node_modules`
   - Runs `npm ci --offline` in both root and `server/`
   - Reports success or missing artifacts
3. After extraction, `npm run build` and `npm run lint` work because dependencies are installed from cache. No network request is needed.
4. If upstream dependencies change, regenerate the cache by running `npm install` (with network), zipping the npm cache directory, and replacing `npm-cache.zip` in the store.

## 3. Developer/AI notes
- Always keep `package-lock.json` in sync with the cached artifacts. If the lockfile updates, rebuild the caches before sharing the repo.
- Mention in your upload notes that offline artifacts exist so future reviewers can run the extraction script (even if the binaries are stored elsewhere).
- This guide and the `scripts/install-offline-deps.ps1` file should be the first things a blocked agent or engineer reads—no guessing needed.

- Cached npm archive stored in scripts/cache/; run powershell -ExecutionPolicy Bypass -File scripts/install-offline-deps.ps1 before building.

