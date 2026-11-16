# Shared Render API and local frontends

Related task: [#32](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/32).
Target workspace: **My Workspace**. The service
[Rec-Center-Radar-api](https://dashboard.render.com/web/srv-dbtj80dbedkc7381864g)
is live at `https://rec-center-radar-api.onrender.com`.

Verified November 16, 2026: `/api/health` returned HTTP 200 with API status `ok`
and database status `connected`. Equipment listing and all three search fields
worked through Render and a local Vite proxy. The local API and Render returned
the same nine equipment IDs, confirming they read the same Atlas catalog.

The deployed commit is currently `05975b9` on `main` (US1). The uncommitted US7
registration/map work is **not deployed**: `/api/auth/demo` currently returns 501
and `/api/floors` returns 404 on Render. Those routes become available after the
new feature PR is merged and Render finishes deploying it.

```text
Teammate's browser → local Vite /api proxy → shared Render Express API → Atlas
```

Teammates use the same API origin and database to share saved equipment. A new
save is visible in the registering tab immediately; other tabs/machines use
**Refresh equipment**, **Refresh map**, or another search. This is shared
persistence, not WebSocket/live push synchronization.

## 1. Deploy new features through review

The deployable code must first be committed by its author on
`feature/equipment-registration`, opened as a PR to `main`, receive the required
teammate review, and pass CI. Nothing needs to be committed directly to main.
The source for the Render service will be `main`.

## 2. Render service settings

The existing service uses these settings. For a replacement service, choose
**New → Web Service** in **My Workspace** and configure the same values:

| Setting | Value |
|---------|-------|
| Repository | `Utsav-Gowda/Rec-Center-Radar` |
| Branch | `main` |
| Language | Node |
| Root directory | `server` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Region | Choose a region close to the Atlas cluster |
| Auto-deploy | On Commit; optionally After CI Checks Pass once this PR's main-push CI is merged |

This PR adds CI for both PRs and `main` pushes. After it is merged, Render can
use **After CI Checks Pass** for commits on `main`. Until then, the older
PR-only workflow cannot supply main-commit checks. Keep PR review/required checks
enforced on GitHub. Pages and Render deploy independently; wait for both hosts
to finish before testing new frontend/API features together.

See [Render monorepo configuration](https://render.com/docs/monorepo-support)
and [deploy triggers](https://render.com/docs/deploys).

## 3. Set the API environment

Use the service's **Environment** page:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Atlas connection string, including the explicit shared demo database name |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `CLIENT_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://utsav-gowda.github.io` |
| `DEMO_EMPLOYEE_MODE` | `true` only for the dedicated sprint demo database; otherwise `false` |

Use the actual Atlas database credentials in Render's secret configuration. Do
not put them in client files, Git, chat, or frontend environment variables.
Render supplies `PORT`; the API binds to `0.0.0.0` on that port. You do not need
another MongoDB database service on Render or a persistent disk for Atlas data.
The deployment commands do not run the destructive seed script.

Demo mode allows anyone reaching the API to select the demo employee role. It
is explicitly a proof of concept rather than authentication. Disable it before
using the API for actual employee permissions and integrate US6 first.

## 4. Allow Render through Atlas networking

When setting up or updating Atlas network access, open the service's **Connect → Outbound** tab and copy **all** its outbound
IP ranges. Add those ranges to the Atlas project's IP access list. Whitelisting
your laptop's IP does not allow Render to connect. Then deploy/redeploy and wait
for Render to mark the service live.

Open the actual service URL plus `/api/health`. Expect HTTP 200 with
`"status": "ok"` and `"database": "connected"`. `/api/auth/demo` should report
the intended demo flag once the US7 code is deployed. `/api/equipment` should
return the shared catalog. Keep task #32 open until the new deployment's
capability and registration flow are also verified.

References: [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses),
[environment variables](https://render.com/docs/configure-environment-variables).

## 5. Point each local frontend at the API

From the repository root, run:

```bash
npm ci --prefix client
API_PROXY_TARGET=https://rec-center-radar-api.onrender.com npm run dev --prefix client
```

Do not append `/api` to the Render origin.
Alternatively, copy `client/.env.example` to ignored `client/.env.local` if that
file does not already exist, set `API_PROXY_TARGET` there, and run the usual
`npm run dev --prefix client`. Restart Vite after changing the target.

The proxy works in both Vite development and `npm run preview` when
`VITE_API_BASE_URL` is empty. This server-side Vite setting is not embedded in
React, and it is not a place for MongoDB secrets. The GitHub Pages build instead
uses `VITE_API_BASE_URL` to call Render directly. See [Pages setup](github-pages.md)
for the one-time GitHub settings and Render browser-origin configuration.

Frontend-only developers need no local API, Atlas credentials, or personal IP
allowlisting. Backend developers can target `http://localhost:5000` instead.

To run the Render-backed frontend alongside an existing frontend on port 5173:

```bash
API_PROXY_TARGET=https://rec-center-radar-api.onrender.com npm run dev --prefix client -- --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5174`. Search works on the current live API. Until the US7
PR is deployed, the role toggle is unavailable and the new map panel reports
that its data cannot be loaded. Continue testing those new features against the
local API in the meantime.

## 6. Verify sharing

On machine A, select the demo employee role and register a uniquely named
machine. On machine B, search for that name or use the refresh buttons. Confirm
that its name, category, floor, room, and map position match. This checks shared
API/database configuration rather than relying on a browser's local state.

Render Free services sleep after idle periods and can take around a minute to
resume. Cold-start requests will not meet the 1.5-second search target; use an
always-on paid instance if that target must hold consistently.
[Render Free behavior](https://render.com/docs/free#spinning-down-on-idle).
