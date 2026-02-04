import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storageMode, storageService } from '../storageService.js';
import { extractAnchorsFromPdf } from '../pdfProcessor.js';
import { safeResolve } from '../pathUtils.js';
import { prisma } from '../lib/prisma.js';

dotenv.config();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
const tempDir = path.join(uploadsDir, 'temp');
const loiPdfPath = path.resolve(process.cwd(), '..', 'docs', 'LexisNexis_LOI_Draft.pdf');

function isTruthy(value?: string) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function sanitizeFilename(input: string): string {
  const base = path.basename(input || 'file');
  return base
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'file';
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function seedLoiExhibit(workspaceId: string, matterId: string) {
  if (!fs.existsSync(loiPdfPath)) return false;

  fs.mkdirSync(tempDir, { recursive: true });

  const storageKey = 'demo/LexisNexis_LOI_Draft.pdf';
  let exhibit = await prisma.exhibit.findUnique({ where: { storageKey } });

  if (!exhibit) {
    const tempCopy = path.join(tempDir, `seed-${Date.now()}-LexisNexis_LOI_Draft.pdf`);
    await fs.promises.copyFile(loiPdfPath, tempCopy);

    const buffer = await fs.promises.readFile(tempCopy);
    await storageService.upload(storageKey, buffer);
    await fs.promises.unlink(tempCopy).catch(() => null);
    const integrityHash = await sha256File(loiPdfPath);

    exhibit = await prisma.exhibit.create({
      data: {
        workspaceId,
        matterId,
        filename: 'Exhibit A: Executed Letter of Intent.pdf',
        mimeType: 'application/pdf',
        storageKey,
        integrityHash,
        verificationStatus: 'CERTIFIED',
        verifiedAt: new Date()
      }
    });
  } else if (exhibit.verificationStatus !== 'CERTIFIED') {
    exhibit = await prisma.exhibit.update({
      where: { id: exhibit.id },
      data: { verificationStatus: 'CERTIFIED', verifiedAt: new Date() }
    });
  }

  const anchorCount = await prisma.anchor.count({ where: { exhibitId: exhibit.id } });
  if (anchorCount === 0) {
    const needsTemp = storageMode !== 'DISK' || Boolean(process.env.EVIDENCE_MASTER_KEY_B64);
    let localPath = '';
    if (needsTemp) {
      const tmpPdfPath = safeResolve(tempDir, `seed-${exhibit.id}-${Date.now()}.pdf`);
      const buffer = await storageService.download(storageKey);
      await fs.promises.writeFile(tmpPdfPath, buffer);
      localPath = tmpPdfPath;
    } else {
      localPath = safeResolve(uploadsDir, storageKey);
    }

    await extractAnchorsFromPdf(exhibit.id, localPath);

    if (needsTemp) {
      fs.promises.unlink(localPath).catch(() => null);
    }
  }

  return true;
}

async function seedDemoExhibits(workspaceId: string, matterId: string) {
  if (!isTruthy(process.env.SEED_DEMO_EXHIBITS)) return;

  const demoDir = (() => {
    const p = process.env.SEED_DEMO_EXHIBITS_PATH;
    if (!p) {
      throw new Error('SEED_DEMO_EXHIBITS is enabled but SEED_DEMO_EXHIBITS_PATH is not set');
    }
    return path.resolve(p);
  })();

  if (!fs.existsSync(demoDir)) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[seed] Demo exhibits folder missing:', demoDir);
    }
    return;
  }

  fs.mkdirSync(tempDir, { recursive: true });

  const pdfFiles = fs.readdirSync(demoDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  for (const filename of pdfFiles) {
    const safeName = sanitizeFilename(filename);
    const storageKey = `demo/${safeName}`;
    let exhibit = await prisma.exhibit.findUnique({ where: { storageKey } });

    if (!exhibit) {
      const srcPath = path.join(demoDir, filename);
      const tempCopy = path.join(tempDir, `seed-${Date.now()}-${safeName}`);
      await fs.promises.copyFile(srcPath, tempCopy);

      const buffer = await fs.promises.readFile(tempCopy);
      await storageService.upload(storageKey, buffer);
      await fs.promises.unlink(tempCopy).catch(() => null);
      const integrityHash = await sha256File(srcPath);

      exhibit = await prisma.exhibit.create({
        data: {
          workspaceId,
          matterId,
          filename,
          mimeType: 'application/pdf',
          storageKey,
          integrityHash
        }
      });
    }

    const anchorCount = await prisma.anchor.count({ where: { exhibitId: exhibit.id } });
    if (anchorCount > 0) continue;

    const needsTemp = storageMode !== 'DISK' || Boolean(process.env.EVIDENCE_MASTER_KEY_B64);
    let localPath = '';
    if (needsTemp) {
      const tmpPdfPath = safeResolve(tempDir, `seed-${exhibit.id}-${Date.now()}.pdf`);
      const buffer = await storageService.download(storageKey);
      await fs.promises.writeFile(tmpPdfPath, buffer);
      localPath = tmpPdfPath;
    } else {
      localPath = safeResolve(uploadsDir, storageKey);
    }

    await extractAnchorsFromPdf(exhibit.id, localPath);

    if (needsTemp) {
      fs.promises.unlink(localPath).catch(() => null);
    }
  }
}

async function main() {
  const demoEmail = process.env.SEED_DEMO_EMAIL;
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  const seedWorkspaceId = process.env.SEED_WORKSPACE_ID || 'default-workspace';
  const hasLoi = fs.existsSync(loiPdfPath);
  const workspaceName = hasLoi ? 'Investigation' : 'Default Practice';

  // Seed is intentional only: require explicit credentials.
  if (!demoEmail || !demoPassword) {
    throw new Error('Seed requires SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD to be set explicitly');
  }

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, passwordHash }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: seedWorkspaceId },
    update: { name: workspaceName },
    create: { id: seedWorkspaceId, name: workspaceName }
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'owner' },
    create: { workspaceId: workspace.id, userId: user.id, role: 'owner' }
  });

  const investigationMatter = await prisma.matter.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'investigation' } },
    update: { name: 'Investigation' },
    create: { workspaceId: workspace.id, slug: 'investigation', name: 'Investigation' }
  });

  const assaultMatter = await prisma.matter.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'assault-care-matter' } },
    update: { name: 'Assault Care' },
    create: { workspaceId: workspace.id, slug: 'assault-care-matter', name: 'Assault Care' }
  });

  await prisma.matter.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'default-matter' } },
    update: { name: 'General' },
    create: { workspaceId: workspace.id, slug: 'default-matter', name: 'General' }
  });

  if (hasLoi) {
    await seedLoiExhibit(workspace.id, investigationMatter.id);
  }

  await seedDemoExhibits(workspace.id, assaultMatter.id);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[seed] OK', { demoEmail, workspaceId: workspace.id });
  }
}


main()
  .catch((e) => {
    console.error('[seed] FAILED', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
