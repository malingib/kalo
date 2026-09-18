import { Transform } from "class-transformer";

import { normalizeTimezone } from "@kalo/platform-types";

export function CapitalizeTimeZone(): PropertyDecorator {
  return Transform(({ value }) => normalizeTimezone(value));
}
