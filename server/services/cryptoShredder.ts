import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";

type EncryptedPayload = {
  v: 1;
  iv: string;
  tag: string;
  content: string;
};

type ShredReceipt = {
  workspaceId: string;
  shreddedAt: string;
  keyDigest: string;
  receiptDigest: string;
  nonce: string;
  algorithm: "SHA-256";
};

const KEY_BYTES = 32;
const ENVELOPE_PREFIX = "LEXI_SHRED_V1:";
const WORKSPACE_KEY_PROVIDER = "CRYPTO_SHREDDER_KEY";
const workspaceKeys = new Map<string, Buffer>();

function ensureKey(workspaceId: string): Buffer {
  const key = workspaceKeys.get(workspaceId);
  if (!key) {
    throw new Error("Access Denied / Data Shredded");
  }
  return key;
}

export function generateKey(): string {
  return randomBytes(KEY_BYTES).toString("hex");
}

export function setWorkspaceKey(workspaceId: string, keyHex: string) {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("workspaceKey must be 32 bytes (hex-encoded).");
  }
  workspaceKeys.set(workspaceId, key);
}

export function ensureWorkspaceKey(workspaceId: string): string {
  const existing = workspaceKeys.get(workspaceId);
  if (existing) return existing.toString("hex");
  const keyHex = generateKey();
  setWorkspaceKey(workspaceId, keyHex);
  return keyHex;
}

export function getWorkspaceKey(workspaceId: string): string | null {
  const key = workspaceKeys.get(workspaceId);
  return key ? key.toString("hex") : null;
}

const WORKSPACE_KEY_MASTER = (() => {
  const raw = String(process.env.EVIDENCE_MASTER_KEY_B64 || "").trim();
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("EVIDENCE_MASTER_KEY_B64 must be 32 bytes (base64-encoded).");
  }
  return buf;
})();

type WorkspaceKeyRecord = {
  ciphertextB64: string;
  ivB64: string;
  tagB64: string;
};

function encryptWorkspaceKeyForStorage(keyHex: string): WorkspaceKeyRecord {
  if (!WORKSPACE_KEY_MASTER) {
    throw new Error("EVIDENCE_MASTER_KEY_B64 is required to store workspace shred keys.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", WORKSPACE_KEY_MASTER, iv);
  const ciphertext = Buffer.concat([cipher.update(keyHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertextB64: ciphertext.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64")
  };
}

function decryptWorkspaceKeyFromStorage(record: WorkspaceKeyRecord): string {
  if (!WORKSPACE_KEY_MASTER) {
    throw new Error("EVIDENCE_MASTER_KEY_B64 is required to decrypt workspace shred keys.");
  }
  const iv = Buffer.from(record.ivB64, "base64");
  const tag = Buffer.from(record.tagB64, "base64");
  const ciphertext = Buffer.from(record.ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", WORKSPACE_KEY_MASTER, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function loadWorkspaceKey(workspaceId: string): Promise<boolean> {
  if (workspaceKeys.has(workspaceId)) return true;
  if (!WORKSPACE_KEY_MASTER) return false;
  const record = await prisma.workspaceSecret.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: WORKSPACE_KEY_PROVIDER } }
  });
  if (!record) return false;
  const keyHex = decryptWorkspaceKeyFromStorage(record);
  setWorkspaceKey(workspaceId, keyHex);
  return true;
}

export async function persistWorkspaceKey(workspaceId: string): Promise<boolean> {
  const keyHex = getWorkspaceKey(workspaceId);
  if (!keyHex || !WORKSPACE_KEY_MASTER) return false;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true }
  });
  if (!workspace) return false;
  const encrypted = encryptWorkspaceKeyForStorage(keyHex);
  try {
    await prisma.workspaceSecret.upsert({
      where: { workspaceId_provider: { workspaceId, provider: WORKSPACE_KEY_PROVIDER } },
      update: {
        ciphertextB64: encrypted.ciphertextB64,
        ivB64: encrypted.ivB64,
        tagB64: encrypted.tagB64
      },
      create: {
        workspaceId,
        provider: WORKSPACE_KEY_PROVIDER,
        ciphertextB64: encrypted.ciphertextB64,
        ivB64: encrypted.ivB64,
        tagB64: encrypted.tagB64
      }
    });
    return true;
  } catch {
    return false;
  }
}

export function encrypt(text: string, keyHex: string): EncryptedPayload {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("Invalid workspace key length.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const content = Buffer.concat([cipher.update(Buffer.from(text, "utf-8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    content: content.toString("base64")
  };
}

export function decrypt(payload: EncryptedPayload, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("Invalid workspace key length.");
  }
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const content = Buffer.from(payload.content, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(content), decipher.final()]);
  return out.toString("utf-8");
}

export function encryptBufferForWorkspace(buffer: Buffer, workspaceId: string): Buffer {
  const key = ensureKey(workspaceId);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const content = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: EncryptedPayload = {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    content: content.toString("base64")
  };
  return Buffer.from(`${ENVELOPE_PREFIX}${JSON.stringify(envelope)}`);
}

export function decryptBufferForWorkspace(buffer: Buffer, workspaceId: string): Buffer {
  const raw = buffer.toString("utf-8");
  if (!raw.startsWith(ENVELOPE_PREFIX)) {
    return buffer;
  }
  const payload = JSON.parse(raw.slice(ENVELOPE_PREFIX.length)) as EncryptedPayload;
  const key = ensureKey(workspaceId);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const content = Buffer.from(payload.content, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content), decipher.final()]);
}

function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

export function shredKey(workspaceId: string): ShredReceipt | null {
  const key = workspaceKeys.get(workspaceId);
  if (!key) return null;
  const shreddedAt = new Date().toISOString();
  const keyDigest = sha256Hex(key);
  const nonce = randomBytes(16).toString("hex");
  const receiptDigest = sha256Hex(`${workspaceId}:${shreddedAt}:${keyDigest}:${nonce}`);
  key.fill(0);
  workspaceKeys.delete(workspaceId);
  return {
    workspaceId,
    shreddedAt,
    keyDigest,
    receiptDigest,
    nonce,
    algorithm: "SHA-256"
  };
}

export async function shredWorkspace(workspaceId: string) {
  const receipt = shredKey(workspaceId);
  await prisma.workspaceSecret.deleteMany({
    where: { workspaceId, provider: WORKSPACE_KEY_PROVIDER }
  }).catch(() => null);
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => null);
  return receipt;
}

export const cryptoShredder = {
  generateKey,
  setWorkspaceKey,
  ensureWorkspaceKey,
  getWorkspaceKey,
  loadWorkspaceKey,
  persistWorkspaceKey,
  encrypt,
  decrypt,
  encryptBufferForWorkspace,
  decryptBufferForWorkspace,
  shredKey,
  shredWorkspace
};
