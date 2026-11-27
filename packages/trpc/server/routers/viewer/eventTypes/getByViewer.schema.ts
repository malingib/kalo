import { z } from "zod";

import { SchedulingType } from "@kalo/prisma/enums";

export const filterQuerySchemaStrict = z.object({
  teamIds: z.number().array().optional(),
  // A user can only filter by only his userId
  upIds: z.string().array().max(1).optional(),
  schedulingTypes: z.nativeEnum(SchedulingType).array().optional(),
});

export type TFilterQuerySchemaStrict = z.output<typeof filterQuerySchemaStrict>;

export const ZEventTypeInputSchema = z
  .object({
    filters: filterQuerySchemaStrict.optional(),
  })
  .nullish();

export type TEventTypeInputSchema = z.output<typeof ZEventTypeInputSchema>;

export const ZGetEventTypesFromGroupSchema = z.object({
  filters: filterQuerySchemaStrict.optional(),
  cursor: z.number().nullish(),
  limit: z.number().default(10),
  group: z.object({ teamId: z.number().nullish(), parentId: z.number().nullish() }),
  searchQuery: z.string().optional(),
});

export type TGetEventTypesFromGroupSchemaInput = z.input<typeof ZGetEventTypesFromGroupSchema>;
export type TGetEventTypesFromGroupSchema = z.output<typeof ZGetEventTypesFromGroupSchema>;
