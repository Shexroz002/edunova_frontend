Add a "Question Edit / Update" section inside the existing Quiz Detail page of a Teacher Dashboard for a Learning Management System.

IMPORTANT RULES

* A Quiz Detail page already exists in the Figma file.
* Do NOT redesign the entire page.
* Only add a Question Edit / Update UI section.
* Follow the existing UI/UX system already used in the dashboard.
* Reuse existing components (cards, buttons, inputs, dropdowns, spacing).
* Match the existing design patterns.
* The UI must support both existing themes:
  Light Theme and Dark Theme.

---

DATA STRUCTURE

The UI must support editing a question with the following data structure:

id
subject
question_text
table_markdown
difficulty
topic
images
options

Example question:

Subject: mathematics
Topic: Foizlar
Difficulty: o'rta

Question text:
"Buyumning narxi 55000 so'm. Uning narxi chegirmada 44000 so'mga sotildi. Mijozga necha foiz chegirma qilingan?"

Options:

A → 10
B → 40
C → 20 (correct answer)
D → 15

---

RESPONSIVE REQUIREMENTS

The layout must be fully responsive.

Desktop:
Display a multi-column form layout.

Tablet:
Use two-column form layout.

Mobile:
Stack all form fields vertically.

The UI must adapt smoothly for:

Desktop
Tablet
Mobile

---

SECTION LAYOUT

Create a large card titled:

Edit Question

Inside the card create a structured form.

---

FIELD 1 — SUBJECT

Component:
Dropdown select

Label:
Subject

Example value:
Mathematics

---

FIELD 2 — TOPIC

Component:
Text input or dropdown

Label:
Topic

Example:
Foizlar

---

FIELD 3 — DIFFICULTY

Component:
Dropdown select

Options:

Easy
Medium
Hard

Example value:
Medium

---

FIELD 4 — QUESTION TEXT

Component:
Large textarea input

Label:
Question Text

The textarea must support long text.

Example text:

Buyumning narxi 55000 so'm. Uning narxi chegirmada 44000 so'mga sotildi. Mijozga necha foiz chegirma qilingan?

---

FIELD 5 — TABLE MARKDOWN

Component:
Textarea input

Label:
Table (Markdown)

Allow teachers to insert table data if the question contains tables.

---

FIELD 6 — QUESTION IMAGES

Component:
Image upload area

Allow multiple images.

Display uploaded images as thumbnails.

Include button:

Upload Image

---

FIELD 7 — OPTIONS EDITOR

Create an "Options" section.

Display options as editable rows.

Each option row contains:

Option label
(A, B, C, D)

Option text input

Correct answer selector
(toggle or radio button)

Example rows:

A | 10
B | 40
C | 20 (correct)
D | 15

Teachers must be able to edit option text and change which option is correct.

---

BOTTOM ACTION BUTTONS

Place buttons at the bottom of the card.

Primary button:

Save Changes

Secondary button:

Cancel

---

CARD DESIGN

Use modern SaaS dashboard styling.

Cards must include:

Rounded corners (16px radius)
Soft shadows
Clear spacing between form fields

---

THEME SUPPORT

The UI must automatically adapt to both existing themes already defined in the dashboard.

Light Theme palette example:


---

Ensure the new section integrates visually with the existing Quiz Detail page and remains consistent across both themes and all responsive breakpoints.