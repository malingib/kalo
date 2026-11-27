import { z } from "zod";

import { APP_CREDENTIAL_SHARING_ENABLED } from "@kalo/lib/constants";

export const minimumTokenResponseSchema = z
  .object({
    access_token: z.string(),
  })
  .passthrough()
  .superRefine((tokenObject, ctx) => {
    if (!Object.values(tokenObject).some((value) => typeof value === "number")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Missing a field that defines a token expiry date. Check the specific app package to see how token expiry is defined.",
      });
    }
  });

export type ParseRefreshTokenResponse<S extends z.ZodType> = z.infer<S>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseRefreshTokenResponse = <S extends z.ZodType>(response: unknown, schema: S): ParseRefreshTokenResponse<S> => {
  let refreshTokenResponse;
  const credentialSyncingEnabled =
    APP_CREDENTIAL_SHARING_ENABLED && process.env.KALO_CREDENTIAL_SYNC_ENDPOINT;
  if (APP_CREDENTIAL_SHARING_ENABLED && process.env.KALO_CREDENTIAL_SYNC_ENDPOINT) {
    refreshTokenResponse = minimumTokenResponseSchema.safeParse(response);
  } else {
    refreshTokenResponse = schema.safeParse(response);
  }

  if (!refreshTokenResponse.success) {
    throw new Error("Invalid refreshed tokens were returned");
  }

  const parsedData = refreshTokenResponse.data as { refresh_token?: string; [key: string]: unknown };
  if (!parsedData.refresh_token && credentialSyncingEnabled) {
    parsedData.refresh_token = "refresh_token";
  }

  return refreshTokenResponse.data as ParseRefreshTokenResponse<S>;
};

export default parseRefreshTokenResponse;
