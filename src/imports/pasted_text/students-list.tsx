Create a "Student List" page for a Teacher Dashboard in a Learning Management System (LMS).

Important rules:

* Follow the existing design system in the Figma file.
* Do NOT redesign the whole system.
* Match the existing UI components and layout style.
* The design must support both Light Theme and Dark Theme already present in the file.
* The page must be fully responsive for Desktop, Tablet, and Mobile screens.

---

PAGE PURPOSE

This page allows teachers to view and monitor all students quickly.

---

RESPONSIVE REQUIREMENTS

Desktop layout:
Use a full table layout with multiple columns.

Tablet layout:
Reduce table columns and allow horizontal scroll if needed.

Mobile layout:
Convert table rows into stacked cards showing the most important information.

---

TOP PAGE HEADER

Page title:
Students

Below the title place a control toolbar containing:

Search input
Placeholder text:
"Search students..."

Filter dropdowns:

Filter 1:
Class

Filter 2:
Performance level

Filter 3:
Activity status

On the right side place a primary action button:

Button label:
Add Student

Use the system primary color.

---

MAIN CONTENT — STUDENT TABLE

Create a large card containing the student table.

Columns:

Student

Display:
Avatar
Full name
Student ID or email

Class

Example:
9-A
10-B
Physics Group

Average Score

Example:
78%

Color indicators:

Green → above 75%
Yellow → 50–75%
Red → below 50%

Tests Completed

Example:
32 tests

Last Activity

Examples:
2 hours ago
Yesterday
3 days ago

Status

Badge styles:

Active → green badge
Inactive → gray badge

Actions column

Add an icon button:

View Profile

Clicking this should navigate to the Student Profile page.

---

ROW INTERACTION

Row hover effect:
Slight background highlight.

Action icon hover state.

---

DESIGN STYLE

Follow modern SaaS dashboard UI.

Card design:

Rounded corners
Soft shadows
Clear spacing

Typography hierarchy:

Student name → primary text
Additional info → secondary text

---

THEME SUPPORT

The page must automatically adapt to both themes already present in the design system:



Ensure the page visually integrates with the existing dashboard and maintains consistent UI/UX patterns across both themes and all screen sizes.