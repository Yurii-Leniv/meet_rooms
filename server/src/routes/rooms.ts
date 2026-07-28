import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

export const roomsRouter = Router();

// All room routes require an authenticated user (scoped to their company).
roomsRouter.use(authenticate);

/** Shape a room for the API, turning the amenities CSV into an array. */
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
  capacity: z.number().int().min(1).max(1000),
  floor: z.number().int().min(-5).max(200),
  location: z.string().max(120).optional().nullable(),
  amenities: z.array(z.enum(['tv', 'projector', 'whiteboard', 'videoconf'])).default([]),
  imageUrl: z.string().url().optional().nullable(),
});

/**
 * GET /api/rooms?at=<ISO>
 * Lists the company's active rooms. If `at` is provided, includes a `busy` flag
 * and the booking active at that instant, so the dashboard can show live status.
 */
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

const dayQuerySchema = z.object({ date: z.string().optional() });

/**
 * GET /api/rooms/:id?date=YYYY-MM-DD
 * Returns a single room (from the user's company) plus its bookings for the day.
 */
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
  from: z.string(), // YYYY-MM-DD (inclusive)
  to: z.string(), // YYYY-MM-DD (exclusive)
});

/**
 * GET /api/rooms/:id/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns all bookings for a room that overlap the [from, to) range —
 * used by the weekly calendar view.
 */
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

/**
 * POST /api/rooms  (ADMIN only)
 * Creates a room in the admin's company.
 */
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

/**
 * PATCH /api/rooms/:id  (ADMIN only)
 * Updates a room belonging to the admin's company.
 */
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

/**
 * DELETE /api/rooms/:id  (ADMIN only)
 * Removes a room (and its bookings, via cascade) from the admin's company.
 */
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
