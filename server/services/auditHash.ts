import crypto from 'crypto';

export const AUDIT_GENESIS_HASH = '0'.repeat(64);

export function computeAuditEventHash(args: {
  prevHash: string;
  timestamp: string;
  actorId: string;
  action: string;
  details: any;
}) {
  const detailsJson = JSON.stringify(args.details ?? null);
  const message = `${args.prevHash}|${args.timestamp}|${args.actorId}|${args.action}|${detailsJson}`;
  return crypto.createHash('sha256').update(message).digest('hex');
}
