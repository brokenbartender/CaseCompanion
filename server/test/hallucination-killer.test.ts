import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGrounding } from '../services/HallucinationKiller.js';

test('hallucination killer passes with valid citations', async () => {
  const response = 'The suspect entered at 10 PM. <cite>vid-1</cite>';
  process.env.SEMANTIC_ADVERSARY_MODE = 'DETERMINISTIC';
  const result = await verifyGrounding(response, [{ id: 'vid-1', text: 'The suspect entered at 10 PM.' }]);
  assert.deepEqual(result, { approved: true });
});

test('hallucination killer rejects when no citations are present', async () => {
  const response = 'The suspect is guilty.';
  process.env.SEMANTIC_ADVERSARY_MODE = 'DETERMINISTIC';
  const result = await verifyGrounding(response, [{ id: 'vid-1', text: 'The suspect entered at 10 PM.' }]);
  assert.deepEqual(result, { approved: false, reason: 'UNCITED_CLAIMS' });
});

test('hallucination killer rejects fabricated citations', async () => {
  const response = 'Evidence found here. <cite>vid-999</cite>';
  process.env.SEMANTIC_ADVERSARY_MODE = 'DETERMINISTIC';
  const result = await verifyGrounding(response, [{ id: 'vid-1', text: 'Evidence found here.' }]);
  assert.deepEqual(result, { approved: false, reason: 'FABRICATED_CITATION', details: 'vid-999' });
});

test('hallucination killer rejects citations that do not logically support the claim', async () => {
  const response = 'The suspect entered at 10 PM. <cite>vid-1</cite>';
  process.env.SEMANTIC_ADVERSARY_MODE = 'DETERMINISTIC';
  await assert.rejects(
    () => verifyGrounding(response, [{ id: 'vid-1', text: 'The suspect entered at 11 PM.' }]),
    (err: any) => {
      assert.equal(err?.status, 422);
      assert.match(String(err?.message || ''), /Citation vid-1 does not logically support the statement/);
      return true;
    }
  );
});
