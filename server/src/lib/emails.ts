import { config } from '../config.js';
import type { MailInput } from './mailer.js';

interface BookingEmailData {
  userName: string;
  userEmail: string;
  roomName: string;
  floor: number;
  title: string;
  startTime: Date;
  endTime: Date;
}

function formatWhen(start: Date, end: Date): string {
  const date = start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const time = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time(start)}–${time(end)}`;
}

function shell(heading: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#1f42f5;padding:20px 24px;color:#fff;font-size:18px;font-weight:800">
        🏢 MeetRooms
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a">${heading}</h1>
        ${bodyHtml}
        <a href="${config.appUrl}" style="display:inline-block;margin-top:20px;background:#1f42f5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
          Open MeetRooms
        </a>
      </div>
      <div style="padding:16px 24px;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9">
        You’re receiving this because you have a booking in MeetRooms.
      </div>
    </div>
  </div>`;
}

function detailsHtml(data: BookingEmailData): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">
      <tr><td style="padding:6px 0;color:#64748b">Meeting</td><td style="padding:6px 0;font-weight:600">${data.title}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Room</td><td style="padding:6px 0;font-weight:600">${data.roomName} (floor ${data.floor})</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">When</td><td style="padding:6px 0;font-weight:600">${formatWhen(data.startTime, data.endTime)}</td></tr>
    </table>`;
}

export function bookingConfirmationEmail(data: BookingEmailData): MailInput {
  const heading = `Booking confirmed ✅`;
  const html = shell(
    heading,
    `<p style="margin:0 0 16px;color:#475569">Hi ${data.userName}, your meeting room is booked.</p>${detailsHtml(data)}`,
  );
  const text = `Booking confirmed\n\n${data.title}\nRoom: ${data.roomName} (floor ${data.floor})\nWhen: ${formatWhen(
    data.startTime,
    data.endTime,
  )}`;
  return {
    to: data.userEmail,
    subject: `✅ Booked: ${data.roomName} — ${data.title}`,
    html,
    text,
  };
}

export function bookingReminderEmail(data: BookingEmailData): MailInput {
  const minutes = config.reminderLeadMinutes;
  const heading = `Starting soon ⏰`;
  const html = shell(
    heading,
    `<p style="margin:0 0 16px;color:#475569">Hi ${data.userName}, your meeting starts in about ${minutes} minutes.</p>${detailsHtml(data)}`,
  );
  const text = `Reminder: your meeting starts in about ${minutes} minutes\n\n${data.title}\nRoom: ${data.roomName} (floor ${data.floor})\nWhen: ${formatWhen(
    data.startTime,
    data.endTime,
  )}`;
  return {
    to: data.userEmail,
    subject: `⏰ Soon: ${data.roomName} — ${data.title}`,
    html,
    text,
  };
}
