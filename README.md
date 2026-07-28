# 🏢 MeetRooms

A multi-tenant meeting-room booking app for IT companies. Each company gets its
own workspace: see which rooms are free right now and book one for your meeting —
no more double-booked rooms or awkward interruptions.

## Features

- 🔐 **Company-based auth** — the first person registers their company and becomes
  its admin; colleagues join with a shareable **invite code**
- 🧭 **Multi-tenancy** — every company only sees its own rooms, bookings, and members
- 🗺️ Dashboard with all rooms and their live **free / busy** status, search & filter
- 📅 Per-room schedule with **day** and **week calendar** views
- ✅ Create a booking with automatic **conflict prevention**
- 🙋 "My bookings" view (upcoming / past) with cancellation
- 🛠️ **Admin panel** — manage rooms (add / edit / delete), invite code, and members
- 📧 **Email notifications** — booking confirmation + a reminder before the meeting
- 🧪 Backend test suite (Vitest + Supertest)

## Tech stack

| Layer     | Tech                                                                |
| --------- | ------------------------------------------------------------------- |
| Frontend  | Vite, React, TypeScript, React Router, TanStack Query, Tailwind CSS |
| Backend   | Node, Express, TypeScript, Prisma ORM, JWT, Zod                     |
| Database  | PostgreSQL (via Docker)                                              |
| Testing   | Vitest, Supertest                                                   |

## Project structure

```
meet_rooms/
├── docker-compose.yml   # PostgreSQL for local dev
├── server/              # Express + Prisma REST API
└── client/              # React single-page app
```

## Getting started

### 0. Start the database

```bash
docker compose up -d      # PostgreSQL on localhost:5433
```

### 1. Backend

```bash
cd server
npm install
npm run db:push           # create the schema
npm run db:seed           # add a demo company, admin, and rooms
npm run dev               # http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

### Demo account

- **Email:** demo@meetrooms.dev
- **Password:** password123
- **Invite code (to test joining):** `DEMO-ABCDE`

## Running tests

The backend suite runs against a dedicated `meetrooms_test` database (created
automatically) so it never touches your dev data. The database container must be
running.

```bash
cd server
npm test
```

## Email notifications

- A **confirmation** email is sent when a booking is created.
- A **reminder** email is sent ~15 minutes before the meeting starts (an
  in-process scheduler checks every minute; `REMINDER_LEAD_MINUTES` is
  configurable).

In production, set `RESEND_API_KEY` (and a verified `MAIL_FROM`) to send via
[Resend](https://resend.com). With no key set, emails go to a local
[Ethereal](https://ethereal.email) test inbox and a preview URL is logged — great
for development.

## How registration works

1. **Create a company** — you become the **admin**, get an invite code, and set up
   your meeting rooms in the admin panel.
2. **Join with a code** — enter the invite code your admin shared to join their
   workspace as a **member** and start booking.

## License

MIT
