import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { storageService } from '../storageService.js';

function buildExifJpeg() {
  const exifPayload = Buffer.from("Exif\u0000\u0000GPSDATA\u0000\u0000\u0000", "binary");
  const length = exifPayload.length + 2;
  const lengthBytes = Buffer.from([0x00, length]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1]),
    lengthBytes,
    exifPayload,
    Buffer.from([0xff, 0xd9])
  ]);
}

test('preserves EXIF metadata after upload/download', async () => {
  const buffer = buildExifJpeg();
  const key = `test-workspace/exif/${Date.now()}-${crypto.randomUUID()}.jpg`;
  await storageService.upload(key, buffer);
  const downloaded = await storageService.download(key);
  await storageService.delete(key).catch(() => null);

  assert.equal(downloaded.equals(buffer), true);
  assert.ok(downloaded.includes(Buffer.from("Exif\u0000\u0000", "binary")));
  assert.ok(downloaded.includes(Buffer.from("GPSDATA", "binary")));
});
