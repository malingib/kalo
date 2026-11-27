import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { errorFormatter } from "./errorFormatter";

describe("errorFormatter", () => {
  const baseShape = {
    message: "Internal Server Error",
    code: 500,
    data: {
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
      path: "test",
    },
  };

  it("should format ZodError as BAD_REQUEST", () => {
    const zodError = z.object({ name: z.string() }).safeParse({}).error!;

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {
            name: ["Required"],
          },
        },
      },
    });
  });

  it("should handle nested ZodError", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number().min(18),
      }),
    });

    const zodError = schema.safeParse({ user: { name: "Jane", age: 17 } }).error!;

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: zodError.flatten(),
      },
    });
  });

  it("should handle multiple ZodError issues", () => {
    const zodError = z.object({ name: z.string(), age: z.number().min(18) }).safeParse({ age: 17 }).error!;

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: zodError.flatten(),
      },
    });
  });

  it("should not modify TRPCError", () => {
    const error = new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input",
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual(baseShape);
  });

  it("should not modify generic Error", () => {
    const baseError = new Error("Database connection failed");
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: baseError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual(baseShape);
  });

  it("should handle empty ZodError", () => {
    const zodError = new z.ZodError([]);
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {},
        },
      },
    });
  });
});
