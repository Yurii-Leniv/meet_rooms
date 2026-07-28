import { createApp } from './app.js';
import { config } from './config.js';
import { startReminderScheduler } from './lib/scheduler.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 MeetRooms API running at http://localhost:${config.port}`);
  startReminderScheduler();
});
