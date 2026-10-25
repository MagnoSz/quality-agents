# Azure DevOps — User Story 142: Renew a loan (synthetic)

State: Resolved · Area: Library\Loans · URL: https://dev.azure.com/acme/library/_workitems/edit/142

As a member, I want to renew an active loan so that I can keep the book longer.

## Linked test cases

### Test Case 1001 — Renew a loan before the due date

Precondition: member with one active loan due in 5 days, no renewals yet.

| # | Action | Expected result |
|---|---|---|
| 1 | Open "My loans" | Active loans are listed with their due dates |
| 2 | Click "Renew" on the loan | Confirmation dialog is shown |
| 3 | Confirm | Due date is extended by 14 days and the message "Loan renewed." is shown |

### Test Case 1002 — Renew an overdue loan

Precondition: member with one loan 2 days overdue.

| # | Action | Expected result |
|---|---|---|
| 1 | Open "My loans" | The overdue loan is highlighted |
| 2 | Click "Renew" on the overdue loan | The message "Overdue loans cannot be renewed." is shown and the due date does not change |
