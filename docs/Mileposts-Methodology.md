# The Mileposts Methodology

**Mileposts** is a simple software methodology for working together on an software project.

The goal is to make it _simple, safe, and yet fast_ to dive in to a project and stay up-to-date with its progress.

## Introducing: The Milepost

Mileposts are similar to _[milestones](https://guides.github.com/features/issues/#filtering)_, except not as heavy and not (necessarily) bound to any specific release of the software.

Mileposts are a special type of issue in the Issues tracker.

### Purpose of a Milepost

The purpose of a milepost is to make it easy for new collaborators, and the project lead, to figure out what's going on.

Therefore, mileposts ask the _milepost lead_ to take on certain _energy expenditures_ in explaining _what's going on._ This saves energy overall because it means that energy does not need to be expended by _every potential new contributor._

### _Mileposts_ vs _Milestones_

- A milepost (MP) is _assigned-to_ and _managed-by_ a specific person: the milepost lead.
- Both milestones and mileposts aggregate _other issues_ together.
- Mileposts can contain issues that are assigned to a milestone, but a milepost does not need to be assigned to a milestone.
- Mileposts describe a specific _subarea_ of the project that has been claimed by the milepost lead (and those who may be helping them work on that subarea).

### The Milepost "Spec"

A milepost is an issue that has this format:

- **MUST** have a tag that is one of: `Milepost` or `milepost` or `MILEPOST`.
  - The tag's color **SHOULD** stand out from other tags (black or white are good choices).
- **MUST** use a title that represents the subarea being worked on.
- **MUST** be assigned to the milepost lead.
- **MUST** state the branch that's tracking the _latest progress_ for the milepost.
- **MUST** contain a description of the subarea that's being worked on.
- **SHOULD** state the (user)names of any other collaborators who are (or might) be working on this milepost.
- **MUST** contain a list of files that might be modified, created, or deleted.
  - **IF** a milepost shares files with another milepost, then that **MUST** be _clearly and explicitely_ stated (e.g. `(shared with MP #30)`).
- **MUST** have a list of issues (with checkboxes) that are being worked on as part of this milepost.
  - Each issue in the list **SHOULD** have a brief description (can just be the issue's title).
  - **IF** a milepost shares an issue with another milepost, then that **MUST** be _clearly and explicitely_ stated (e.g. `(shared with MP #30)`).
- **SHOULD** contain a roadmap describing what the plan is to close the milepost.
- **MAY** be assigned to a milestone.

Mileposts **SHOULD** contain comments of the following nature:

- Regular or semi-regular updates on the current status/progress of the Milepost.
- Contain information about who is working on what part of the milepost.
- Questions & answers from other existing or potential contributors about the nature/status of the milepost.

## Example Milepost

### User Login mechanism

Assigned: **@taoeffect** _(doesn't need to be explicitely written if the UI supports it)_

Branch: **userlogin**

#### Description

All of the tasks necessary to make it possible for a user to log in to the site and log out of the site. This includes modifications to the user interface, so that means we may need **@dan** to make some new markup for us. It also requires some modifications to the backend so **@rachel**'s help will be needed.

#### Files

- Create `src/backend/login.js`
- Modify `src/frontend/login.html`
- Create `src/frontend/js/login.js`
- Need to create new login/logout icons and place them in `src/frontend/assets/`

#### Issues

- [ ] #29 - Backend database user schema & API
- [ ] #17 - Add session info to database **(shared with MP #50)**
- [ ] #30 - Clear cookies on logout
- [ ] #28 - Frontend JS for AJAX login/logout
- [ ] #45 - Markup for login interface
- [ ] #44 - Create backend unit tests for login/logout
- [ ] #45 - Create frontend unit tests for login/logout

------------

### Comments

**Comment 1 by @taoeffect**

> So @rachel's working on #29 and making good progress on it. I've almost got the frontend js working, see the latest updates I posted in #28.
>
> Once I get #28 closed I plan to work with @dan on integrating the markup (#45) with the JS in #28.
