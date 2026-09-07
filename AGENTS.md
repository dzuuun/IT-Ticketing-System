# NDMU MIS Service Desk Rules

1. Guest ticket submission remains available and never requires an employee or student ID.
2. General requestor identity is full name, office/department, and email; contact and location are optional.
3. Keep internal notes out of requestor-facing responses and notifications.
4. Enforce all authorization in Express middleware; never trust client-side role data.
5. Use parameterized SQL and keep route, controller, service, and data-access responsibilities separated.
6. Record significant ticket changes historically; disable referenced configuration rather than deleting it.
7. Use short-lived access JWTs and hashed, revocable refresh tokens in HttpOnly cookies. Never store refresh tokens in localStorage.
8. Never commit environment credentials or OAuth/SMTP secrets.
