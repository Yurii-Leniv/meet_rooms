import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { generateInviteCode } from '../lib/invite.js';
import { badRequest, conflict, unauthorized } from '../lib/http.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

const credentialsSchema = {
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
};

// Path 1: the first person from a company creates it and becomes ADMIN.
const registerCompanySchema = z.object({
  ...credentialsSchema,
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  floors: z.number().int().min(1).max(200).default(1),
});

// Path 2: a colleague joins an existing company with its invite code.
const registerJoinSchema = z.object({
  ...credentialsSchema,
  inviteCode: z.string().min(1, 'Invite code is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };
}

function publicCompany(company: {
  id: string;
  name: string;
  inviteCode: string;
  floors: number;
}) {
  return {
    id: company.id,
    name: company.name,
    inviteCode: company.inviteCode,
    floors: company.floors,
  };
}

async function ensureEmailFree(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists');
}

/**
 * POST /api/auth/register/company
 * Creates a new company + its first (ADMIN) user, and returns an invite code
 * the admin can share with colleagues.
 */
authRouter.post(
  '/register/company',
  asyncHandler(async (req, res) => {
    const { name, email, password, companyName, floors } =
      registerCompanySchema.parse(req.body);
    await ensureEmailFree(email);

    const inviteCode = await generateInviteCode(companyName);

    const { user, company } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, inviteCode, floors },
      });
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(password),
          role: 'ADMIN',
          companyId: company.id,
        },
      });
      return { user, company };
    });

    const token = signToken({ userId: user.id, role: user.role, companyId: company.id });
    res.status(201).json({
      token,
      user: publicUser(user),
      company: publicCompany(company),
    });
  }),
);

/**
 * POST /api/auth/register/join
 * Joins an existing company via invite code as a regular MEMBER.
 */
authRouter.post(
  '/register/join',
  asyncHandler(async (req, res) => {
    const { name, email, password, inviteCode } = registerJoinSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });
    if (!company) throw badRequest('Invalid invite code — check it with your company admin');

    await ensureEmailFree(email);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: 'MEMBER',
        companyId: company.id,
      },
    });

    const token = signToken({ userId: user.id, role: user.role, companyId: company.id });
    res.status(201).json({
      token,
      user: publicUser(user),
      company: publicCompany(company),
    });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    });
    res.json({
      token,
      user: publicUser(user),
      company: publicCompany(user.company),
    });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { company: true },
    });
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user), company: publicCompany(user.company) });
  }),
);
