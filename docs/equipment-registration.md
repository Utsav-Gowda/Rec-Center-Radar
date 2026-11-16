# US7: Register equipment

Issue: [#9](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/9).
Branch: `feature/equipment-registration`. Related work:
[US2 map foundation (#3)](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/3),
[Render setup (#32)](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/32),
[Pages hosting (#33)](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/33),
and the unnamed-floor label follow-up from PR #29.

## Implementation

- `GET /api/auth/demo` exposes the boolean capability flag. The UI defaults to
  the community member role; when enabled, a checkbox lets the user demonstrate
  the employee role and reveal registration controls.
- `POST /api/equipment` requires both `DEMO_EMPLOYEE_MODE=true` on the server and
  `X-Demo-Role: employee` on the request. Disabled mode or another role returns 403.
- The API validates name, category, workout type, floor, assigned room, and X/Y
  position. Muscle groups are optional. Name/category/workout type have maximum
  lengths of 120/80/100 characters; muscle groups are limited to 12 entries of
  64 characters each. It rejects malformed IDs and verifies that the room belongs
  to the selected floor through the existing Mongoose validation hook.
- The form takes percentages from the left/top; the API stores normalized X/Y
  fractions between 0 and 1. Missing or invalid fields return HTTP 400 with an
  `errors` object keyed by field, and the UI displays those messages.
- The server sets `registeredBy` to `demo-employee`; Mongoose sets `createdAt`.
  Caller-supplied employee IDs, timestamps, and status values are not accepted.
  A valid registration returns HTTP 201 and the saved equipment, including its
  resolved floor, room, and coordinates.
- Successful registration refreshes the current search and map, selects the
  saved floor, and highlights the new equipment marker. Separate clients see
  the same persisted record when they refresh or perform another search.
- Unnamed floors display `Floor 2`, including `Floor 0`, instead of a bare number.

## Demo permissions and remaining authentication work

The role switch intentionally demonstrates permissions without implementing
Pitt Passport. It does not prove who the caller is: anyone who can reach an API
with demo mode enabled can select the employee role. Use a dedicated demo
database, keep `DEMO_EMPLOYEE_MODE=false` by default, and do not treat this as
completion of US6 or as authorization for real employee operations. US6 should
replace `requireDemoEmployee` with middleware deriving the verified employee
identity from its authentication system.

## Initial map view: US2 must build on this

`FloorMap.jsx` is the minimal placement view needed to demonstrate US7. It lists
floors, displays equipment markers at saved coordinates, supports marker/legend
selection, and shows the selected machine's category and room. It uses a floor's
`floorPlanUrl` when that image loads. Without a usable image, it explicitly
labels the grid as a coordinate preview rather than an accurate floor layout.
The seed floor-plan paths do not currently have matching images in this repo.

**The majority of US2 remains future work:** supply accurate floor-plan assets,
implement the full location/navigation experience from its acceptance criteria,
improve selection and overlapping markers, and decide how map placement should
be chosen visually. This PR does not close issue #3. Public API responses retain
`floorPlanUrl`, `room`, and `mapPosition` so US2 can build on the same data.

## Local demo instructions

Run these from the repository root after confirming `server/.env` points to the
intended development/demo database:

```bash
npm ci --prefix server
npm ci --prefix client
DEMO_EMPLOYEE_MODE=true npm start --prefix server
```

In a second terminal:

```bash
API_PROXY_TARGET=http://localhost:5000 npm run dev --prefix client
```

If port 5000 is occupied, use `PORT=5001 DEMO_EMPLOYEE_MODE=true npm start
--prefix server` in the first terminal and target `http://localhost:5001` in the
second. The command-line flag avoids editing the existing `.env` file.

Open `http://localhost:5173`:

1. Verify registration is hidden in the community member view.
2. Select **View as gym employee (demo)**.
3. Submit the blank form and verify missing name/category/floor/location errors.
4. Fill all required fields, choose an existing floor and room, and enter X/Y
   percentages such as 25 and 50. Set muscle groups if the machine should match
   searches for them.
5. Register the machine. Check its success message, search result, selected
   map floor, and highlighted marker. Search for its name to confirm retrieval.
6. Toggle back to community member and confirm registration controls disappear.

If no floors exist, the form explains that location data is needed. The seed
command can populate a dedicated empty demo database, but it **replaces all Floor
and Equipment records** in the configured database. Do not run it against data
the team needs to keep.

## Automated verification

```bash
npm test --prefix server
npm test --prefix client
npm run test:integration --prefix client
npm run build --prefix client
```

Tests use disposable local MongoDB, never the shared Atlas database. Coverage
includes rejected demo writes, required fields, floor/room validation, persisted
coordinates and server audit fields, floor labels, proxy configuration, and a
combined UI → direct HTTP API → MongoDB → refreshed search/map flow. Pages API
URLs, repository-relative floor-plan paths, and browser CORS preflight are also
covered. See [Pages setup](github-pages.md) for deployment checks. The combined test
also verifies a second HTTP client sees the saved record. DOM tests do not
verify browser paint timing or production/Atlas latency.
