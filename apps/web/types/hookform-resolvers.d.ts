declare module "@hookform/resolvers/zod" {
  import type { FieldValues, Resolver } from "react-hook-form";
  import type { ZodType } from "zod";

  export function zodResolver<TFieldValues extends FieldValues>(
    schema: ZodType<TFieldValues, any>,
    schemaOptions?: Parameters<ZodType["parse"]>[1],
    resolverOptions?: { mode?: "async" | "sync" }
  ): Resolver<TFieldValues>;
}
