import test from "node:test";
import assert from "node:assert/strict";
import {
  decrypt,
  decryptBufferForWorkspace,
  encrypt,
  encryptBufferForWorkspace,
  generateKey,
  setWorkspaceKey,
  shredKey
} from "../services/cryptoShredder.js";

test("crypto shredder encrypts/decrypts and blocks after shredding", () => {
  const workspaceId = "ws-crypto-test";
  const key = generateKey();
  setWorkspaceKey(workspaceId, key);

  const payload = "Liability Evidence";
  const encrypted = encrypt(payload, key);
  const decrypted = decrypt(encrypted, key);
  assert.equal(decrypted, payload);

  const buffer = encryptBufferForWorkspace(Buffer.from(payload), workspaceId);
  const recovered = decryptBufferForWorkspace(buffer, workspaceId);
  assert.equal(recovered.toString("utf-8"), payload);

  const receipt = shredKey(workspaceId);
  assert.ok(receipt);
  assert.equal(receipt?.workspaceId, workspaceId);
  assert.equal(receipt?.algorithm, "SHA-256");

  assert.throws(() => {
    decryptBufferForWorkspace(buffer, workspaceId);
  }, /Access Denied \/ Data Shredded/);
});
