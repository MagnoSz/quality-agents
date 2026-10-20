# US-LIB-205 — Search the catalog by ISBN

**As** a library visitor
**I want** to search the catalog by ISBN
**So that** I can find a specific edition quickly.

## Acceptance criteria

- **AC1:** The "ISBN" field accepts ISBN-10 (10 digits) or ISBN-13 (13 digits).
- **AC2:** Hyphens typed by the user are ignored (978-3-16-148410-0 is accepted).
- **AC3:** Any other length, or any character other than digits and hyphens, shows the message "Invalid ISBN. Enter 10 or 13 digits." and no search is performed.
- **AC4:** When no book matches, the system informs the user that nothing was found.
- **AC5:** Each result shows title, author and availability (Available / On loan).
- **AC6:** The search button is disabled while the field is empty.

## Business rules

- **BR.020:** The last character of an ISBN-10 may be the letter X (check digit).
