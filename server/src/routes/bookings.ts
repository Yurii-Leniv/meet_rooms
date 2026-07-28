import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { conflict, forbidden, notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { hasConflict, parseBookingWindow } from '../lib/bookings.js';

export const bookingsRouter = Router();

// Every booking route requires authentication.
bookingsRouter.use(authenticate);

const createSchema = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(120),
  startTime: z.string(),
  endTime: z.string(),
});

/**
 * GET /api/bookings/mine
 * Lists the current user's upcoming and past bookings, newest first.
 */
bookingsRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId },
      orderBy: { startTime: 'desc' },
      include: { room: { select: { id: true, name: true, floor: true } } },
    });
    res.json({ bookings });
  }),
);

/**
 * POST /api/bookings
 * Creates a booking after validating the time window and checking for
 * conflicts with existing bookings in the same room.
 */
bookingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { roomId, title, startTime, endTime } = createSchema.parse(req.body);
    const { start, end } = parseBookingWindow(startTime, endTime);

    const room = await prisma.room.findFirst({
      where: { id: roomId, companyId: req.user!.companyId },
    });
    if (!room || !room.isActive) throw notFound('Room not found');

    if (await hasConflict(roomId, start, end)) {
      throw conflict('This room is already booked for the selected time');
    }

    const booking = await prisma.booking.create({
      data: {
        roomId,
        userId: req.user!.userId,
        title,
        startTime: start,
        endTime: end,
      },
      include: { room: { select: { id: true, name: true, floor: true } } },
    });

    res.status(201).json({ booking });
  }),
);

/**
 * DELETE /api/bookings/:id
 * Cancels a booking. Owners can cancel their own; admins can cancel any.
 */
bookingsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw notFound('Booking not found');

    const isOwner = booking.userId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw forbidden('You can only cancel your own bookings');
    }

    await prisma.booking.delete({ where: { id: booking.id } });
    res.status(204).send();
  }),
);
