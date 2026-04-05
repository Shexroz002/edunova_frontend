Update the existing "Create New Session" card in the Teacher Dashboard to support a dynamic live session creation flow.

IMPORTANT RULES

A Teacher Dashboard already exists in this Figma project.

Follow the existing UI/UX design system.

Do NOT redesign the sidebar, layout, spacing, or typography.

Reuse existing components such as cards, buttons, dropdowns, badges, icons, and tables.

The UI must support both themes already implemented in the dashboard:

Light Theme
Dark Theme

---

RESPONSIVE REQUIREMENTS

The interface must be fully responsive.

Desktop:
Use centered card layout with multi-step wizard.

Tablet:
Reduce spacing and use two-column layouts where possible.

Mobile:
Stack all inputs vertically with large touch-friendly controls.

The design must adapt smoothly for:

Desktop
Tablet
Mobile

---

STEP 1 — SELECT QUIZ

Update the first row of the card.

Instead of static text, use a dropdown selector.

Label:
Select Quiz

Component:
Searchable dropdown

Example values:

Mathematics Practice Test
Physics Basics Quiz
Chemistry Midterm

Show metadata below the quiz title:

Subject
Number of questions

---

STEP 2 — SELECT CLASS OR GROUP

Update the second row.

Component:
Multi-select dropdown

Label:
Choose class or group

Example values:

9-A
10-B
Physics Preparation
Math Intensive

Display selected classes as tags.

---

STEP 3 — SET SESSION SETTINGS

Add additional inputs below.

Fields:

Session Duration
Dropdown

Example values:

10 minutes
20 minutes
30 minutes
60 minutes

Maximum Participants
Number input

---

CREATE SESSION BUTTON

Primary button:

Create Session

Clicking this button should transition to the Waiting Room page.

---

WAITING ROOM PAGE

Create a new page titled:

Session Waiting Room

Purpose:
Allow teachers to monitor students joining before starting the quiz.

---

WAITING ROOM HEADER

Display session information:

Quiz name
Join code
Number of joined students

Example:

Mathematics Practice Test
Join Code: A7K92D
Joined: 12 students

---

SECTION — JOINED STUDENTS

Create a card titled:

Students in Waiting Room

Display a table or list.

Columns:

Student Name
Status

---

STATUS BADGES

Ready → green
Preparing → yellow
Disconnected → red

Example rows:

Ali — Ready
Sardor — Preparing
Dilshod — Ready

---

SECTION — SESSION CONTROLS

Buttons:

Start Session (primary)

Cancel Session (secondary)

---

CARD DESIGN

Use modern SaaS dashboard UI.

Cards must include:

Rounded corners (16px radius)
Soft shadows
Clear spacing between sections

---

THEME SUPPORT

The UI must adapt automatically to both themes already defined in the dashboard.

---

Ensure the flow integrates visually with the existing Teacher Dashboard and maintains consistent UI/UX patterns across both themes and all responsive breakpoints.