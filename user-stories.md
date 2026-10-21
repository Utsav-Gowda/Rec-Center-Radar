# E1: Finding Equipment and Condition Tracking
Pitt community members and gym employees can locate gym equipment and monitor or update its operational status.

## US1: Search equipment by name, workout type, or muscle group
As a Pitt community member, I want to search for gym equipment by machine name, workout style, or muscle group so that I can quickly find gear suited to my workout.
FR: FR1, FR11
Priority: Must
MVP: yes

- [ ] The search bar accepts text-inputs for equipment names (ex. "Squat Rack"), workout types (ex. "Strength Training"), and muscle groups (ex. "Biceps").
- [ ] Matching search results display the equipment name, the category, and the assigned floor within 1.5 seconds.
- [ ] When no equipment matches the query, the interface displays an empty state message telling the user to check spelling or change search terms.

## US2: View equipment location on floor map
As a Pitt community member, I want to view a selected machine outlined on the Rec Center's floor plan so that I can walk directly to it without going through each floor and searching.
FR: FR2, FR11
Priority: Must
MVP: yes

- [ ] Selecting an equipment item from search results opens the floor map that corresponds to that machine's assigned floor.
- [ ] A highlighted visual outline pinpoints the exact physical location of the machine on the floor.
- [ ] The map renders clearly within 2 seconds on mobile web browsers without any clipping or broken/bad scaling.

## US3: Filter equipment by floor, room, category, and availability
As a Pitt community member, I want to filter equipment listings by floor, room, category, and current availability so I can find available machines in my current workout area/floor.
FR: FR3, FR11
Priority: Should
MVP: yes

- [ ] Users can apply one or more filters at the same time: Facility Floor, Room, Equipment Category, and Current Availability.
- [ ] Active filter buttons are visible above the results list, and clicking a specific filter button removes that filter.
- [ ] A "Clear All" button resets all active filters and restores the full equipment catalog view.

## US4: View machine's working condition and verification of said status
As a Pitt community member, I want to see the verified working condition and inspection time of a machine so I can avoid walking to a broken or out-of-service machine.
FR: FR4, FR10
Priority: Must
MVP: yes

- [ ] Every equipment profile displays an unambiguous condition badge: "Available", "Under Maintenance", or "Broken".
- [ ] The view contains an explicit label stating that the status represents the mechanical working order as opposed to the real-time occupancy of the machine.
- [ ] For machines marked "Under Maintenance" or "Broken", the interface displays the date/time of the last gym employee verification and any optional gym employee notes.

## US5: Update equipment mechanical condition
As a gym employee, I want to update a machine's operational status and attach notes so that gym visitors have up-to-date information on a machine's mechanical working order.
FR: FR4, FR6, FR10
Priority: Must
MVP: yes

- [ ] Authorized gym employees can update a machine's status between "Available", "Under Maintenance", and "Broken".
- [ ] Gym employees can enter or edit an optional maintenance note when changing the status.
- [ ] Submitting a status change automatically records that gym employee's ID and timestamp in the database.
- [ ] Status updates are pushed out and reflect on the client side within 5 seconds of confirmation.

# E2: Facility Management and Communication
Pitt community members securely access the system and report problems, and gym employees keep the equipment catalog accurate and inform visitors about facility changes.

## US6: Sign in with Pitt credentials
As a Pitt community member, I want to sign in with my existing Pitt credentials so that I can use the system without creating a separate account.
FR: FR5
Priority: Must
MVP: yes

- [ ] Signing in sends the user to Pitt Passport, and no separate username or password is created for the system.
- [ ] A user with valid Pitt credentials is returned to the system signed in.
- [ ] A user who enters invalid credentials or cancels sign-in is not granted access and sees a message explaining that sign-in did not complete.
- [ ] Only accounts designated as gym employees can access employee features (updating status, registering, relocating, posting announcements); other signed-in users cannot see or use them.
- [ ] After signing out, the user must sign in again before accessing any feature that requires authentication.

## US7: Register new equipment
As a gym employee, I want to add newly obtained equipment to the catalog so that Pitt community members can find it as soon as it is on the floor.
FR: FR7, FR10
Priority: Should
MVP: yes

- [ ] A gym employee can create an equipment entry with a name, category, floor, and assigned location.
- [ ] An entry missing any of those four fields cannot be saved, and the employee is told which field is missing.
- [ ] A newly registered machine appears in search results (US1) and on the floor map (US2) after it is saved.
- [ ] The new entry is recorded with the employee's ID and the date and time it was added.

## US8: Relocate existing equipment
As a gym employee, I want to update a machine's floor and location when it is moved so that the map does not send visitors to the wrong place.
FR: FR8, FR10
Priority: Should
MVP: no

- [ ] A gym employee can change the assigned floor and location of an existing machine.
- [ ] After the change is saved, the machine's map marker appears at the new floor and location and no longer appears at the old one.
- [ ] The machine's previous floor and location, the employee's ID, and the date and time of the change are kept in the machine's change history.
- [ ] Relocating a machine does not change its maintenance status.

## US9: Report broken equipment
As a Pitt community member, I want to report a machine that is broken or not working so that staff find out about the problem sooner.
FR: FR9, FR10
Priority: Could
MVP: no

- [ ] A Pitt community member can submit a report for a specific machine that includes a short description of the problem.
- [ ] A report without a description cannot be submitted.
- [ ] After submitting, the user sees a confirmation that the report was sent to staff.
- [ ] Submitted reports are visible to gym employees along with the machine, the description, and the date and time submitted.
- [ ] Submitting a report does not change the machine's displayed status; only a gym employee can change it (US5).

## US10: Post facility announcements
As a gym employee, I want to post facility-wide announcements so that visitors know about floor closures or broken machines before they walk over.
FR: FR12
Priority: Could
MVP: no

- [ ] A gym employee can post an announcement with a title and a message.
- [ ] Posted announcements are visible to every signed-in Pitt community member.
- [ ] A gym employee can remove an announcement, after which it is no longer visible to users.
- [ ] Users who are not gym employees cannot post or remove announcements.

## US11: Save favorite equipment
As a Pitt community member, I want to mark machines as favorites so that I can quickly pull up the equipment in my regular routine without searching each time.
FR: FR1, FR5, FR10, FR13 
Priority: should
MVP: no

- [ ] A signed-in user can tap a “Favorite” button on any equipment profile, and tapping it again removes the favorite.
- [ ] A “My Favorites” list shows only that user’s favorited machines, each with its name, category, floor, and current condition badge.
- [ ] Selecting a machine from “My Favorites” opens its location on the floor map (US2)
- [ ] Favorites persists cross sign-outs and are visible only to the user who created them

## US12: View a machine’s maintenance history
As a gym employee, I want to view the past status changes of a machine so that I can tell whether it has a recurring problem and needs repair or replacement.
FR: FR4, FR6, FR10
Priority: could
MVP: no

- [ ] A gym employee can open a machine’s history, which lists each past status change with the old status, new status, note, employee ID, and date/time.
- [ ] The list is ordered from newest to oldest.
- [ ] Machines with no record changes show an empty state message instead of a blank list
- [ ] Users who are not gym employees cannot see the history
