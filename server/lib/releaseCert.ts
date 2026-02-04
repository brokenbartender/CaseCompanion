import crypto from 'crypto';

type ReleaseCertDecision = 'RELEASED' | 'WITHHELD_422';

type ReleaseCertAnchor = {
  anchorId: string;
  exhibitId?: string;
  page_number?: number;
  bbox?: [number, number, number, number];
  integrityHash?: string;
};

type ReleaseCertPayload = {
  v: string;
  kid: string;
  decision: ReleaseCertDecision;
  policy: string;
  policyHash: string;
  guardrailsHash?: string;
  workspaceId?: string;
  exhibitId?: string;
  anchors: ReleaseCertAnchor[];
  chain?: {
    v: string;
    seq: number;
    prev: string;
    hash: string;
  };
  timestamp: string;
  nonce: string;
  buildSha?: string;
};

type ReleaseCertPayloadInput = {
  decision: ReleaseCertDecision;
  guardrailsHash?: string;
  workspaceId?: string;
  exhibitId?: string;
  anchors?: ReleaseCertAnchor[];
  buildSha?: string;
};

const POLICY_ID = 'PRP-001:NO_ANCHOR_NO_OUTPUT';
const POLICY_TEXT = 'PRP-001: No Anchor -> No Output (422)';
const POLICY_HASH = crypto.createHash('sha256').update(POLICY_TEXT).digest('hex');
const ALG = 'EdDSA';
const CERT_VERSION = '1';
const CHAIN_VERSION = '1';

// Release-cert chain metadata is per-process (in-memory) and not the canonical ledger.
// Immutable ledger claims should reference audit log + integrity service, not this header chain.
let cachedPrivateKey: crypto.KeyObject | null = null;
let cachedPublicKey: crypto.KeyObject | null = null;
let cachedPublicKeyB64 = '';
let cachedKid = '';
let warnedMissingKeys = false;
const lastByWorkspace = new Map<string, { seq: number; lastHash: string }>();

function loadKeys() {
  if (cachedPrivateKey && cachedPublicKey) return;

  const privateB64 = process.env.RELEASE_CERT_PRIVATE_KEY_B64;
  const publicB64 = process.env.RELEASE_CERT_PUBLIC_KEY_B64;

  if (privateB64 && publicB64) {
    try {
      const privatePem = Buffer.from(privateB64, 'base64').toString('utf8');
      const publicPem = Buffer.from(publicB64, 'base64').toString('utf8');
      cachedPrivateKey = crypto.createPrivateKey(privatePem);
      cachedPublicKey = crypto.createPublicKey(publicPem);
      cachedPublicKeyB64 = publicB64;
      cachedKid = crypto.createHash('sha256').update(publicPem).digest('hex').slice(0, 16);
      return;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.warn('RELEASE_CERT_KEYS_INVALID: Falling back to ephemeral keys for non-production.');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing RELEASE_CERT_PRIVATE_KEY_B64/RELEASE_CERT_PUBLIC_KEY_B64 in production.');
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  cachedPrivateKey = privateKey;
  cachedPublicKey = publicKey;
  cachedPublicKeyB64 = Buffer.from(publicPem).toString('base64');
  cachedKid = crypto.createHash('sha256').update(publicPem).digest('hex').slice(0, 16);

  if (!warnedMissingKeys) {
    warnedMissingKeys = true;
    console.warn('RELEASE_CERT_KEYS_MISSING: Using ephemeral signing keys. Set RELEASE_CERT_PRIVATE_KEY_B64 and RELEASE_CERT_PUBLIC_KEY_B64 for stable verification.');
  }
}

function base64urlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(base, 'base64');
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function computeGenesisPrev(workspaceId: string) {
  const seed = process.env.GENESIS_SEED;
  if (seed) {
    return sha256Hex(`GENESIS:${seed}:${workspaceId}`);
  }
  return 'GENESIS';
}

function getBuildSha() {
  return process.env.GIT_SHA || process.env.COMMIT_SHA || process.env.RENDER_GIT_COMMIT || undefined;
}

export function buildReleaseCertPayload(input: ReleaseCertPayloadInput): ReleaseCertPayload {
  loadKeys();
  return {
    v: CERT_VERSION,
    kid: cachedKid,
    decision: input.decision,
    policy: POLICY_ID,
    policyHash: POLICY_HASH,
    guardrailsHash: input.guardrailsHash,
    workspaceId: input.workspaceId,
    exhibitId: input.exhibitId,
    anchors: input.anchors || [],
    timestamp: new Date().toISOString(),
    nonce: crypto.randomUUID(),
    buildSha: input.buildSha || getBuildSha()
  };
}

export function signReleaseCert(payload: ReleaseCertPayload) {
  loadKeys();
  const header = { alg: ALG, typ: 'JWT', kid: cachedKid };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto.sign(null, Buffer.from(data), cachedPrivateKey as crypto.KeyObject);
  return `${data}.${base64urlEncode(signature)}`;
}

export function verifyReleaseCert(token: string): { valid: boolean; payload?: ReleaseCertPayload; error?: string } {
  try {
    loadKeys();
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'INVALID_FORMAT' };
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const signature = base64urlDecode(signatureB64);
    const valid = crypto.verify(null, Buffer.from(data), cachedPublicKey as crypto.KeyObject, signature);
    if (!valid) return { valid: false, error: 'INVALID_SIGNATURE' };
    const payloadJson = base64urlDecode(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson) as ReleaseCertPayload;
    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || String(err) };
  }
}

export function attachReleaseCert(res: any, payload: ReleaseCertPayload) {
  try {
    const workspaceKey = payload.workspaceId || 'global';
    const prior = lastByWorkspace.get(workspaceKey);
    const seq = prior ? prior.seq + 1 : 1;
    const prev = prior ? prior.lastHash : computeGenesisPrev(workspaceKey);

    payload.chain = { v: CHAIN_VERSION, seq, prev, hash: '' };
    const draftToken = signReleaseCert(payload);
    const hash = sha256Hex(draftToken);
    payload.chain = { v: CHAIN_VERSION, seq, prev, hash };
    const token = signReleaseCert(payload);
    lastByWorkspace.set(workspaceKey, { seq, lastHash: hash });
    if (!res.headersSent) {
      res.setHeader('X-LexiPro-Release-Cert', token);
      res.setHeader('X-LexiPro-Release-Chain', `v=${CHAIN_VERSION};seq=${seq};prev=${prev.slice(0, 12)};hash=${hash.slice(0, 12)};scope=process`);
    }
  } catch (err: any) {
    console.warn('RELEASE_CERT_ATTACH_FAILED', err?.message || err);
  }
}

export function getReleaseCertMeta() {
  loadKeys();
  return {
    algorithm: ALG,
    publicKeyB64: cachedPublicKeyB64,
    policy: POLICY_ID,
    policyHash: POLICY_HASH,
    version: CERT_VERSION,
    kid: cachedKid,
    chainVersion: CHAIN_VERSION,
    chainScope: 'process',
    genesisMode: process.env.GENESIS_SEED ? 'seeded' : 'literal'
  };
}
