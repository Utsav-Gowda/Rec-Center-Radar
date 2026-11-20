# GitHub Pages frontend with Render and Atlas

Related task: [#33](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/33).
Keep hosting and US7 changes on `feature/equipment-registration` and merge through
the same reviewed PR. Include `Refs #33` and `Refs #32` in the PR description;
keep the hosting tasks open until the live deployment is verified.

```text
https://utsav-gowda.github.io/Rec-Center-Radar/
    → https://rec-center-radar-api.onrender.com/api/…
    → MongoDB Atlas (credentials stored only on Render)
```

Pages serves the React bundle; Render runs Express and connects to Atlas.
Local verification on November 16, 2026 passed all 59 tests and the production
Pages build; its HTML, JavaScript, and CSS returned HTTP 200 under the repository
path. Render health reported `ok`/`connected`, but responses to the Pages origin
omitted `Access-Control-Allow-Origin`. The Render CORS update below is still
required. The actual GitHub-hosted browser flow awaits setup and merge.

The app currently changes views with React state, so no server route fallback is
needed. If future work adds URL routing, use a hash router for Pages or provide
a tested deep-link fallback; Pages does not supply Express-style SPA rewrites.

## What CI does

[ci.yml](../.github/workflows/ci.yml) runs on PRs targeting `main` and pushes to
`main`. It uses Node 24, installs both packages with `npm ci`, runs required
server/UI/full-stack tests, then builds the frontend. Tests use disposable local
MongoDB; CI needs no Atlas connection string or Render secret.

Every CI build uses the Pages repository base (`/Rec-Center-Radar/`) and embeds
the public Render origin as `VITE_API_BASE_URL`. All frontend API requests use
the shared helper in `client/src/api.js`. The `API_PROXY_TARGET` setting still
controls local Vite proxies; it has no effect on a published Pages site.

Only a successful `main` push uploads `client/dist` and runs the Pages deployment
job. PRs test the same production build without publishing. Deployment uses the
`github-pages` environment with narrowly scoped Pages and OIDC permissions.
The resulting URL appears in the Actions run/deployment environment.

## Manual setup before merging

1. A repository administrator opens **Settings → Pages → Build and deployment**
   and sets **Source** to **GitHub Actions**. Do not select a branch folder or
   create an additional starter workflow; this PR already supplies the workflow.
   Leave any custom domain unset for the repository URL above.
2. If the repository restricts allowed Actions, permit the checkout, setup-node,
   configure-pages, upload-pages-artifact, and deploy-pages actions used in CI.
   Keep the PR review, required CI check, and verified-signature rules on `main`.
   If the `github-pages` environment has deployment branch restrictions, allow
   `main`; any required environment approval must be supplied after CI.
3. In **Render → My Workspace → Rec-Center-Radar-api → Environment**, set
   `CLIENT_ORIGIN` to this comma-separated list, retaining any other origins
   your team already uses:

   ```text
   http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://utsav-gowda.github.io
   ```

   Save and deploy the environment change. The Pages origin has **no**
   `/Rec-Center-Radar/` path or trailing slash. This enables browser reads and
   the JSON/`X-Demo-Role` registration preflight; a Vite proxy can hide a missing
   CORS setting during local testing.
4. Keep Render's branch `main`, root directory `server`, build command
   `npm ci --omit=dev`, start command `npm start`, and health check
   `/api/health`. Set `NODE_VERSION=24`. Keep the working Atlas connection string
   and outbound-IP allowlist. Set `DEMO_EMPLOYEE_MODE=true` only for the dedicated
   sprint demo database if the public employee toggle should be enabled.

The demo toggle lets **any visitor** register equipment as `demo-employee` when
enabled. It demonstrates role-dependent UI and server checks, not authentication.
US6 must replace this simulation before real employee access is supported.

No GitHub secrets are needed. The workflow defaults to the existing Render URL.
If that API moves, add/update the repository **Actions variable**
`VITE_API_BASE_URL` with the new HTTPS origin, without `/api`, then rebuild.
This value is public in the browser bundle; never put `MONGODB_URI`, a password,
or an API access key in any `VITE_` variable.

## Merge and verify

Commit with your own verified signature, push the feature branch, and open the
PR to `main`. It must receive at least one meaningful code review comment from
a team member and pass CI before merging, per the sprint convention.

After merge, check the **CI** workflow's build/test and Pages deployment jobs.
Also wait for Render's deployment of the same `main` commit to become live.
The two hosts deploy independently; Pages can become live while Render still
runs the previous API. With this workflow's `main`-push checks, Render's optional
**After CI Checks Pass** auto-deploy mode can be used after the workflow is
merged; **On Commit** also works. Neither path requires a deploy hook or CI key.

1. Open the [API health endpoint](https://rec-center-radar-api.onrender.com/api/health)
   and confirm `status: ok` and `database: connected`.
2. Open the [frontend](https://utsav-gowda.github.io/Rec-Center-Radar/) after the
   first successful deployment. Search by name, workout type, and muscle group;
   check the empty state and floor labels. Reload the page and verify assets load.
3. With demo mode enabled, select the employee toggle, register a uniquely named
   demo machine, and confirm it appears in search and the map preview.
4. On a second browser/machine, search for it or click **Refresh equipment** and
   **Refresh map**. A successful save updates the shared Atlas database; other
   clients refresh to see it. There is no automatic live push.

Keep #33 and #32 open until the hosted browser-to-API flow is checked. The
initial map is a foundation for US2 (#3), which owns the majority of the map,
accurate floor-plan assets, and navigation work.

If the frontend loads but API calls fail, check the browser Network panel:

| Symptom | Check |
|---------|-------|
| Requests go to `github.io/api` | Rebuild with `VITE_API_BASE_URL`; a static site has no Vite proxy |
| Browser reports a CORS error | Render `CLIENT_ORIGIN` must include `https://utsav-gowda.github.io` and the environment change must be deployed |
| API health is OK but demo/map routes return 501/404 | Render still runs the old US1 commit; wait for/check the new API deployment |
| Demo toggle is absent | `/api/auth/demo` must return `enabled: true` on the shared API |
| Slow first request | Render Free services sleep while idle; cold starts cannot guarantee the 1.5-second search target |

## Preview the production build locally

From the repository root (macOS/Linux):

```bash
VITE_API_BASE_URL=https://rec-center-radar-api.onrender.com PAGES_BASE_PATH=/Rec-Center-Radar/ npm run build --prefix client
PAGES_BASE_PATH=/Rec-Center-Radar/ npm run preview --prefix client -- --host 127.0.0.1 --port 5174 --strictPort
```

Stop any existing server using port 5174 or select another port and allow that
origin on Render. Open `http://127.0.0.1:5174/Rec-Center-Radar/`. This build calls
Render **directly**, exercising browser CORS. Rebuild after changing the public
API URL. Regular development can keep `VITE_API_BASE_URL` empty and use
`API_PROXY_TARGET` instead.

US2 floor-plan files can be placed in `client/public/floorplans/` with stored
paths such as `/floorplans/floor-2.png`; the frontend helper prefixes the Pages
base for these paths. Fully qualified image URLs keep their own host. The
current missing seed images use the labeled coordinate fallback.

References: [Vite static deployment](https://vite.dev/guide/static-deploy.html),
[Vite public environment variables](https://vite.dev/guide/env-and-mode.html),
[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
