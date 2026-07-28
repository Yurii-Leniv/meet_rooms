import { prisma } from '../prisma.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function prefixFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 4) || 'TEAM').padEnd(4, 'X');
}

export async function generateInviteCode(companyName: string): Promise<string> {
  const prefix = prefixFromName(companyName);
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${prefix}-${randomSegment(5)}`;
    const existing = await prisma.company.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  return `${prefix}-${randomSegment(8)}`;
}
