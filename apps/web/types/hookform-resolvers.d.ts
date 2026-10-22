declare module "@hookform/resolvers/zod" {
  import type { FieldValues, Resolver } from "react-hook-form";
  import type { ParseParams, ZodType, ZodTypeDef } from "zod";

  export function zodResolver<TFieldValues extends FieldValues>(
    schema: ZodType<TFieldValues, ZodTypeDef, any>,
    schemaOptions?: Partial<ParseParams>,
    resolverOptions?: { mode?: "async" | "sync" }
  ): Resolver<TFieldValues>;
}
