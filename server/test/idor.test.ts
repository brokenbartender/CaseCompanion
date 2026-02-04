import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResourceAccess } from '../middleware/resourceScope.js';
import { prisma } from '../lib/prisma.js';

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

test('IDOR: deny when exhibit is outside workspace scope', async () => {
  const origExhibitFind = prisma.exhibit.findFirst;
  const middleware = validateResourceAccess('exhibit', 'exhibitId');

  prisma.exhibit.findFirst = (async () => null) as any;

  const req: any = {
    userId: 'userA',
    workspaceId: 'wA',
    params: { exhibitId: 'ex1' }
  };
  const res = mockRes();

  await middleware(req, res as any, () => {
    throw new Error('next() should not be called on mismatch');
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Not found');

  prisma.exhibit.findFirst = origExhibitFind;
});

test('IDOR: deny when workspace context is missing', async () => {
  const middleware = validateResourceAccess('exhibit', 'exhibitId');

  const req: any = {
    userId: 'userA',
    params: { exhibitId: 'ex2' }
  };
  const res = mockRes();

  await middleware(req, res as any, () => {
    throw new Error('next() should not be called when workspace is missing');
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.error, 'Workspace ID required');
});

test('IDOR: allow access when exhibit is workspace-scoped', async () => {
  const origExhibitFind = prisma.exhibit.findFirst;
  const middleware = validateResourceAccess('exhibit', 'exhibitId');

  prisma.exhibit.findFirst = (async () => ({
    id: 'ex3',
    workspaceId: 'wB',
    storageKey: 'k',
    mimeType: 'application/pdf',
    integrityHash: 'h',
    verificationStatus: 'PENDING'
  })) as any;

  const req: any = {
    userId: 'userA',
    workspaceId: 'wB',
    params: { exhibitId: 'ex3' }
  };
  const res = mockRes();

  let called = false;
  await middleware(req, res as any, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.scopedExhibit?.id, 'ex3');

  prisma.exhibit.findFirst = origExhibitFind;
});
