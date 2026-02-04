import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { assertGroundedFindings, GroundingError } from '../forensics/assertGroundedFindings.js';
import { storageService } from '../storageService.js';

async function buildPdfWithText(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 72, y: 720, size: 12, font });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function makeMockPrisma(anchor: any) {
  return {
    anchor: {
      findFirst: async ({ where }: any) => {
        // Very small mock: only enforce id/exhibitId/workspaceId checks.
        if (where?.id !== anchor.id) return null;
        if (where?.exhibitId !== anchor.exhibitId) return null;
        if (where?.exhibit?.workspaceId !== anchor.workspaceId) return null;
        return {
          id: anchor.id,
          exhibitId: anchor.exhibitId,
          pageNumber: anchor.pageNumber,
          bboxJson: anchor.bboxJson,
          exhibit: {
            integrityHash: anchor.integrityHash || 'hashhashhashhash',
            storageKey: 'mock-storage-key',
          },
        };
      },
    },
  } as any;
}

test('grounding: missing bbox -> 422', async () => {
  const prisma = makeMockPrisma({
    id: 'a1',
    exhibitId: 'e1',
    workspaceId: 'w1',
    pageNumber: 3,
    bboxJson: '[1,2,3,4]',
  });

  await assert.rejects(
    () => assertGroundedFindings(prisma, [{ exhibitId: 'e1', anchorId: 'a1', page_number: 3 }], 'w1'),
    (err: any) => {
      assert.ok(err instanceof GroundingError);
      assert.equal(err.status, 422);
      return true;
    }
  );
});

test('grounding: anchorId not in exhibit/workspace -> 422', async () => {
  const prisma = makeMockPrisma({
    id: 'a1',
    exhibitId: 'e1',
    workspaceId: 'w1',
    pageNumber: 3,
    bboxJson: '[1,2,3,4]',
  });

  await assert.rejects(
    () =>
      assertGroundedFindings(
        prisma,
        [{ exhibitId: 'e2', anchorId: 'a1', page_number: 3, bbox: [1, 2, 3, 4] }],
        'w1'
      ),
    (err: any) => {
      assert.ok(err instanceof GroundingError);
      assert.equal(err.status, 422);
      assert.equal(err.code, 'ANCHOR_NOT_FOUND');
      return true;
    }
  );
});

test('grounding: page/bbox mismatch -> 422', async () => {
  const prisma = makeMockPrisma({
    id: 'a1',
    exhibitId: 'e1',
    workspaceId: 'w1',
    pageNumber: 3,
    bboxJson: '[10,20,30,40]',
    integrityHash: 'abc123abc123abc123',
  });

  await assert.rejects(
    () =>
      assertGroundedFindings(
        prisma,
        [{ exhibitId: 'e1', anchorId: 'a1', page_number: 4, bbox: [10, 20, 30, 40] }],
        'w1'
      ),
    (err: any) => {
      assert.ok(err instanceof GroundingError);
      assert.equal(err.code, 'PAGE_MISMATCH');
      return true;
    }
  );

  await assert.rejects(
    () =>
      assertGroundedFindings(
        prisma,
        [{ exhibitId: 'e1', anchorId: 'a1', page_number: 3, bbox: [0, 0, 0, 0] }],
        'w1'
      ),
    (err: any) => {
      assert.ok(err instanceof GroundingError);
      assert.equal(err.code, 'BBOX_MISMATCH');
      return true;
    }
  );
});

test('grounding: invalid stored bbox -> 422', async () => {
  const prisma = makeMockPrisma({
    id: 'a1',
    exhibitId: 'e1',
    workspaceId: 'w1',
    pageNumber: 3,
    bboxJson: '"not-a-bbox"',
  });

  await assert.rejects(
    () =>
      assertGroundedFindings(
        prisma,
        [{ exhibitId: 'e1', anchorId: 'a1', page_number: 3, bbox: [10, 20, 30, 40] }],
        'w1'
      ),
    (err: any) => {
      assert.ok(err instanceof GroundingError);
      assert.equal(err.code, 'ANCHOR_BBOX_INVALID');
      return true;
    }
  );
});

test('grounding: valid finding passes', async () => {
  const originalDownload = storageService.download.bind(storageService);
  const pdfBytes = await buildPdfWithText('q');
  (storageService as any).download = async (key: string) => {
    if (key === 'mock-storage-key') return pdfBytes;
    return originalDownload(key);
  };

  const prisma = makeMockPrisma({
    id: 'a1',
    exhibitId: 'e1',
    workspaceId: 'w1',
    pageNumber: 1,
    bboxJson: '[0,0,1000,1000]',
  });

  try {
    const out = await assertGroundedFindings(
      prisma,
      [{ exhibitId: 'e1', anchorId: 'a1', page_number: 1, bbox: [0, 0, 1000, 1000], quote: 'q' }],
      'w1'
    );

    assert.equal(out.length, 1);
    assert.equal(out[0].anchorId, 'a1');
    assert.ok(typeof out[0].integrityHash === 'string');
  } finally {
    (storageService as any).download = originalDownload;
  }
});
