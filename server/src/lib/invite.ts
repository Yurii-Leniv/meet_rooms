import { prisma } from '../prisma.js';

// No ambiguous characters (0/O, 1/I) so codes are easy to read and share.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Turn a company name into a short prefix, e.g. "Acme Corp" -> "ACME". */
function prefixFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 4) || 'TEAM').padEnd(4, 'X');
}

/**
 * Generates a human-friendly, unique invite code like "ACME-7X4K2".
 * Retries until it finds one not already in use.
 */
export async function generateInviteCode(companyName: string): Promise<string> {
  const prefix = prefixFromName(companyName);
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${prefix}-${randomSegment(5)}`;
    const existing = await prisma.company.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  // Extremely unlikely fallback: add more entropy.
  return `${prefix}-${randomSegment(8)}`;
}
