import crypto from 'node:crypto';

let cachedKeys: { privateKeyPem: string; publicKeyPem: string } | null = null;

export function ensureSigningKeys() {
  if (!cachedKeys) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    cachedKeys = {
      privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
      publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString()
    };
  }
  process.env.PRIVATE_KEY_PEM = cachedKeys.privateKeyPem;
  process.env.PUBLIC_KEY_PEM = cachedKeys.publicKeyPem;
}
