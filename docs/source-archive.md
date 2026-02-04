# Source archive instructions

LexiProApp_SOURCE.zip used to live in the repo for quick sharing, but its 150 MB binary bloated clones. The archive is now generated on demand and stored outside the git tree (release asset, secure bucket, etc.).

## What to include
The zipped source package is intended to capture the production-ready frontend and backend code plus documentation that LexiPro auditors expect. At minimum, it should include:

- server/ (API, Prisma, scripts)
- src/ (React app, embed components)
- docs/, .github/, and scripts/ (process docs, workflows, tooling)
- Configuration files (package.json, package-lock.json, .dockerignore, Dockerfile, 	sconfig.json, ite.config.ts, etc.)
- README.md, LICENSE, ROADMAP.md, and other governance docs that buyers expect with the source.

## Regenerating the archive
From the repository root, run the following commands and point the output outside the git working tree so it stays untracked.

### Windows / PowerShell (included with the repo)
`
 = @(
  'server',
  'src',
  'docs',
  '.github',
  'scripts',
  'README.md',
  'ROADMAP.md',
  'LICENSE',
  'package.json',
  'package-lock.json',
  '.dockerignore',
  'Dockerfile',
  'tsconfig.json',
  'vite.config.ts'
)
Compress-Archive -Path  -DestinationPath  ..\LexiProApp_SOURCE.zip -Force
`

### macOS / Linux (requires zip)
`
zip -r ../LexiProApp_SOURCE.zip \
  server src docs .github scripts README.md ROADMAP.md LICENSE \
  package.json package-lock.json .dockerignore Dockerfile tsconfig.json vite.config.ts
`

After running either command, upload LexiProApp_SOURCE.zip to your secure artifact store (GitHub release, S3, etc.) and keep it out of git. If you ever need to regenerate the archive, run the same command on a clean commit so buyers can verify the archive matches the main branch content.
