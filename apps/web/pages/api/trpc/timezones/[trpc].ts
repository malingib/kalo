import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { timezonesRouter } from "@kalo/trpc/server/routers/publicViewer/timezones/_router";

export default createNextApiHandler(timezonesRouter, true);
