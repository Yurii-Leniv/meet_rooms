# 🏢 MeetRooms

A meeting-room booking app for IT companies. See which rooms are free right now and book one for your meeting — no more double-booked rooms or awkward interruptions.

## Features

- 🔐 User registration & login (JWT auth)
- 🗺️ Dashboard with all rooms and their live **free / busy** status
- 📅 Per-room daily timeline of bookings
- ✅ Create a booking with automatic **conflict prevention**
- 🙋 "My bookings" view with the ability to cancel
- 💻 Modern, responsive UI

## Tech stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Frontend  | Vite, React, TypeScript, React Router, TanStack Query, Tailwind CSS |
| Backend   | Node, Express, TypeScript, Prisma ORM, JWT, Zod             |
| Database  | SQLite (dev) — swappable for PostgreSQL in production        |

## Project structure

```
meet_rooms/
├── server/   # Express + Prisma REST API
└── client/   # React single-page app
```

## Getting started

### 1. Backend

```bash
cd server
npm install
npm run db:push      # create the SQLite database
npm run db:seed      # add demo rooms + a demo user
npm run dev          # http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev          # http://localhost:5173
```

### Demo login

- **Email:** demo@meetrooms.dev
- **Password:** password123

## License

MIT
