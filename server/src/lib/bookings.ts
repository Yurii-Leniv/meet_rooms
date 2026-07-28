import { prisma } from '../prisma.js';
import { badRequest } from './http.js';

export function parseBookingWindow(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw badRequest('Invalid start or end time');
  }
  if (end <= start) {
    throw badRequest('End time must be after start time');
  }
  if (start < new Date(Date.now() - 60_000)) {
    throw badRequest('Cannot book a room in the past');
  }
  const maxDurationMs = 8 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxDurationMs) {
    throw badRequest('A single booking cannot exceed 8 hours');
  }

  return { start, end };
}

export async function hasConflict(
  roomId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const overlapping = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  return overlapping !== null;
}
