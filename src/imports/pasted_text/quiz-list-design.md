redesign a "Quiz List" page for the Teacher Dashboard of a Learning Management System.

IMPORTANT RULES

* This Figma file already contains an existing Teacher Dashboard layout.
* Follow the same UI/UX system already used in the project.
* Do NOT redesign the sidebar, top navigation, or dashboard structure.
* Reuse existing components such as cards, tables, buttons, icons, spacing, and typography.
* The page must support both existing themes in the project:
  Light Theme and Dark Theme.

---

RESPONSIVE REQUIREMENTS

The page must be fully responsive.

Desktop layout:
Use a table layout or card grid showing all quizzes with full information.

Tablet layout:
Reduce columns and allow horizontal scroll or simplified cards.

Mobile layout:
Convert table rows into stacked quiz cards.

The design must work smoothly for:

Desktop
Tablet
Mobile

---

PAGE HEADER

Page title:

Quizzes

Below the title place a control toolbar.

Toolbar components:

Search input field

Placeholder:
Search quizzes...

Filter dropdowns:

Filter 1:
Subject

Filter 2:
Quiz type

Options example:
Manual
PDF Imported
AI Generated

Filter 3:
Date created

---

PRIMARY ACTION BUTTON

Place a primary button on the right side:

Button text:
Create Quiz

Use the system primary color.

This button leads to the quiz creation flow.

---

MAIN CONTENT — QUIZ LIST

Display quizzes inside a card container.

Use a table layout for desktop.

Columns:

Quiz

Display:

Quiz title
Example:
Mathematics Test 1
Physics Basics
AI Generated Chemistry Quiz

Small metadata below title:

Subject
Number of questions

---

Questions Count

Example:

30 questions

---

Quiz Type

Badge examples:

Manual
PDF
AI Generated

---

Created Date

Example:

March 12
April 2

---

Attempts

Example:

48 attempts

---

Average Score

Example:

72%

Use colored indicators:

Green → above 75%
Yellow → 50–75%
Red → below 50%

---

ACTION COLUMN

Add icon buttons:

View Quiz

Edit Quiz

Analytics

---

ROW INTERACTION

Row hover state:
Slight highlight background.

Clicking "View Quiz" opens the Quiz Detail page.

---

CARD STYLE

Use modern SaaS dashboard UI style.

Cards must include:

Rounded corners
Soft shadows
Clear spacing

Typography hierarchy:

Quiz title → primary text
Metadata → secondary text

---

THEME SUPPORT

The page must adapt automatically to both themes already defined in the design system.

Light Theme palette example:


---

Ensure the page integrates visually with the existing Teacher Dashboard and maintains consistent UI/UX patterns across both themes and all responsive breakpoints.