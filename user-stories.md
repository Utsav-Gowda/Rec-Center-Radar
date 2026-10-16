# E1: Finding Equipment and Condition Tracking
Pitt students and staff can locate gym equipment and monitor or update its operational status.

## US1: Search equipment by name, workout type, or muscle group
As a Pitt student, I want to search for gym equipment by machine name, workout style, or muscle group so that I can quickly find gear suited to my workout.

FR: FR1, FR11
Priority: Must
MVP: yes

- [ ] The search bar accepts text-inputs for equipment names (ex. "Squat Rack"), workout types (ex. "Strength Training"), and muscle groups (ex. "Biceps").
- [ ] Matching search results display the equipment name, the category, and the assigned floor within 1.5 seconds.
- [ ] When no equipment matches the query, the interface displays an empty state message telling the user to check spelling or change search terms.

## US2: View equipment location on floor map
As a Pitt student, I want to view a selected machine outlined on the Rec Center's floor plan so that I can walk directly to it without going through each floor and searching.

FR: FR2, FR11
Priority: Must
MVP: yes

- [ ] Selecting an equipment item from search results opens the floor map that corresponds to that machine's assigned floor.
- [ ] A highlighted visual outline pinpoints the exact physical location of the machine on the floor.
- [ ] The map renders clearly within 2 seconds on mobile web browsers without any clipping or broken/bad scaling.

## US3: Filter equipment by floor, room, and category
As a Pitt student, I want to filter equipment listings by floor, room, and category so I can find available machines in my current workout area/floor.

FR: FR3, FR11
Priority: Should
MVP: yes

- [ ] Users can apply one or more filters at the same time: Facility Floor, Room, and Equipment Category.
- [ ] Active filter buttons are visible above the results list, and clicking a specific filter button removes that filter.
- [ ] A "Clear All" button resets all active filters and restores the full equipment catalog view.

## US4: View machine's working condition and verification of said status
As a Pitt student, I want to see the verified working condition and inspection time of a machine so I can avoid walking to a broken or out-of-service machine.

FR: FR4, FR10
Priority: Must
MVP: yes

- [ ] Every equipment profile displays an unambiguous condition badge: "Operational", "Under Maintenance", or "Out of Order".
- [ ] The view contains an explicit label stating that the status represents the mechanical working order as opposed to the real-time occupancy of the machine.
- [ ] For machines marked "Under Maintenance" or "Out of Order", the interface displays the date/time of the last staff verification and any optional staff notes.

## US5: Update equipment mechanical condition
As a Pitt Rec Center employee, I want to update a machine's operational status and attach notes so that gym visitors have up-to-date information on a machine's mechanical working order.

FR: FR4, FR6, FR10
Priority: Must
MVP: yes

- [ ] Authorized staff can update a machine's status between "Operational", "Under Maintenance", and "Out of Order".
- [ ] Staff can enter or edit an optional maintenance note when changing the status.
- [ ] Submitting a status change automatically records that staff member's ID and timestamp in the database.
- [ ] Status updates are pushed out and reflect on the client side within 5 seconds of confirmation.