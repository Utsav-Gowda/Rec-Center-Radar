# US1: Equipment search

Implements [issue #2](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/2)
(FR1, FR11) on `feature/equipment-search`. The intended PR targets `main` and
should include `Closes #2` once the implementation is reviewed and accepted.

## Behavior and API

The Equipment Portal accepts names, workout types, and muscle groups in a
labeled search field. After 200 ms without another input change, it calls
`GET /api/equipment?q=<encoded text>`. The API trims leading/trailing whitespace
and performs case-insensitive substring matching against `name`, `workoutType`,
and each entry in `muscleGroups`. A phrase must occur within one of those fields;
it is not split into unrelated keywords. Regex punctuation is treated as literal
text. Categories are displayed but are not a search field for US1.

- Omitted, empty, or whitespace-only `q`: return the full catalog.
- A single text `q` of at most 100 characters: return matching equipment sorted
  by name, with the ID breaking ties.
- Repeated `q` values, a query over 100 characters, or a null character: HTTP 400.
- No match: HTTP 200 with `{ "count": 0, "data": [] }`.

The response keeps the existing `{ count, data }` envelope. Each item includes
its name and category, with `floor` resolved to `{ _id, floorNumber, name }` (or
`null` if the referenced floor is missing). Cards show the assigned floor name,
falling back to its number or "Not assigned" for incomplete data.

The UI hides results from an earlier query while loading, aborts obsolete
requests, and ignores late responses. Result counts and empty states are
announced through a live status region. No matches prompts the user to check
spelling or change terms; an API failure instead shows an error and retry button.
Clearing the field restores the full catalog.

## Run and verify

From the repository root, install both packages:

```bash
npm ci --prefix server
npm ci --prefix client
```

Run each check from the repository root:

```bash
npm test --prefix server
npm test --prefix client
npm run test:integration --prefix client
npm run build --prefix client
```

The API tests use Node's test runner. Client tests use Vitest and Testing Library.
The combined suite renders the real React component in jsdom and forwards its
requests over real HTTP to the Express app backed by a disposable MongoDB
process. Both database suites explicitly use local test URIs and never seed the
shared Atlas database. The first run can download a MongoDB binary through
`mongodb-memory-server`; it requires network access and permission to bind a
local port. Optional `MONGOMS_DOWNLOAD_DIR` selects the binary cache directory.

For manual checking, run `npm start` in `server/` with a reachable database and
`npm run dev` in `client/`, then open `http://localhost:5173`. With the repository's
sample equipment:

| Input | Expected result |
|-------|-----------------|
| `Squat Rack` or `rack` | Squat Rack, Free Weights, Floor 2 - Strength |
| `Strength Training` | Five strength machines, with category and floor |
| `Biceps` | Cable Crossover Machine, Lat Pulldown, and Rowing Machine |
| `zzzzzz` | No-match message with spelling/search-term guidance |
| Clear search | All eight sample machines |

Use a dedicated database if loading the samples: `npm run seed` replaces all
Floor and Equipment documents in the configured database.

## Performance scope

The acceptance target is 1.5 seconds from the final input change to matching
results. The client spends 200 ms debouncing; the main equipment query has a
1,000 ms MongoDB execution limit. That limit does not include network latency,
connection waits, floor population, or browser rendering.

The API performance test uses a 1,009-item local catalog and reserves 200 ms of
the target for the debounce. The combined test measures actual input-to-DOM
time, including debounce, HTTP, MongoDB matching, floor population, and React
rendering, against the eight sample machines. It asserts each acceptance example
finishes within 1.5 seconds. jsdom verifies DOM behavior rather than browser
paint timing; these measurements do not establish Atlas or production latency.

Observed on November 11, 2026 with Node.js 24.19.0 and MongoDB 7.0.24:

| Search | API / 1,009 items | Input to DOM / eight sample items |
|--------|-------------------|----------------------------------|
| `Squat Rack` | 3.0 ms | 236.5 ms |
| `Strength Training` | 2.8 ms | 219.1 ms |
| `Biceps` | 2.7 ms | 218.9 ms |

The configured Atlas connection was unavailable during this verification, so
these results come from disposable local databases. Recheck on the team's Atlas
environment before claiming deployed performance.

Case-insensitive substring queries can scan the collection and do not use the
schema's text index. For a much larger catalog, remeasure on the target Atlas
deployment and consider a dedicated search index instead of assuming the local
timings will hold. See [MongoDB regex index behavior](https://www.mongodb.com/docs/manual/reference/operator/query/regex/#index-use).

## Integration fixes included

The client previously treated the response as an array and silently discarded
the server's `{ count, data }` results. It now reads `data` and rejects malformed
responses. The status line also reads the health endpoint's `status` property.
The equipment router registers `Floor` for Mongoose population. The report and
announcement placeholder routers use Express 5-compatible catch-all middleware,
and the malformed announcement export is corrected so the API can start.
