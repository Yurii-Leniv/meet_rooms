import { describe, it, expect } from 'vitest';
import { registerCompany, createRoom, hoursFromNow } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { runReminderCheck } from '../src/lib/scheduler.js';

async function makeBooking(startISO: string, endISO: string) {
  const admin = await registerCompany();
  const room = await createRoom(admin.token);
  const booking = await prisma.booking.create({
    data: {
      title: 'Standup',
      roomId: room.body.room.id,
      userId: admin.user.id,
      startTime: new Date(startISO),
      endTime: new Date(endISO),
    },
  });
  return booking;
}

describe('reminder scheduler', () => {
  it('reminds bookings starting within the lead window and is idempotent', async () => {
    const booking = await makeBooking(
      new Date(Date.now() + 10 * 60_000).toISOString(),
      new Date(Date.now() + 40 * 60_000).toISOString(),
    );

    const sent = await runReminderCheck();
    expect(sent).toBe(1);

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.reminderSentAt).not.toBeNull();

    const again = await runReminderCheck();
    expect(again).toBe(0);
  });

  it('does not remind bookings outside the lead window', async () => {
    await makeBooking(hoursFromNow(3), hoursFromNow(4));
    const sent = await runReminderCheck();
    expect(sent).toBe(0);
  });
});
