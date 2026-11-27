import process from "node:process";
import { getLocaleFromRequest } from "@kalo/features/auth/lib/getLocaleFromRequest";
import { sendEmailVerification } from "@kalo/features/auth/lib/verifyEmail";
import { SIGNUP_ERROR_CODES } from "@kalo/features/auth/signup/constants";
import { createOrUpdateMemberships } from "@kalo/features/auth/signup/utils/createOrUpdateMemberships";
import { joinAnyChildTeamOnOrgInvite } from "@kalo/features/auth/signup/utils/organization";
import { prefillAvatar } from "@kalo/features/auth/signup/utils/prefillAvatar";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "@kalo/features/auth/signup/utils/token";
import { validateAndGetCorrectedUsernameAndEmail } from "@kalo/features/auth/signup/utils/validateUsername";
import { getFeatureRepository } from "@kalo/features/di/containers/FeatureRepository";
import { getUserRepository } from "@kalo/features/di/containers/UserRepository";
import { GlobalWatchlistRepository } from "@kalo/features/watchlist/lib/repository/GlobalWatchlistRepository";
import { sentrySpan } from "@kalo/features/watchlist/lib/telemetry";
import { normalizeEmail } from "@kalo/features/watchlist/lib/utils/normalization";
import { startPremiumUsernameSubscription } from "@kalo/features/mpesa";
import { checkIfEmailIsBlockedInWatchlistController } from "@kalo/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@kalo/lib/auth/hashPassword";
import { HttpError } from "@kalo/lib/http-error";
import logger from "@kalo/lib/logger";
import { isPrismaError } from "@kalo/lib/server/getServerErrorFromUnknown";
import type { CustomNextApiHandler } from "@kalo/lib/server/username";
import { usernameHandler } from "@kalo/lib/server/username";
import { prisma } from "@kalo/prisma";
import {
  CreationSource,
  IdentityProvider,
  WatchlistAction,
  WatchlistSource,
  WatchlistType,
} from "@kalo/prisma/enums";
import { signupSchema } from "@kalo/prisma/zod-utils";
import { buildLegacyRequest } from "@kalo/web/lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: ["signupKaloHandler"] });

