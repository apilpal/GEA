# GEA repository instructions

## Project
- GEA is a FastAPI/SQLAlchemy backend and a React/TypeScript frontend for school operations.
- Treat student, guardian, attendance, marks and fee data as sensitive personal data.
- Prefer server-side authorization and validation; never rely on UI hiding alone.
- Keep changes focused, tested and compatible with the existing SQLite-first local setup.

## Backend
- Add or update SQLAlchemy/Alembic models when persistence changes are required.
- Enforce role and object-level authorization in API dependencies and database queries.
- Do not return unrelated student fields or full profiles when a route only needs limited data.
- Use existing authentication, audit and configuration patterns instead of inventing new ones.
- Keep secrets in environment variables or a secret manager, never in source or logs.
- Add API tests for every relevant role: admin, clerk, teacher and driver.
- Test authorization, validation and transaction behavior together for mutations.

## Frontend
- Use TypeScript, React and the existing SCSS/CSS conventions.
- Do not use raw `innerHTML` or template strings for server-provided text.
- Use `textContent`, escape helpers or framework-bound text rendering.
- Avoid inline `onclick` handlers and inline style blocks; put behavior and styles in source files.
- Preserve 360px responsive behavior and both light and dark themes.
- Keep controls touch-friendly, with visible labels and focus states.
- Add loading, empty, error/retry and saved states consistently.
- Render amounts in Indian rupee (`₹`) formatting where money is displayed.

## Security and privacy
- Security fixes and authorization come before UI redesign.
- Do not expose fee data to teachers.
- Drivers may access only students assigned to their own route, with only required fields.
- Teachers may access only assigned classes and permitted academic data.
- Clerks may access office and fee data, but not unrelated academic fields.
- Login bypass, open CORS and unsafe production settings must fail closed.
- Keep authentication tokens out of `localStorage`; follow cookie, CSRF and refresh-rotation requirements.
- Log sensitive-data viewing, edits and exports with actor, time and action, but not the sensitive data itself.
- Exports and printouts should contain only required columns and be logged.
- No live-location or AI-chat behavior is to be added until a written school decision exists.

## Data and retention
- Do not hard-delete a student as part of normal UI work.
- Use a left-school status and follow approved retention/anonymization rules.
- Every personal-data field should have a documented purpose, access scope and retention rule.
- Do not claim legal compliance or coverage by the school exemption without explicit legal review.
- Any consent, notice, breach or rights workflow must preserve audit records and avoid unnecessary personal data.

## Testing and verification
- Run the smallest relevant test suites during development, then broader suites before completion.
- Add regression tests for XSS-style names or text, role restrictions and unsafe configuration.
- Verify both frontend themes and small mobile widths for UI changes.
- Never use real student data in tests or commit fixtures containing real personal information.
- If a test is not available for a browser or integration requirement, state the gap explicitly.

## GitHub issues
- Reuse existing epics and sub-issues instead of recreating them.
- Security epics include #71; privacy epic #74; students #75; dashboard #76; transport #77; reports #78; app-wide UX #79.
- Link implementation subtasks to the relevant Epic as sub-issues and avoid duplicate titles.
- Prefer issue bodies with Goal, Work, Done when, Dependencies and Size sections.
- Do not close or delete issues unless the user explicitly requests it.
