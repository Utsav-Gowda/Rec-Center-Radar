# Rec-Center Radar

**Team:** Gooogle

## Team Members

| Name | GitHub Username |
|------|-----------------|
| Utsav Gowda | [@Utsav-Gowda] |
| Joshua Sakolsky-Madaras | [@JSakMad] |
| [Brian Simon] | [@username] |
| Ishay Wirthiem | [@IshayWir] |
| Devin Gilson | [@dggilson] |

## Project Purpose

Rec-Center Radar is a zero-install web app that helps Pitt students and staff find gym equipment in the Pitt Rec Center. Users can search for a machine, see its floor and location on a map, and check whether it is mechanically operational, while gym employees keep the catalog and machine status up to date.

## Planned Technology

We plan to build Rec-Center Radar as a mobile-friendly web application that runs in any browser without installation, as required by our constraints. The frontend would use React, the backend a Node.js (Express) REST API, and the data (equipment, locations, status logs, change history) would be stored in a PostgreSQL database. Pitt Passport would handle sign-in, and live status updates would be pushed to connected clients.

One thing we are unsure about is how to integrate with Pitt Passport single sign-on, since we do not know whether we can get access as students or will need to simulate login during development.

## Repository Contents

- `user-stories.md`: A list of the relevant user stories and epics for the Rec-Center Radar
