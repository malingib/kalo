import { FilterSegmentRepository } from "@kalo/features/data-table/repositories/filterSegment";
import type { TDeleteFilterSegmentInputSchema } from "@kalo/features/data-table/repositories/filterSegment.type";
import type { TrpcSessionUser } from "@kalo/trpc/server/types";

export const deleteFilterSegmentHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFilterSegmentInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  await repository.delete({
    userId: ctx.user.id,
    id: input.id,
  });

  return {
    id: input.id,
    message: "Filter segment deleted successfully",
  };
};
