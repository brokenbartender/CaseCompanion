import crypto from 'crypto';

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n').trim();
}

const PRIVATE_KEY_PEM_RAW = process.env.PRIVATE_KEY_PEM;
const PUBLIC_KEY_PEM_RAW = process.env.PUBLIC_KEY_PEM;

let PRIVATE_KEY_PEM = PRIVATE_KEY_PEM_RAW ? normalizePem(PRIVATE_KEY_PEM_RAW) : null;
let privateKey: crypto.KeyObject | null = null;
try {
  privateKey = PRIVATE_KEY_PEM ? crypto.createPrivateKey(PRIVATE_KEY_PEM) : null;
} catch {
  PRIVATE_KEY_PEM = null;
  privateKey = null;
}

let derivedPublicPem = privateKey
  ? crypto.createPublicKey(privateKey).export({ format: 'pem', type: 'spki' }).toString()
  : null;
let resolvedPublicPem = PUBLIC_KEY_PEM_RAW ? normalizePem(PUBLIC_KEY_PEM_RAW) : derivedPublicPem;
let publicKey: crypto.KeyObject | null = null;
try {
  publicKey = resolvedPublicPem ? crypto.createPublicKey(resolvedPublicPem) : null;
} catch {
  resolvedPublicPem = null;
  publicKey = null;
}

const ensureKeypair = () => {
  if (resolvedPublicPem && privateKey && publicKey) return;
  if (process.env.NODE_ENV === 'production' && !process.env.RENDER) {
    throw new Error('Missing required environment variable: PUBLIC_KEY_PEM');
  }
  const generated = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  privateKey = generated.privateKey;
  PRIVATE_KEY_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  resolvedPublicPem = generated.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  derivedPublicPem = resolvedPublicPem;
  publicKey = crypto.createPublicKey(resolvedPublicPem);
};

ensureKeypair();

function getResolvedPublicPem(): string {
  ensureKeypair();
  if (!resolvedPublicPem) {
    throw new Error('Missing required environment variable: PUBLIC_KEY_PEM');
  }
  return resolvedPublicPem;
}

function buildSignOptions() {
  if (!privateKey) ensureKeypair();
  if (!privateKey) throw new Error('Missing required environment variable: PRIVATE_KEY_PEM');
  if (privateKey.asymmetricKeyType === 'rsa' || privateKey.asymmetricKeyType === 'rsa-pss') {
    return {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    };
  }
  if (privateKey.asymmetricKeyType === 'ec') {
    return { key: privateKey, dsaEncoding: 'der' as const };
  }
  throw new Error(`Unsupported private key type: ${privateKey.asymmetricKeyType}`);
}

function buildVerifyOptions() {
  if (!publicKey) ensureKeypair();
  if (publicKey!.asymmetricKeyType === 'rsa' || publicKey!.asymmetricKeyType === 'rsa-pss') {
    return {
      key: publicKey!,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    };
  }
  if (publicKey!.asymmetricKeyType === 'ec') {
    return { key: publicKey! };
  }
  throw new Error(`Unsupported public key type: ${publicKey!.asymmetricKeyType}`);
}

export function getPublicKeyPem(): string {
  return getResolvedPublicPem();
}

export function getPublicKeyFingerprint() {
  return crypto.createHash('sha256').update(getResolvedPublicPem()).digest('hex');
}

export function getSigningAlgorithm() {
  ensureKeypair();
  return publicKey!.asymmetricKeyType === 'ec' ? 'ECDSA-SHA256' : 'RSASSA-PSS-SHA256';
}

export function signPayload(payload: string | Buffer) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  return crypto.sign('sha256', data, buildSignOptions()).toString('base64');
}

export function verifySignature(payload: string | Buffer, signatureB64: string) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const signature = Buffer.from(signatureB64, 'base64');
  return crypto.verify('sha256', data, buildVerifyOptions(), signature);
}

export function buildAuditEventMessage(prevHash: string, actorId: string, eventType: string, payloadStr: string) {
  return `${prevHash}${actorId}${eventType}${payloadStr}`;
}
