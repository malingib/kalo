import { createNextApiHandler } from "@kalo/trpc/server/createNextApiHandler";
import { bookingsRouter } from "@kalo/trpc/server/routers/viewer/bookings/_router";

export default createNextApiHandler(bookingsRouter);
