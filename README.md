# Rec-Center Radar

**Team:** Gooogle

## Team Members

| Name | GitHub Username |
|------|-----------------|
| Utsav Gowda | [@Utsav-Gowda] |
| Joshua Sakolsky-Madaras | [@JSakMad] |
| Brian Simon | [@Br1anSimon] |
| Ishay Wirthiem | [@IshayWir] |
| Devin Gilson | [@dggilson] |

## Project Purpose

Rec-Center Radar is a zero-install web app that helps Pitt students and staff find gym equipment in the Pitt Rec Center. Users can search for a machine, see its floor and location on a map, and check whether it is mechanically operational, while gym employees keep the catalog and machine status up to date.

## Technology Stack

Rec-Center Radar is built on the **MERN** stack: MongoDB, Express, React, and Node.js. It runs in any modern browser with nothing to install, which meets our zero-install constraint.

| Layer | Technology | Version (from `package.json`) |
|-------|------------|-------------------------------|
| Frontend (UI) | React + Vite | React 18.3, Vite 5.4 |
| Backend (router) | Node.js + Express | Express 5.3 |
| Storage | MongoDB Atlas + Mongoose | Mongoose 9.12 |
| Configuration | dotenv | dotenv 18.0 |

### Design Justifications

- **One language end to end.** React, Express, and Node.js all use JavaScript. Every team member can work on any subsystem without switching languages, and the JSON our API returns matches the objects the client renders.
- **MongoDB instead of PostgreSQL.** Our original plan named PostgreSQL. We switched to MongoDB because our data is document shaped. A floor owns its rooms, so rooms are embedded inside each `Floor` document (the composition in our analysis object model) rather than living in a separate joined table. Equipment records also vary by machine, for example the list of muscle groups, and a flexible schema handles that cleanly.
- **MongoDB Atlas (cloud, free tier).** Nobody has to install or run a database locally. Every teammate connects to the same shared cluster using a connection string in their own `.env` file.
- **Mongoose.** MongoDB is schema-less, so Mongoose adds the validation we need: required fields, allowed status values (`Operational`, `Under Maintenance`, `Out of Order`), and a check that a machine's room actually belongs to its floor. US1 searches name, workout type, and muscle groups using escaped, case-insensitive substring matching. The schema also defines a text index for future word-based search.
- **Express.** A small, widely used REST framework. Each subsystem gets its own router file (equipment, authentication, reports, announcements), so the code layout matches our subsystem decomposition and teammates can work in parallel with few merge conflicts.
- **React.** Component based: `PittCommunityMemberUI` groups the Equipment Portal and Report Portal, while `GymEmployeeUI` is a sibling folder for employee workflows. A responsive layout lets the same app work on phones at the gym and on desktops.
- **Vite.** Fast dev server with hot reload. Its dev proxy forwards `/api` requests to the Express server on port 5000, so the browser sees a single origin and we do not need CORS setup during development.
- **Separate history collections.** Current machine status is stored on the `Equipment` document for fast reads. Every change is also written to `StatusUpdate` or `Relocation`, so we keep a full audit history without slowing down the main search.

## Subsystem-to-Folder Mapping

| Subsystem | Layer | Folder / File | Responsibility |
|-----------|-------|---------------|----------------|
| Pitt Community Member UI | UI | `client/src/components/PittCommunityMemberUI/` | Groups the community member equipment and reporting workflows |
| Equipment Portal | UI | `client/src/components/PittCommunityMemberUI/EquipmentPortal/` | Search, browse, and view equipment status and location |
| Gym Employee UI | UI | `client/src/components/GymEmployeeUI/` | Employees register equipment and update status and location |
| Report Portal | UI | `client/src/components/PittCommunityMemberUI/ReportPortal/` | Users report broken or missing equipment (placeholder) |
| Server entry point | Router | `server/server.js` | Loads `.env`, connects to the database, mounts subsystem routers, starts Express |
| Equipment router | Router | `server/src/routes/equipmentRoutes.js` | Equipment search, details, status, and relocation endpoints |
| Authentication router | Router | `server/src/routes/authRoutes.js` | Sign-in and roles (Pitt Passport SSO) |
| Report router | Router | `server/src/routes/reportRoutes.js` | Equipment problem reports |
| Announcement router | Router | `server/src/routes/announcementRoutes.js` | Gym announcements |
| Database connection | Storage | `server/src/config/db.js` | Connects to MongoDB Atlas using `MONGODB_URI` |
| Data models | Storage | `server/src/models/` | Mongoose schemas: `Floor` (with embedded rooms), `Equipment`, `StatusUpdate`, `Relocation`, and shared `constants.js` |

