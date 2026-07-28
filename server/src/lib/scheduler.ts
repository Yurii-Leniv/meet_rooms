import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { sendMail } from './mailer.js';
import { bookingReminderEmail } from './emails.js';

export async function runReminderCheck(now: Date = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + config.reminderLeadMinutes * 60_000);

  const due = await prisma.booking.findMany({
    where: {
      reminderSentAt: null,
      startTime: { gt: now, lte: windowEnd },
    },
    include: {
      user: { select: { name: true, email: true } },
      room: { select: { name: true, floor: true } },
    },
  });

  for (const booking of due) {
    await sendMail(
      bookingReminderEmail({
        userName: booking.user.name,
        userEmail: booking.user.email,
        roomName: booking.room.name,
        floor: booking.room.floor,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
      }),
    );
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return due.length;
}

export function startReminderScheduler(): void {
  const tick = () => {
    runReminderCheck().catch((err) =>
      console.error('Reminder scheduler error:', err),
    );
  };
  tick();
  setInterval(tick, 60_000);
  console.log(
    `⏰ Reminder scheduler started (lead time: ${config.reminderLeadMinutes} min)`,
  );
}
