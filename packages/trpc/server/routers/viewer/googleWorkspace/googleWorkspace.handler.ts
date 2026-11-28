import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import getAppKeysFromSlug from "@kalo/app-store/_utils/getAppKeysFromSlug";
import { prisma } from "@kalo/prisma";

import type { TrpcSessionUser } from "../../../types";

type CheckForGCalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const credentialsSchema = z.object({
  refresh_token: z.string().optional(),
  expiry_date: z.number().optional(),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  id_token: z.string().optional(),
  scope: z.string().optional(),
});

type GoogleWorkspaceDirectoryUsersResponse = {
  users?: Array<{ primaryEmail?: string | null }>;
  nextPageToken?: string;
};

export const checkForGWorkspace = async ({ ctx }: CheckForGCalOptions) => {
  const gWorkspacePresent = await prisma.credential.findFirst({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });

  return { id: gWorkspacePresent?.id };
};

export const getUsersFromGWorkspace = async ({ ctx }: CheckForGCalOptions) => {
  const { client_id, client_secret } = await getAppKeysFromSlug("google-calendar");
  if (!client_id || typeof client_id !== "string") throw new Error("Google client_id missing.");
  if (!client_secret || typeof client_secret !== "string") throw new Error("Google client_secret missing.");

  const hasExistingCredentials = await prisma.credential.findFirst({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });
  if (!hasExistingCredentials) {
    throw new Error("No workspace credentials found");
  }

  const credentials = credentialsSchema.parse(hasExistingCredentials.key);
  const oAuth2Client = new OAuth2Client(client_id, client_secret);
  oAuth2Client.setCredentials(credentials);

  // Use the Admin SDK REST endpoint through the existing authenticated OAuth
  // client. This avoids introducing a separate generated Google API package.
  const emails: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await oAuth2Client.request<GoogleWorkspaceDirectoryUsersResponse>({
      url: "https://admin.googleapis.com/admin/directory/v1/users",
      method: "GET",
      params: {
        maxResults: 200,
        customer: "my_customer",
        ...(pageToken ? { pageToken } : {}),
      },
    });

    for (const user of response.data.users ?? []) {
      if (typeof user.primaryEmail === "string" && user.primaryEmail.length > 0) {
        emails.push(user.primaryEmail);
      }
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return emails;
};

export const removeCurrentGoogleWorkspaceConnection = async ({ ctx }: CheckForGCalOptions) => {
  // There should only ever be one google_workspace_directory credential per user but we delete many as we can't make type unique
  const gWorkspacePresent = await prisma.credential.deleteMany({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });

  return { deleted: gWorkspacePresent?.count };
};
