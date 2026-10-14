# Kalo branding and runtime compatibility

This project is branded **Kalo**, but some identifiers inherited from the upstream scheduling platform are runtime contracts rather than user-facing branding.

## Compatibility policy

Do not perform a blind global replacement of `CAL_*`, `Cal`, or `cal` strings. Each match must be classified by its use.

### Preserve unless a dual-read migration is implemented

- `CALENDSO_ENCRYPTION_KEY`: existing self-hosted deployments may already use this secret. Renaming it without a fallback would make encrypted values unreadable.
- `IdentityProvider.CAL` and persisted enum values: database values and integrations may depend on these identifiers.
- `CAL_VIDEO`, `CAL_VIDEO_TYPE`, and other video-provider identifiers: external integrations and stored configuration may rely on them.
- Existing compatibility headers, helper exports, asset paths, and API contracts: treat these as public interfaces until usage and migration impact are verified.
- Database names such as `calendso`: local tooling, compose configuration, migration scripts, or existing installations may refer to them.

### Safe branding cleanup candidates

- User-facing copy, documentation, comments, examples, repository links, and default hostnames that direct users to upstream Cal services.
- Signup handler names and filenames when all imports and tests are updated together.
- Example API-key prefixes, provided validation and issued keys remain consistent.

## Environment variable migration rule

If a legacy variable must eventually be renamed, support both names during a migration window, define precedence explicitly, warn when the legacy name is used, update all example files, and only remove the legacy name in a documented breaking release. Never change the encryption key value or generate a replacement automatically.

## Validation checklist

Before merging branding/runtime cleanup:

1. Search source, tests, docs, workflow files, deployment manifests, and environment examples for `CAL_`, `cal.com`, `cal.local`, `calendso`, and `@calcom`.
2. Review each result in context; keep compatibility identifiers listed above unless a migration is included.
3. Run formatting, lint, type-check, unit tests, and the relevant signup/authentication, encryption, calendar/video integration, and deployment tests.
4. Confirm the environment example uses Kalo-local hostnames and contains no real credentials.
5. Review CI results on the pull request. A source-level review is not a substitute for executing the test suite.

## Changes in this audit

- Updated the example organization hostname from `app.cal.local` to `app.kalo.local`.
- Updated `ALLOWED_HOSTNAMES` to use `kalo.local` instead of `cal.local`.
- Updated the telemetry comment to refer to Kalo.
- Documented why `CALENDSO_ENCRYPTION_KEY` remains unchanged for existing deployments.

This document is a migration guardrail, not a claim that every legacy identifier in the repository has been eliminated or that the full test suite has passed.
