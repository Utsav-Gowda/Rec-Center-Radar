# Deliverable 4 diagrams

The repository currently contains an earlier deployment draft:

- [deployment-diagram.png](deployment-diagram.png)
- [deployment-diagram.svg](deployment-diagram.svg)
- [deployment.dot](deployment.dot), the Graphviz source for that draft

The draft predates the client folder reorganization. It also labels Node.js as
18+ and some router stubs as returning HTTP 501; the current server requires
Node.js 20.19+ and the router files are empty and unmounted. Use the repository
code and [README](../README.md) for current implementation status.

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

Router integration is tracked in
[issue #16](https://github.com/Utsav-Gowda/Rec-Center-Radar/issues/16).
Its branch currently contains no router implementation to merge. Confirm the
mount paths against the final component diagram when that work is integrated.
The client currently expects `GET /api/health` and `GET /api/equipment`.

If retaining the draft's `.svg` and `.dot` files after replacing the PNG, update
them to match the final diagram so the repository does not show conflicting
architectures.
