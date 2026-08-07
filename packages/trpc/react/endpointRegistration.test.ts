import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { viewerRouter } from "../server/routers/viewer/_router";
import { ENDPOINTS } from "./shared";

// Vitest always runs from the monorepo root (see vitest.config.mts), so
// process.cwd() is the repo root here.
const endpointsDir = path.join(process.cwd(), "apps/web/pages/api/trpc");
const endpointSet = new Set<string>(ENDPOINTS);

/**
 * The tRPC client maps `viewer.<name>.*` procedure calls to the endpoint
 * `/api/trpc/<name>` (resolveEndpoint in trpc.ts uses parts[1] for 3-segment
 * paths). Every viewer sub-router therefore needs BOTH an entry in ENDPOINTS
 * and a matching apps/web/pages/api/trpc/<name>/[trpc].ts handler — the two are
 * registered in different places with nothing linking them, so a new sub-router
 * silently 404s the whole dashboard if either half is forgotten (this exact
 * gap broke the vendor section until it was caught in a live browser).
 */
describe("viewer tRPC endpoint registration", () => {
  it("every viewer sub-router is exposed as a runtime API endpoint", () => {
    const problems: string[] = [];
    // tRPC routers expose their procedures as enumerable keys; internal
    // metadata lives on keys prefixed with `_` and the router API is on
    // `createCaller`.
    const subRouters = Object.keys(viewerRouter).filter(
      (key) => !key.startsWith("_") && key !== "createCaller"
    );

    expect(subRouters.length).toBeGreaterThan(10);

    for (const key of subRouters) {
      if (!endpointSet.has(key)) {
        problems.push(
          `${key}: present in viewerRouter but missing from ENDPOINTS (packages/trpc/react/shared.ts)`
        );
      }
      if (!existsSync(path.join(endpointsDir, key, "[trpc].ts"))) {
        problems.push(`${key}: no apps/web/pages/api/trpc/${key}/[trpc].ts handler`);
      }
    }

    expect(problems).toEqual([]);
  });
});
