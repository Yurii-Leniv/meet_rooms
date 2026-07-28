import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { badRequest, notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

export const roomsRouter = Router();

roomsRouter.use(authenticate);

function serializeRoom(room: {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  location: string | null;
  amenities: string;
  imageUrl: string | null;
  isActive: boolean;
}) {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    floor: room.floor,
    location: room.location,
    amenities: room.amenities ? room.amenities.split(',').filter(Boolean) : [],
    imageUrl: room.imageUrl,
    isActive: room.isActive,
  };
}

const roomBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  capacity: z.number().int().min(1).max(1000).default(4),
  floor: z.number().int().min(0).max(200).default(1),
  location: z.string().max(120).optional().nullable(),
  amenities: z.array(z.enum(['tv', 'projector', 'whiteboard', 'videoconf'])).default([]),
  imageUrl: z.string().url().optional().nullable(),
});

roomsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const at = req.query.at ? new Date(String(req.query.at)) : new Date();
    const instant = Number.isNaN(at.getTime()) ? new Date() : at;

    const rooms = await prisma.room.findMany({
      where: { companyId: req.user!.companyId, isActive: true },
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
      include: {
        bookings: {
          where: { startTime: { lte: instant }, endTime: { gt: instant } },
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    });

    const result = rooms.map((room) => {
      const current = room.bookings[0];
      return {
        ...serializeRoom(room),
        busy: Boolean(current),
        currentBooking: current
          ? {
              id: current.id,
              title: current.title,
              startTime: current.startTime,
              endTime: current.endTime,
              user: current.user,
            }
          : null,
      };
    });

    res.json({ rooms: result, at: instant.toISOString() });
  }),
);

const availabilityQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
});

roomsRouter.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const { from, to } = availabilityQuerySchema.parse(req.query);
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw badRequest('Invalid time window');
    }

    const rooms = await prisma.room.findMany({
      where: { companyId: req.user!.companyId, isActive: true },
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
      include: {
        bookings: {
          where: { startTime: { lt: end }, endTime: { gt: start } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { startTime: 'asc' },
          take: 1,
        },
      },
    });

    const result = rooms.map((room) => {
      const conflict = room.bookings[0];
      return {
        ...serializeRoom(room),
        available: !conflict,
        conflict: conflict
          ? {
              id: conflict.id,
              title: conflict.title,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              user: conflict.user,
            }
          : null,
      };
    });

    res.json({
      rooms: result,
      from: start.toISOString(),
      to: end.toISOString(),
    });
  }),
);

const dayQuerySchema = z.object({ date: z.string().optional() });

roomsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { date } = dayQuerySchema.parse(req.query);

    const room = await prisma.room.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!room) throw notFound('Room not found');

    const day = date ? new Date(`${date}T00:00:00`) : new Date();
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      orderBy: { startTime: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({
      room: serializeRoom(room),
      date: dayStart.toISOString().slice(0, 10),
      bookings,
    });
  }),
);

const rangeQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
});

roomsRouter.get(
  '/:id/bookings',
  asyncHandler(async (req, res) => {
    const { from, to } = rangeQuerySchema.parse(req.query);

    const room = await prisma.room.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!room) throw notFound('Room not found');

    const rangeStart = new Date(`${from}T00:00:00`);
    const rangeEnd = new Date(`${to}T00:00:00`);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      orderBy: { startTime: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ bookings });
  }),
);

roomsRouter.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = roomBodySchema.parse(req.body);
    const room = await prisma.room.create({
      data: {
        name: body.name,
        capacity: body.capacity,
        floor: body.floor,
        location: body.location ?? null,
        amenities: body.amenities.join(','),
        imageUrl: body.imageUrl ?? null,
        companyId: req.user!.companyId,
      },
    });
    res.status(201).json({ room: serializeRoom(room) });
  }),
);

const bulkBodySchema = z.object({
  rooms: z.array(roomBodySchema).min(1, 'Add at least one room').max(100),
});

roomsRouter.post(
  '/bulk',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rooms } = bulkBodySchema.parse(req.body);
    const created = await prisma.$transaction(
      rooms.map((body) =>
        prisma.room.create({
          data: {
            name: body.name,
            capacity: body.capacity,
            floor: body.floor,
            location: body.location ?? null,
            amenities: body.amenities.join(','),
            imageUrl: body.imageUrl ?? null,
            companyId: req.user!.companyId,
          },
        }),
      ),
    );
    res.status(201).json({ rooms: created.map(serializeRoom) });
  }),
);

roomsRouter.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw notFound('Room not found');

    const body = roomBodySchema.parse(req.body);
    const room = await prisma.room.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        capacity: body.capacity,
        floor: body.floor,
        location: body.location ?? null,
        amenities: body.amenities.join(','),
        imageUrl: body.imageUrl ?? null,
      },
    });
    res.json({ room: serializeRoom(room) });
  }),
);

roomsRouter.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw notFound('Room not found');

    await prisma.room.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);
