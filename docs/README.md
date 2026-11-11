# Deliverable 4 diagrams

The repository currently contains an earlier deployment draft:

- [deployment-diagram.png](deployment-diagram.png)
- [deployment-diagram.svg](deployment-diagram.svg)
- [deployment.dot](deployment.dot), the Graphviz source for that draft

The draft predates the client folder reorganization. It also labels Node.js as
18+; the current server requires Node.js 20.19+. Health and equipment search
endpoints are implemented, and the authentication, report, and announcement
routers are mounted placeholders returning HTTP 501. Use the repository code
and [README](../README.md) for current implementation status.

## Final diagram files to add

The team will supply the original diagrams separately:

| File | Purpose | Status |
|------|---------|--------|
| `deployment-diagram.png` | Final deployment diagram export, replacing the draft | Pending |
| `component-diagram.png` | Final component diagram export | Pending |
| `architecture.drawio` | Suggested filename for the editable diagrams.net source; include both diagrams as pages, or supply separately named `.drawio` files | Pending |

When adding the diagrams, show `EquipmentPortal` and `ReportPortal` inside
`PittCommunityMemberUI`, with `GymEmployeeUI` alongside it. Reflect MongoDB Atlas
and Mongoose rather than PostgreSQL, and distinguish implemented components
from planned functionality such as Pitt Passport, hosting, and router mounts.

Router integration from
[issue #16](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/16) is merged.
The server mounts `/api/equipment`, `/api/reports`, `/api/announcements`, and
`/api/auth`, plus `GET /api/health`. Equipment search adds the optional `q`
parameter to `GET /api/equipment`; see [US1 documentation](equipment-search.md).
Use these paths in the final component diagram.

If retaining the draft's `.svg` and `.dot` files after replacing the PNG, update
them to match the final diagram so the repository does not show conflicting
architectures.
