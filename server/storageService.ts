import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import type { ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { safeResolve } from './pathUtils.js';
import {
  decryptBufferForWorkspace,
  encryptBufferForWorkspace,
  ensureWorkspaceKey,
  loadWorkspaceKey,
  persistWorkspaceKey
} from './services/cryptoShredder.js';

dotenv.config();

export interface IStorageProvider {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix: string, maxKeys?: number): Promise<string[]>;
}

class DiskProvider implements IStorageProvider {
  private uploadDir = (() => {
    const cwd = (process as any).cwd();
    return path.resolve(cwd, 'uploads');
  })();
  private fallbackUploadDir = (() => {
    const cwd = (process as any).cwd();
    const candidate = path.resolve(cwd, 'server', 'uploads');
    return fs.existsSync(candidate) ? candidate : null;
  })();
  private masterKey?: Buffer;
  private encryptionRequired: boolean;

  constructor() {
    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const encryptionConfirmed = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.STORAGE_ENCRYPTION_CONFIRMED || '').toLowerCase()
    );
    const encryptionRequired = String(process.env.STORAGE_ENCRYPTION_REQUIRED || 'true').toLowerCase() !== 'false';
    const masterKey = this.loadMasterKey();
    if (nodeEnv === 'production' && !encryptionConfirmed) {
      throw new Error(
        'STORAGE_ENCRYPTION_CONFIRMED is required in production for disk storage. ' +
        'Ensure uploads/ resides on an encrypted volume (BitLocker/LUKS).'
      );
    }
    if (nodeEnv === 'production' && !masterKey) {
      throw new Error(
        'EVIDENCE_MASTER_KEY_B64 is required in production for disk storage encryption.'
      );
    }
    if (encryptionRequired && !masterKey) {
      throw new Error('STORAGE_ENCRYPTION_REQUIRED=true requires EVIDENCE_MASTER_KEY_B64.');
    }
    this.masterKey = masterKey;
    this.encryptionRequired = encryptionRequired;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(key: string, data: Buffer): Promise<string> {
    const finalPath = safeResolve(this.uploadDir, key);
    const targetDir = path.dirname(finalPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const workspaceId = this.extractWorkspaceId(key);
    ensureWorkspaceKey(workspaceId);
    await persistWorkspaceKey(workspaceId);
    const shreddedData = encryptBufferForWorkspace(data, workspaceId);

    if (this.masterKey) {
      const workspaceKey = this.deriveWorkspaceKey(key);
      const dek = crypto.randomBytes(32);
      const dataIv = crypto.randomBytes(12);
      const dataCipher = crypto.createCipheriv('aes-256-gcm', dek, dataIv);
      const cipherText = Buffer.concat([dataCipher.update(shreddedData), dataCipher.final()]);
      const dataTag = dataCipher.getAuthTag();

      const wrapIv = crypto.randomBytes(12);
      const wrapCipher = crypto.createCipheriv('aes-256-gcm', workspaceKey, wrapIv);
      const wrappedKey = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
      const wrapTag = wrapCipher.getAuthTag();

      await fs.promises.writeFile(this.getEncryptedPath(finalPath), cipherText);
      const metadataPath = this.getMetadataPath(finalPath);
      const metadata = {
        v: 1,
        algorithm: 'AES-256-GCM',
        wrappedKeyB64: wrappedKey.toString('base64'),
        wrapIvB64: wrapIv.toString('base64'),
        wrapTagB64: wrapTag.toString('base64'),
        dataIvB64: dataIv.toString('base64'),
        dataTagB64: dataTag.toString('base64'),
        workspaceId: this.extractWorkspaceId(key)
      };
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata), 'utf-8');
      return key;
    }

    await fs.promises.writeFile(finalPath, shreddedData);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    let filePath = safeResolve(this.uploadDir, key);
    let encryptedPath = this.getEncryptedPath(filePath);
    if (!fs.existsSync(filePath) && !fs.existsSync(encryptedPath) && this.fallbackUploadDir) {
      const fallbackPath = safeResolve(this.fallbackUploadDir, key);
      const fallbackEncrypted = this.getEncryptedPath(fallbackPath);
      if (fs.existsSync(fallbackPath) || fs.existsSync(fallbackEncrypted)) {
        filePath = fallbackPath;
        encryptedPath = fallbackEncrypted;
      }
    }
    if (!fs.existsSync(filePath) && !fs.existsSync(encryptedPath)) {
      throw new Error(`Asset not found in physical storage: ${key}`);
    }
    const metadataPath = this.getMetadataPath(filePath);
    const workspaceId = this.extractWorkspaceId(key);
    await loadWorkspaceKey(workspaceId);
    if (this.masterKey) {
      if (!fs.existsSync(metadataPath)) {
        throw new Error(`Encrypted metadata missing for asset: ${key}`);
      }
      const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8')) as {
        wrappedKeyB64: string;
        wrapIvB64: string;
        wrapTagB64: string;
        dataIvB64: string;
        dataTagB64: string;
        workspaceId?: string;
      };
      const workspaceKey = this.deriveWorkspaceKey(key, metadata.workspaceId);
      const wrapIv = Buffer.from(metadata.wrapIvB64, 'base64');
      const wrapTag = Buffer.from(metadata.wrapTagB64, 'base64');
      const wrappedKey = Buffer.from(metadata.wrappedKeyB64, 'base64');
      const unwrap = crypto.createDecipheriv('aes-256-gcm', workspaceKey, wrapIv);
      unwrap.setAuthTag(wrapTag);
      const dek = Buffer.concat([unwrap.update(wrappedKey), unwrap.final()]);

      const dataIv = Buffer.from(metadata.dataIvB64, 'base64');
      const dataTag = Buffer.from(metadata.dataTagB64, 'base64');
      const encrypted = await fs.promises.readFile(fs.existsSync(encryptedPath) ? encryptedPath : filePath);
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, dataIv);
      decipher.setAuthTag(dataTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decryptBufferForWorkspace(decrypted, workspaceId);
    }

    if (this.encryptionRequired) {
      throw new Error(`Encrypted storage required but no master key for asset: ${key}`);
    }
    const raw = await fs.promises.readFile(filePath);
    return decryptBufferForWorkspace(raw, workspaceId);
  }

  async delete(key: string): Promise<void> {
    const filePath = safeResolve(this.uploadDir, key);
    await fs.promises.unlink(filePath).catch(() => null);
    await fs.promises.unlink(this.getEncryptedPath(filePath)).catch(() => null);
    await fs.promises.unlink(this.getMetadataPath(filePath)).catch(() => null);
    if (this.fallbackUploadDir) {
      const fallbackPath = safeResolve(this.fallbackUploadDir, key);
      await fs.promises.unlink(fallbackPath).catch(() => null);
      await fs.promises.unlink(this.getEncryptedPath(fallbackPath)).catch(() => null);
      await fs.promises.unlink(this.getMetadataPath(fallbackPath)).catch(() => null);
    }
  }

  async list(prefix: string, maxKeys = 500): Promise<string[]> {
    const dir = safeResolve(this.uploadDir, prefix || '');
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    const walk = async (base: string) => {
      const entries = await fs.promises.readdir(base, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxKeys) return;
        const full = path.join(base, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (!entry.name.endsWith('.enc.json') && !entry.name.endsWith('.lexipro')) {
          const rel = path.relative(this.uploadDir, full).replace(/\\/g, '/');
          if (rel.startsWith(prefix)) results.push(rel);
        }
      }
    };
    await walk(dir);
    return results.slice(0, maxKeys);
  }

  private getEncryptedPath(filePath: string): string {
    return `${filePath}.lexipro`;
  }

  private getMetadataPath(filePath: string): string {
    return `${filePath}.enc.json`;
  }

  private extractWorkspaceId(key: string): string {
    const parts = String(key || '').split('/');
    return parts[0] || 'workspace-unknown';
  }

  private deriveWorkspaceKey(key: string, fallbackWorkspaceId?: string): Buffer {
    if (!this.masterKey) {
      throw new Error('Encryption key not initialized.');
    }
    const workspaceId = fallbackWorkspaceId || this.extractWorkspaceId(key);
    return crypto.createHmac('sha256', this.masterKey).update(workspaceId).digest();
  }

  private loadMasterKey(): Buffer | undefined {
    const raw = String(process.env.EVIDENCE_MASTER_KEY_B64 || '').trim();
    if (!raw) return undefined;
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new Error('EVIDENCE_MASTER_KEY_B64 must be 32 bytes (base64-encoded).');
    }
    return buf;
  }
}

