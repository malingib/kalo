const TASKS = {
  everyMinute: { path: "/api/tasks/cron", method: "GET", auth: "secret" },
  everyFiveMinutes: [
    { path: "/api/cron/calendar-subscriptions", method: "GET", auth: "secret" },
    { path: "/api/cron/selected-calendars", method: "GET", auth: "secret" }
  ],
  everyFifteenMinutes: {
    path: "/api/cron/cancelStaleWhatsappReservations",
    method: "POST",
    auth: "apiKey"
  },
  midnightUtc: { path: "/api/tasks/cleanup", method: "GET", auth: "secret" },
  dailyCalendarCleanupUtc: {
    path: "/api/cron/calendar-subscriptions-cleanup",
    method: "GET",
    auth: "secret"
  }
};

function scheduledJobs(date) {
  const jobs = [TASKS.everyMinute];
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();

  if (minute % 5 === 0) jobs.push(...TASKS.everyFiveMinutes);
  if (minute % 15 === 0) jobs.push(TASKS.everyFifteenMinutes);
  if (hour === 0 && minute === 0) jobs.push(TASKS.midnightUtc);
  if (hour === 3 && minute === 0) jobs.push(TASKS.dailyCalendarCleanupUtc);

  return jobs;
}

async function invoke(job, env) {
  const authorization =
    job.auth === "apiKey" ? env.CRON_API_KEY : `Bearer ${env.CRON_SECRET}`;

  const response = await fetch(new URL(job.path, env.KALO_BASE_URL), {
    method: job.method,
    headers: {
      authorization,
      "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
      "user-agent": "kalo-cron-worker/1.0"
    }
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 1000);
    throw new Error(`${job.method} ${job.path} returned ${response.status}: ${body}`);
  }

  console.log(`[kalo-cron] ${job.path} completed with ${response.status}`);
}

export default {
  async scheduled(controller, env) {
    if (!env.KALO_BASE_URL || !env.CRON_SECRET || !env.CRON_API_KEY || !env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      throw new Error("Kalo cron Worker is missing one or more required bindings");
    }

    const date = new Date(controller.scheduledTime);
    const jobs = scheduledJobs(date);
    const results = await Promise.allSettled(jobs.map((job) => invoke(job, env)));
    const failures = results.filter((result) => result.status === "rejected");

    if (failures.length) {
      for (const failure of failures) {
        console.error("[kalo-cron] scheduled job failed", failure.reason);
      }
      throw new Error(`${failures.length} of ${jobs.length} scheduled Kalo jobs failed`);
    }
  },

  async fetch() {
    return new Response("Kalo external cron scheduler is healthy", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};

export { scheduledJobs };
