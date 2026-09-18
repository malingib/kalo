/// <reference types="@kalo/types/next-auth" />
import { getDownloadLinkOfCalVideoByRecordingId } from "@kalo/features/conferencing/lib/videoClient";
import { IS_SELF_HOSTED } from "@kalo/lib/constants";

import { TRPCError } from "@trpc/server";

import type { WithSession } from "../../../createContext";
import type { TGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";

type GetDownloadLinkOfCalVideoRecordingsHandlerOptions = {
  ctx: WithSession;
  input: TGetDownloadLinkOfCalVideoRecordingsInputSchema;
};

export const getDownloadLinkOfCalVideoRecordingsHandler = async ({
  input,
  ctx,
}: GetDownloadLinkOfCalVideoRecordingsHandlerOptions) => {
  const { recordingId } = input;
  const { session } = ctx;

  const isDownloadAllowed = IS_SELF_HOSTED || session?.user?.belongsToActiveTeam;

  if (!isDownloadAllowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }

  try {
    const res = await getDownloadLinkOfCalVideoByRecordingId(recordingId);
    return res;
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }
};
