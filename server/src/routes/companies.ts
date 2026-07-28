import { Router } from 'express';
import { prisma } from '../prisma.js';
import { notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { generateInviteCode } from '../lib/invite.js';

export const companiesRouter = Router();

companiesRouter.use(authenticate);

/**
 * GET /api/companies/me
 * Returns the current user's company. Admins also get the member list.
 */
companiesRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: {
        _count: { select: { rooms: true, users: true } },
      },
    });
    if (!company) throw notFound('Company not found');

    const isAdmin = req.user!.role === 'ADMIN';
    const members = isAdmin
      ? await prisma.user.findMany({
          where: { companyId: company.id },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : undefined;

    res.json({
      company: {
        id: company.id,
        name: company.name,
        // Only the admin needs the invite code to share it.
        inviteCode: isAdmin ? company.inviteCode : undefined,
        roomCount: company._count.rooms,
        memberCount: company._count.users,
      },
      members,
    });
  }),
);

/**
 * POST /api/companies/regenerate-code  (ADMIN only)
 * Issues a fresh invite code, invalidating the old one.
 */
companiesRouter.post(
  '/regenerate-code',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
    });
    if (!company) throw notFound('Company not found');

    const inviteCode = await generateInviteCode(company.name);
    const updated = await prisma.company.update({
      where: { id: company.id },
      data: { inviteCode },
    });

    res.json({ inviteCode: updated.inviteCode });
  }),
);
