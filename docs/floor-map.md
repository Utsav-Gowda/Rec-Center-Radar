# US2: View equipment location on floor map

Issue: [#3](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/3), under
[E1](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/1). Branch:
`feature/us2-floor-map`. Builds on the map foundation added with US7.

## What a user sees

1. Search for a machine (US1) and choose **Show on map** on its result card.
2. The **Floor map** switches to that machine's floor, outlines the machine's
   footprint in magenta with a pulsing border and a name tag, and dims the other
   machines. The page scrolls to the map.
3. A line above the map repeats the name, category, floor, room, and condition.
4. **Zoom in** (200% / 300%) enlarges the plan for phones; the map scrolls
   sideways and centres on the selected machine. At 100% the whole floor fits
   the screen, so nothing is clipped.
5. Tapping any machine on the map, or a name under **All equipment on this
   floor**, moves the outline. Changing floors clears it.

Machines with a saved position but no footprint (for example ones registered
through US7) still show as a numbered round marker and highlight the same way.

## Data

- `Equipment.mapPosition` (existing) is the machine's centre, as fractions of the
  floor-plan image.
- `Equipment.mapSize` `{ width, height }` (new, optional) is the footprint, also
  as fractions, so the outline scales with any screen size.
- `Equipment.mapLabel` (new, optional, max 40 characters) is the short text drawn
  inside the outline, e.g. `Hack Squat`.

Both new fields are optional: registration (US7), status updates (US5), and
search (US1) are unchanged, and the API returns the new fields with the rest of
each equipment document.

## Floor 4 layout

`server/src/data/seedFloor4.js` holds the real 4th floor of the Rec Center: 78
machines (treadmills, StairMasters, the cable rig, plate-loaded and selectorized
machines, benches, the Hail to Pitt rack platforms, Smith machines, dumbbells)
with category, workout type, muscle groups, centre, footprint, and label. The
layout was traced from a hand-drawn floor sketch and checked against photos of
the floor. `client/public/floorplans/floor-4.svg` draws the walls, island
counters, cable-rig frame and monkey bars, the Hail to Pitt frame, plate trees,
trash cans, and the open view to the 3rd floor; machines are drawn on top from
the database.

All Floor 4 equipment is placed in the room **Fitness Zone 402** (the name Pitt
uses for a 4th-floor fitness zone). Pitt's other 4th-floor rooms (Cycling Studio,
Momentum Studio 413, Climbing Wall) are added as rooms without equipment.

Floor 4 is kept out of `seedEquipment.js` on purpose, so the US1 search tests and
the integration test keep their fixed 8-item catalog.

## Loading the data

- **Shared database (safe):** `npm run seed:floor4` from `server/`. It creates or
  updates Floor 4 only, keeps existing room IDs, replaces only Floor 4 equipment
  it created itself (`registeredBy: 'seed'`), and leaves everything else,
  including employee-registered machines, untouched. It can be re-run.
- **Fresh development database:** `npm run seed` now loads the sample floors plus
  Floor 4. As before, it **replaces all Floor and Equipment records**.

## Verification

```bash
npm test --prefix server
npm test --prefix client
npm run test:integration --prefix client
npm run build --prefix client
```

- `server/test/floor-map.test.js`: Floor 4 data is valid (unique names, real
  rooms, footprints inside the plan), no two outlines overlap, the SVG ships with
  the client, `seed:floor4` is repeatable and leaves staff data alone, and the API
  returns floor plan, position, footprint, and label.
- `FloorMap.test.jsx`: a selected result opens its own floor and outlines its
  footprint within 2 seconds; selection moves and clears; zoom levels; a machine
  with no position explains why it is not shown.
- `App.test.jsx`: clicking **Show on map** on a Floor 4 result switches the map
  from Floor 2 to Floor 4 and outlines the machine.
- Manual: checked in a 375 × 812 mobile viewport and on desktop against a local
  API seeded with Floor 4. The 2-second check in jsdom does not measure real
  phone paint time; the floor plan is a 6.5 KB SVG and needs no extra requests.

## Limits

- Floors 1 and 2 in the sample data still have no floor-plan image and show the
  labelled coordinate preview.
- Machine positions come from a sketch, not a surveyed CAD drawing. Use US8
  (relocation) or re-run `seed:floor4` after editing `seedFloor4.js` when the
  floor changes.
