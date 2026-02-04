import crypto from 'crypto';

export async function sha256OfStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function sha256OfBuffer(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