const handler: CustomNextApiHandler = async (body, usernameStatus, query) => {
  const {
    email: _email,
    password,
    token,
  } = signupSchema
    .pick({
      email: true,
      password: true,
      token: true,
    })
    .parse(body);

  const userRepository = getUserRepository();

  const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController({
    email: _email,
    organizationId: null,
    span: sentrySpan,
  });

  log.debug("handler", { email: _email });

  let username: string | null = usernameStatus.requestedUserName;

  // Check for premium username
  if (usernameStatus.statusCode === 418) {
    return NextResponse.json(usernameStatus.json, { status: 418 });
  }

  // Validate the user
  if (!username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }

  const email = _email.toLowerCase();
  const premiumUsername = usernameStatus.statusCode === 402 ? username : null;
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : "";
  if (premiumUsername && token) {
    return NextResponse.json({ message: "Premium usernames must be purchased outside an organization invite." }, { status: 400 });
  }
  if (premiumUsername && !phoneNumber.trim()) {
    return NextResponse.json({ message: "A Kenyan phone number is required for M-Pesa payment." }, { status: 400 });
  }
  if (premiumUsername) username = null;
  let createdUserId: number | null = null;

  let foundToken: { id: number; teamId: number | null; expires: Date } | null = null;
  if (token) {
    foundToken = await findTokenByToken({ token });
    throwIfTokenExpired(foundToken?.expires);
    username = await validateAndGetCorrectedUsernameForTeam({
      username,
      email,
      teamId: foundToken?.teamId ?? null,
      isSignup: true,
    });

    if (foundToken?.teamId) {
      const existingUser = await userRepository.findByEmailWithInvitedTo({email})

      if (existingUser && existingUser.invitedTo !== foundToken.teamId) {
        return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
      }
    }
  } else {
    const usernameAndEmailValidation = await validateAndGetCorrectedUsernameAndEmail({
      username,
      email,
      isSignup: true,
    });
    if (!usernameAndEmailValidation.isValid) {
      throw new HttpError({
        statusCode: 409,
        message: "Username or email is already taken",
      });
    }

    if (!usernameAndEmailValidation.username) {
      throw new HttpError({
        statusCode: 422,
        message: "Invalid username",
      });
    }

    username = usernameAndEmailValidation.username;
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  if (foundToken?.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: foundToken.teamId,
      },
      include: {
        parent: {
          select: {
            id: true,
            slug: true,
            organizationSettings: true,
          },
        },
        organizationSettings: true,
      },
    });
    if (team) {
      const organizationId = team.isOrganization ? team.id : (team.parent?.id ?? null);

      if (username) {
        const existingUserByUsername = await userRepository.findByUsernameAndOrganizationId({
          username,
          organizationId,
          excludeEmail: email
        })
        if (existingUserByUsername) {
          return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
        }
      }

      let user: { id: number };
      try {
        user = await userRepository.upsertForSignup({
          email,
          username,
          hashedPassword,
          organizationId,
          emailVerified: new Date(),
          identityProvider: IdentityProvider.CAL
        })
      } catch (error) {
        if (isPrismaError(error) && error.code === "P2002") {
          const target = String(error.meta?.target ?? "");
          if (target.includes("email") || target.includes("username")) {
            return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
          }
        }
        throw error;
      }

      await createOrUpdateMemberships({
        user,
        team,
      });

      // Accept any child team invites for orgs.
      if (team.parent) {
        await joinAnyChildTeamOnOrgInvite({
          userId: user.id,
          org: team.parent,
        });
      }
    }

    // Cleanup token after use
    await prisma.verificationToken.delete({
      where: {
        id: foundToken.id,
      },
    });
  } else {
    // Create the user
    try {
      const createdUser = await userRepository.create({
        username,
        email,
        hashedPassword,
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        locked: shouldLockByDefault,
        identityProvider: IdentityProvider.CAL,
      });
      createdUserId = createdUser.id;
    } catch (error) {
      // Fallback for race conditions where user was created between our check and create
      if (isPrismaError(error) && error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("email") || target.includes("username")) {
          return NextResponse.json({ message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS }, { status: 409 });
        }
      }
      throw error;
    }
    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email });
    }
  }

  const featureRepository = getFeatureRepository();
  const signupWatchlistReviewEnabled =
    await featureRepository.checkIfFeatureIsEnabledGlobally("signup-watchlist-review");

  if (signupWatchlistReviewEnabled && !token) {
    const globalWatchlistRepo = new GlobalWatchlistRepository(prisma);
    const normalizedEmail = normalizeEmail(email);
    const existing = await globalWatchlistRepo.findBlockedEmail(normalizedEmail);

    if (!existing) {
      await globalWatchlistRepo.createEntry({
        type: WatchlistType.EMAIL,
        value: normalizedEmail,
        action: WatchlistAction.BLOCK,
        source: WatchlistSource.SIGNUP,
        description: "Auto-added during signup review",
      });
    }

    await userRepository.lockByEmail({ email });

    return NextResponse.json(
      { message: "Created user", accountUnderReview: true },
      { status: 201 }
    );
  }

  if (premiumUsername && createdUserId) {
    try {
      await startPremiumUsernameSubscription({
        userId: createdUserId,
        username: premiumUsername,
        phoneNumber,
      });
    } catch (error) {
      log.error("Could not start premium username M-Pesa payment", {
        userId: createdUserId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json(
        { message: "Your account was created, but the M-Pesa prompt could not be started. Please contact support before trying again." },
        { status: 502 }
      );
    }
  }

  if (!token) {
    sendEmailVerification({
      email,
      language: await getLocaleFromRequest(buildLegacyRequest(await headers(), await cookies())),
      username: username || "",
    });
  }

  return NextResponse.json(
    { message: premiumUsername ? "Created user; M-Pesa payment prompt initiated" : "Created user" },
    { status: 201 }
  );
};

export default usernameHandler(handler);