The client folders mirror the UI decomposition:

```text
client/src/components/
├── PittCommunityMemberUI/
│   ├── EquipmentPortal/
│   │   ├── EquipmentPortal.jsx
│   │   ├── EquipmentList.jsx
│   │   └── StatusBadge.jsx
│   └── ReportPortal/       # placeholder
└── GymEmployeeUI/          # placeholder
```

`App.jsx` renders the Equipment Portal. Its internal imports remain relative to
the portal folder.

### API routes

The server configuration from [issue #16](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/16)
is merged. Start `server/server.js` using `npm start`; the older `server/src/index.js`
does not mount the API routers.

| Path | Current behavior |
|------|------------------|
| `GET /api/health` | Reports API and database status |
| `GET /api/equipment` | Lists equipment with resolved floor and room names |
| `GET /api/equipment?q=Biceps` | Searches names, workout types, and muscle groups (US1) |
| `/api/reports` | Mounted placeholder returning HTTP 501 |
| `/api/announcements` | Mounted placeholder returning HTTP 501 |
| `/api/auth` | Mounted placeholder returning HTTP 501 |

### Equipment search (US1)

Type a machine name, workout type, or muscle group into **Search equipment**.
For example, try `Squat Rack`, `Strength Training`, or `Biceps`. Matching is
case-insensitive and accepts partial text. Each card shows the machine name,
category, assigned floor, workout type, and mechanical condition. An unmatched
search suggests checking spelling or changing terms. **Clear search** restores
the catalog, and failed requests provide **Retry search**.

See [US1 implementation and verification](docs/equipment-search.md) for the API
contract, test commands, and the limits of the 1.5-second performance check.

## Prerequisites

| Tool | Required version | Why |
|------|------------------|-----|
| [Node.js](https://nodejs.org/) | **20.19.0 or newer** (Node 22 LTS recommended) | Mongoose 9 and its MongoDB driver require Node `>=20.19.0` |
| npm | **10.x or newer** (bundled with Node 20.19+) | Our `package-lock.json` files use lockfile v3 |
| Git | Any recent version | Clone the repository |
| MongoDB Atlas account | Free tier | Each developer needs the shared cluster's connection string and their IP on the Atlas access list |
| Web browser | Any modern browser (Chrome, Firefox, Safari, Edge) | Runs the client |

Check your versions:

```bash
node -v   # should print v20.19.0 or higher
npm -v    # should print 10.x or higher
```

> **Note:** Node 18 is **not** enough. Mongoose 9.12 refuses to install cleanly on Node versions below 20.19.0.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Utsav-Gowda/Rec-Center-Radar.git
cd Rec-Center-Radar
```

### 2. Set up the server

```bash
cd server
npm install
```

Create your environment file from the template:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `server/.env` and fill in:

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `MONGODB_URI` | Yes | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rec-center-radar` | Get this from a teammate or from Atlas: **Connect → Drivers** |
| `PORT` | No | `5000` | Defaults to `5000`. Keep it at 5000, because the client proxy expects it |

In MongoDB Atlas, go to **Network Access** and add your current IP address. If your IP is not on the list, the server times out after 10 seconds.

> `.env` is in `.gitignore`. Never commit your connection string.

### 3. Start the server

Run this from inside the `server/` folder so `dotenv` finds your `.env` file:

```bash
npm start
```

If it worked, you will see:

```
MongoDB Atlas connected: <host> / database "<name>"
Rec Center Radar API listening on port 5000
```

If you see `MONGODB_URI is not set`, your `.env` file is missing or you started the server from the wrong folder.

### 4. Set up and start the client

Open a **second terminal** (leave the server running) and, from the repository root, run:

```bash
cd client
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser. Vite forwards any request to `/api` to the server at `http://localhost:5000`.

### Command reference

| Where | Command | What it does |
|-------|---------|--------------|
| `server/` | `npm install` | Install server dependencies |
| `server/` | `npm start` | Start the API server with its mounted routers on port 5000 |
| `server/` | `npm run seed` | Replace floor/equipment data in a dedicated development database with sample data |
| `server/` | `npm test` | Test the API against disposable local MongoDB |
| `client/` | `npm install` | Install client dependencies |
| `client/` | `npm run dev` | Start the Vite dev server on port 5173 |
| `client/` | `npm run build` | Build the production bundle into `client/dist/` |
| `client/` | `npm run preview` | Preview the production build locally |
| `client/` | `npm test` | Test search UI behavior |
| `client/` | `npm run test:integration` | Test React input through real HTTP/MongoDB back to rendered results (install both packages first) |

## Project Status

### What works so far

- **MongoDB Atlas connection:** The server connects to the shared Atlas cluster and fails with a clear error if `MONGODB_URI` is missing or the cluster cannot be reached.
- **Data models (storage subsystem):** Mongoose schemas for `Floor` (with embedded rooms), `Equipment`, `StatusUpdate`, and `Relocation`. They include validation (allowed statuses, room must belong to its floor, unique room names per floor) and indexes for text search and filtering.
- **Express server:** Starts, parses JSON, exposes health/equipment endpoints, and mounts subsystem routers.
- **Subsystem folder structure:** Folders and router files exist for every subsystem, so teammates can work in parallel.
- **Equipment search (US1):** Search by name, workout type, or muscle group, with name/category/floor results, spelling guidance for no matches, loading feedback, and retry on errors.
- **React client:** The Equipment Portal renders equipment cards with status badges and a responsive layout. It builds successfully with Vite.
- **Seed data:** `server/src/data/seedEquipment.js` supplies sample floors and machines. `npm run seed` replaces the configured database's Floor and Equipment collections; use a dedicated development database.
- **Search tests:** API, UI, and combined React/HTTP/MongoDB tests are available through the commands above. Tests use disposable databases and do not seed Atlas.
- **Diagram draft:** The existing deployment diagram is in `docs/`. Final deployment and component diagrams and the editable `.drawio` source will be added separately; see [diagram documentation](docs/README.md).

### What does not work yet

- **Remaining subsystem APIs:** Authentication, reports, and announcements are mounted placeholders returning HTTP 501. Equipment search and the health endpoint are implemented.
- **Pitt Passport SSO:** Not connected. We still do not know whether we can get access as students or will need to simulate login during development. Until then, employee actions store a Pitt ID string as a placeholder because there is no `User` model.
- **WebSockets / live status updates:** Not implemented. Users have to refresh to see status changes.
- **Gym Employee UI and Report Portal:** Only placeholder folders so far (planned for Sprint 5).
- **Floor map:** The data model stores floor plans and marker positions, but the map view is not built yet.
- **Hosting:** Not deployed yet. We plan to host the client on Vercel and the server on Render.

## Repository Contents

- `user-stories.md`: A list of the relevant user stories and epics for the Rec-Center Radar
- `client/`: React frontend (UI subsystems)
- `server/`: Express backend (router and storage subsystems)
- `docs/`: Project documentation and diagrams

## GenAI Use

All team members—Utsav Gowda, Joshua Sakolsky-Madaras, Brian Simon, Ishay
Wirthiem, and Devin Gilson—used GenAI for boilerplate code and checking work.
