import type { NextApiRequest } from "next";

import { symmetricEncrypt } from "@kalo/lib/crypto";

import {
  KALO_APP_CREDENTIAL_ENCRYPTION_KEY,
  KALO_CREDENTIAL_SYNC_SECRET,
  KALO_CREDENTIAL_SYNC_HEADER_NAME,
  KALO_ADMIN_API_KEY,
} from "../../constants";
import { generateGoogleCalendarAccessToken, generateZoomAccessToken } from "../../lib/integrations";

export default async function handler(req: NextApiRequest, res) {
  const isInvalid = req.query.invalid === "1";
  const userId = parseInt(req.query.userId as string, 10);
  const appSlug = req.query.appSlug;

  try {
    let accessToken;
    if (appSlug === "google-calendar") {
      accessToken = await generateGoogleCalendarAccessToken();
    } else if (appSlug === "zoom") {
      accessToken = await generateZoomAccessToken();
    } else {
      throw new Error(`Unhandled appSlug: ${appSlug}`);
    }

    if (!accessToken) {
      return res.status(500).json({ error: "Could not get access token" });
    }

    const result = await fetch(
      `http://localhost:3002/api/v1/credential-sync?apiKey=${KALO_ADMIN_API_KEY}&userId=${userId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [KALO_CREDENTIAL_SYNC_HEADER_NAME]: KALO_CREDENTIAL_SYNC_SECRET,
        },
        body: JSON.stringify({
          appSlug,
          encryptedKey: symmetricEncrypt(
            JSON.stringify({
              access_token: isInvalid ? "1233231231231" : accessToken,
            }),
            KALO_APP_CREDENTIAL_ENCRYPTION_KEY
          ),
        }),
      }
    );

    const clonedResult = result.clone();
    try {
      if (result.ok) {
        const json = await result.json();
        return res.status(200).json(json);
      } else {
        return res.status(400).json({ error: await clonedResult.text() });
      }
    } catch (e) {
      return res.status(400).json({ error: await clonedResult.text() });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Internal Server Error", error: error.message });
  }
}
