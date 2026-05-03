---
number: 8
title: "Dependency Dashboard"
state: open
author: app/renovate
labels: []
url: https://github.com/shidari/hello-work-software-jobs/issues/8
createdAt: 2025-07-21T10:47:47Z
updatedAt: 2026-05-03T09:19:13Z
---

This issue lists Renovate updates and detected dependencies. Read the [Dependency Dashboard](https://docs.renovatebot.com/key-concepts/dashboard/) docs to learn more.<br>[View this repository on the Mend.io Web Portal](https://developer.mend.io/github/shidari/hello-work-software-jobs).

## Config Migration Needed

 - [ ] <!-- create-config-migration-pr --> Select this checkbox to let Renovate create an automated Config Migration PR.

## Rate-Limited

The following updates are currently rate-limited. To force their creation now, click on a checkbox below.

 - [ ] <!-- unlimit-branch=renovate/aws-lambda-8.x-lockfile -->chore(deps): update dependency @types/aws-lambda to v8.10.161
 - [ ] <!-- unlimit-branch=renovate/nextjs-monorepo -->fix(deps): update dependency next to v16.2.4
 - [ ] <!-- unlimit-branch=renovate/aws-sdk-js-v3-monorepo -->chore(deps): update dependency @aws-sdk/client-sqs to v3.1037.0
 - [ ] <!-- unlimit-branch=renovate/dotenvx-dotenvx-1.x-lockfile -->chore(deps): update dependency @dotenvx/dotenvx to v1.63.0
 - [ ] <!-- unlimit-branch=renovate/aws-cdk-2.x -->chore(deps): update dependency aws-cdk to v2.1119.0
 - [ ] <!-- unlimit-branch=renovate/wrangler-4.x -->chore(deps): update dependency wrangler to v4.85.0
 - [ ] <!-- unlimit-branch=renovate/pnpm-10.x -->chore(deps): update pnpm to v10.33.2
 - [ ] <!-- unlimit-branch=renovate/aws-cdk-monorepo -->fix(deps): update dependency aws-cdk-lib to v2.251.0
 - [ ] <!-- unlimit-branch=renovate/aws-actions-configure-aws-credentials-6.x -->chore(deps): update aws-actions/configure-aws-credentials action to v6
 - [ ] <!-- unlimit-branch=renovate/node-24.x -->chore(deps): update dependency @types/node to v24.12.2
 - [ ] <!-- unlimit-branch=renovate/typescript-6.x -->chore(deps): update dependency typescript to v6
 - [ ] <!-- unlimit-branch=renovate/public.ecr.aws-lambda-nodejs-24.x -->chore(deps): update public.ecr.aws/lambda/nodejs docker tag to v24
 - [ ] <!-- unlimit-branch=renovate/sparticuz-chromium-147.x -->fix(deps): update dependency @sparticuz/chromium to v147
 - [ ] <!-- create-all-rate-limited-prs -->🔐 **Create all rate-limited PRs at once** 🔐

## Pending Status Checks

The following updates await pending status checks. To force their creation now, click on a checkbox below.

 - [ ] <!-- approvePr-branch=renovate/biomejs-biome-2.x-lockfile -->chore(deps): update dependency @biomejs/biome to v2.4.14
 - [ ] <!-- approvePr-branch=renovate/hono-4.x -->chore(deps): update dependency hono to v4.12.16
 - [ ] <!-- approvePr-branch=renovate/kysely-0.x-lockfile -->chore(deps): update dependency kysely to v0.28.17
 - [ ] <!-- approvePr-branch=renovate/storybook-monorepo -->chore(deps): update storybook monorepo to v10.3.6 (`@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`, `storybook`)
 - [ ] <!-- approvePr-branch=renovate/cloudflare-workers-types-4.x-lockfile -->chore(deps): update dependency @cloudflare/workers-types to v4.20260503.1

## Open

The following updates have all been created. To force a retry/rebase of any, click on a checkbox below.

 - [ ] <!-- rebase-branch=renovate/effect-3.x-lockfile -->[chore(deps): update dependency effect to v3.21.2](../pull/919)
 - [ ] <!-- rebase-branch=renovate/effect-3.x -->[chore(deps): update dependency effect to v3.21.2](../pull/900)
 - [ ] <!-- rebase-branch=renovate/cloudflare-vitest-pool-workers-0.x -->[chore(deps): update dependency @cloudflare/vitest-pool-workers to ~0.15.0](../pull/862)
 - [ ] <!-- rebase-branch=renovate/node-22.x -->[chore(deps): update dependency @types/node to v22.19.17](../pull/870)
 - [ ] <!-- rebase-branch=renovate/node-24.x-lockfile -->[chore(deps): update dependency @types/node to v24.12.2](../pull/840)
 - [ ] <!-- rebase-branch=renovate/major-vitest-monorepo -->[chore(deps): update vitest monorepo to v4 (major)](../pull/492) (`@vitest/browser`, `vitest`)
 - [ ] <!-- rebase-branch=renovate/lock-file-maintenance -->[chore(deps): lock file maintenance](../pull/817)
 - [ ] <!-- rebase-all-open-prs -->**Click on this checkbox to rebase all open PRs at once**

## PR Closed (Blocked)

The following updates are blocked by an existing closed PR. To recreate the PR, click on a checkbox below.

 - [ ] <!-- recreate-branch=renovate/typescript-5.x -->[chore(deps): update dependency typescript to ~5.9.0](../pull/84)

## Detected Dependencies

<details><summary>docker-compose (1)</summary>
<blockquote>

<details><summary>apps/backend/collector/infra/local/docker-compose.yml</summary>


</details>

</blockquote>
</details>

<details><summary>dockerfile (2)</summary>
<blockquote>

<details><summary>apps/backend/collector/infra/Dockerfile (1)</summary>

 - `public.ecr.aws/lambda/nodejs 22` → [Updates: `24`]

</details>

<details><summary>Dockerfile (1)</summary>

 - `node 24-bookworm-slim`

</details>

</blockquote>
</details>

<details><summary>github-actions (2)</summary>
<blockquote>

<details><summary>.github/workflows/deploy-collector.yml (2)</summary>

 - `aws-actions/configure-aws-credentials v4.3.1@7474bc4690e29a8392af63c5b98e7449536d5c3a` → [Updates: `v6.1.0`]
 - `node 24`

</details>

<details><summary>.github/workflows/pr-checks.yml (1)</summary>

 - `node 24`

</details>

</blockquote>
</details>

<details><summary>npm (9)</summary>
<blockquote>

<details><summary>apps/backend/api/package.json (13)</summary>

 - `@hono/standard-validator ^0.2.0`
 - `@hono/swagger-ui ^0.6.0`
 - `dotenv ^17.0.0`
 - `hono-openapi ^1.0.8`
 - `kysely ^0.28.0` → [Updates: `^0.28.0`]
 - `kysely-d1 ^0.4.0`
 - `@cloudflare/vitest-pool-workers ~0.12.21` → [Updates: `~0.15.0`]
 - `@dotenvx/dotenvx ^1.54.1` → [Updates: `^1.54.1`]
 - `@types/node ^24.0.15` → [Updates: `^24.0.15`]
 - `tsdown ^0.21.0`
 - `tsx ^4.20.3`
 - `vitest ~3.2.4` → [Updates: `~4.1.0`]
 - `wrangler 4.69.0` → [Updates: `4.85.0`]

</details>

<details><summary>apps/backend/collector/infra/package.json (13)</summary>

 - `@aws-sdk/client-sqs ^3.800.0` → [Updates: `^3.800.0`]
 - `aws-cdk-lib 2.243.0` → [Updates: `2.251.0`]
 - `constructs ^10.0.0`
 - `date-fns ^4.1.0`
 - `effect ^3.16.5` → [Updates: `^3.16.5`]
 - `linkedom 0.18.12`
 - `playwright ^1.58.2`
 - `@types/aws-lambda ^8.10.149`
 - `@types/node 24.12.0` → [Updates: `24.12.2`]
 - `aws-cdk 2.1118.0` → [Updates: `2.1119.0`]
 - `tsx ^4.20.3`
 - `typescript ~5.6.3` → [Updates: `~5.9.0`, `~6.0.0`]
 - `vitest ~3.2.4` → [Updates: `~4.1.0`]

</details>

<details><summary>apps/backend/collector/package.json (9)</summary>

 - `@aws-sdk/client-sqs ^3.800.0`
 - `@sparticuz/chromium ^143.0.4` → [Updates: `^147.0.0`]
 - `linkedom 0.18.12`
 - `playwright-core ^1.59.1`
 - `@types/aws-lambda ^8.10.149` → [Updates: `^8.10.149`]
 - `@types/node 22.19.15` → [Updates: `22.19.17`, `24.12.2`]
 - `tsdown ^0.21.0`
 - `tsx ^4.20.3`
 - `vitest ~3.2.4` → [Updates: `~4.1.0`]

</details>

<details><summary>apps/frontend/hello-work-job-searcher/package.json (17)</summary>

 - `jotai ^2.13.1`
 - `neverthrow ^8.2.0`
 - `next 16.2.3` → [Updates: `16.2.4`]
 - `react 19.2.5`
 - `react-dom 19.2.5`
 - `@dotenvx/dotenvx ^1.54.1` → [Updates: `^1.54.1`]
 - `@storybook/addon-a11y ^10.2.19` → [Updates: `^10.2.19`]
 - `@storybook/addon-docs ^10.2.19` → [Updates: `^10.2.19`]
 - `@storybook/addon-vitest ^10.2.19` → [Updates: `^10.2.19`]
 - `@storybook/nextjs-vite ^10.2.19` → [Updates: `^10.2.19`]
 - `@types/node 24.12.0` → [Updates: `24.12.2`]
 - `@types/react ^19`
 - `@types/react-dom ^19`
 - `@vitest/browser 3.2.4` → [Updates: `4.1.5`]
 - `playwright ^1.58.2`
 - `storybook ^10.2.19` → [Updates: `^10.2.19`]
 - `vitest 3.2.4` → [Updates: `4.1.5`]

</details>

<details><summary>package.json (3)</summary>

 - `@hono/swagger-ui ^0.6.0`
 - `@biomejs/biome ^2.0.6` → [Updates: `^2.0.6`]
 - `pnpm 10.30.3` → [Updates: `10.33.2`]

</details>

<details><summary>packages/db/package.json (7)</summary>

 - `kysely ^0.28.0` → [Updates: `^0.28.0`]
 - `kysely-d1 ^0.4.0`
 - `@cloudflare/workers-types ^4.20250317.0` → [Updates: `^4.20250317.0`]
 - `@types/node ^24.0.0` → [Updates: `^24.0.0`]
 - `better-sqlite3 ^12.0.0`
 - `kysely-codegen ^0.20.0`
 - `tsdown ^0.21.0`

</details>

<details><summary>packages/logger/package.json (1)</summary>

 - `tsdown ^0.21.0`

</details>

<details><summary>packages/models/package.json (1)</summary>

 - `tsdown ^0.21.0`

</details>

<details><summary>pnpm-workspace.yaml (3)</summary>

 - `effect 3.21.0` → [Updates: `3.21.2`]
 - `hono 4.12.15` → [Updates: `4.12.16`]
 - `typescript 5.9.3` → [Updates: `6.0.3`]

</details>

</blockquote>
</details>

---

- [ ] <!-- manual job -->Check this box to trigger a request for Renovate to run again on this repository