class S3Provider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private sseMode: string;
  private kmsKeyId: string;
  private bucketKeyEnabled: boolean;

  constructor() {
    const bucket = (process.env.AWS_S3_BUCKET || '').trim();
    const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
    const sseMode = (process.env.AWS_SSE_MODE || 'AES256').trim();
    const kmsKeyId = (process.env.AWS_KMS_KEY_ID || '').trim();
    const bucketKeyEnabled = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.AWS_SSE_BUCKET_KEY_ENABLED || '').toLowerCase()
    );
    if (!bucket || !accessKeyId) {
      throw new Error('S3 storage selected but AWS_S3_BUCKET/AWS_ACCESS_KEY_ID are missing.');
    }
    if (!secretAccessKey) {
      throw new Error('S3 storage selected but AWS_SECRET_ACCESS_KEY is missing.');
    }
    if (sseMode !== 'aws:kms' && sseMode !== 'AES256') {
      throw new Error('AWS_SSE_MODE must be aws:kms or AES256.');
    }
    if (sseMode === 'aws:kms' && !kmsKeyId) {
      throw new Error('AWS_SSE_MODE=aws:kms requires AWS_KMS_KEY_ID.');
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.sseMode = sseMode;
    this.kmsKeyId = kmsKeyId;
    this.bucketKeyEnabled = bucketKeyEnabled;
  }

  async upload(key: string, data: Buffer): Promise<string> {
    const workspaceId = key.split('/')[0] || 'workspace-unknown';
    ensureWorkspaceKey(workspaceId);
    await persistWorkspaceKey(workspaceId);
    const shreddedData = encryptBufferForWorkspace(data, workspaceId);
    const sseParams: Record<string, any> = {};
    if (this.sseMode === 'aws:kms') {
      sseParams.ServerSideEncryption = 'aws:kms';
      sseParams.SSEKMSKeyId = this.kmsKeyId;
      if (this.bucketKeyEnabled) {
        sseParams.BucketKeyEnabled = true;
      }
    } else if (this.sseMode === 'AES256') {
      sseParams.ServerSideEncryption = 'AES256';
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: shreddedData,
      ContentType: this.getContentType(key),
      ...sseParams
    });

    await this.client.send(command);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`S3 Asset Body is null for key: ${key}`);
    }
    if (Buffer.isBuffer(response.Body)) {
      const workspaceId = key.split('/')[0] || 'workspace-unknown';
      await loadWorkspaceKey(workspaceId);
      return decryptBufferForWorkspace(response.Body, workspaceId);
    }
    const raw = await streamToBuffer(response.Body as Readable);
    const workspaceId = key.split('/')[0] || 'workspace-unknown';
    await loadWorkspaceKey(workspaceId);
    return decryptBufferForWorkspace(raw, workspaceId);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    await this.client.send(command);
  }

  async list(prefix: string, maxKeys = 500): Promise<string[]> {
    const out: string[] = [];
    let continuationToken: string | undefined = undefined;
    while (out.length < maxKeys) {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix || '',
        MaxKeys: Math.min(1000, maxKeys - out.length),
        ContinuationToken: continuationToken
      });
      const response: ListObjectsV2CommandOutput = await this.client.send(command);
      const contents = response.Contents || [];
      for (const item of contents) {
        if (item.Key) out.push(item.Key);
      }
      if (!response.IsTruncated || !response.NextContinuationToken) break;
      continuationToken = response.NextContinuationToken;
    }
    return out.slice(0, maxKeys);
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf': return 'application/pdf';
      case '.json': return 'application/json';
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      default: return 'application/octet-stream';
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const hasS3Env = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET);

export const storageMode = isProd && hasS3Env ? 'S3' : 'DISK';
export const storageService: IStorageProvider = storageMode === 'S3'
  ? new S3Provider()
  : new DiskProvider();
