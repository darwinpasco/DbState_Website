# Private Beta Privacy Operations

This runbook documents operational handling for DbState Private Beta applicant data. It does not implement an administrative endpoint, automated deletion, applicant acknowledgment email, notification retry, or public intake enablement.

Public intake remains disabled. Do not deploy, apply migrations, install secrets, or run remote D1 write operations from routine website validation.

## Data Inventory

Private Beta application records are stored in Cloudflare D1.

Application data is split across:

- `private_beta_applications`
- `private_beta_application_status_history`

The schema includes consent metadata, submission timestamps, status history, and a `retention_until` date assigned 365 days after submission.

The schema does not include:

- Turnstile-token column
- applicant IP column
- user-agent column
- attachment storage
- file upload metadata
- browser session identifiers

## Applicant Lookup

Use the public application reference as the preferred lookup key.

Limit lookup output to operational identifiers and lifecycle fields by default. Do not print all applicant answers unless a reviewed request requires it.

Preview read-only lookup:

```sh
wrangler d1 execute PRIVATE_BETA_DB --remote --preview --command "SELECT application_id, application_reference, normalized_email, status, submitted_at, retention_until FROM private_beta_applications WHERE application_reference = 'DBS-PB-REPLACE-ME';"
```

Production read-only lookup:

```sh
wrangler d1 execute PRIVATE_BETA_DB --remote --command "SELECT application_id, application_reference, normalized_email, status, submitted_at, retention_until FROM private_beta_applications WHERE application_reference = 'DBS-PB-REPLACE-ME';"
```

Replace `DBS-PB-REPLACE-ME` with the applicant-provided reference. Do not include passwords, database content, or applicant answers in command history when avoidable.

## Correction Process

1. Verify the requester and the application record.
2. Identify the fields requiring correction.
3. Record the reason for the correction outside applicant-content logs.
4. Use a reviewed prepared or parameterized operation.
5. Update `updated_at`.
6. Avoid altering consent history without evidence.

No correction endpoint exists in this slice.

## Deletion Process

Deletion should use an explicit reviewed operation with placeholders, confirmation gates, and transaction guidance.

Required order:

1. Verify the requester and application.
2. Confirm the application reference.
3. Delete status-history rows.
4. Delete the application row.
5. Verify zero matching active rows.
6. Record the operational outcome outside applicant-content logs.

Do not run deletion commands without a reviewed operational request. Do not include live applicant information in screenshots, logs, pull requests, or support notes.

## Retention Review

A future scheduled retention process should:

- Select records where `retention_until <= current UTC time`
- Exclude records under an approved legal or operational hold
- Delete status history and application rows atomically
- Record counts without recording applicant answers
- Produce failure evidence
- Never email applicant content in logs

Automated retention enforcement is not implemented in this slice.

## Internal Notification Email

After a future valid application is durably persisted, DbState sends one
minimal internal notification through the `PRIVATE_BETA_EMAIL` Worker binding.

The notification is restricted to:

- Application reference
- Applicant name
- Work email
- Company, team, or project
- Role
- First workflow selected
- PostgreSQL versions
- Submission timestamp
- Retention date

The notification must not include full free-text application narratives,
customer data, Turnstile tokens, Turnstile secrets, consent wording, raw request
bodies, or full application records.

Do not forward notification emails outside the application-review process.
Notification failure does not remove the persisted application record and does
not trigger automatic retry in this slice.

## Incident Handling

During a suspected privacy or security incident:

- Do not log full application bodies.
- Preserve technical evidence without applicant answers where possible.
- Rotate affected secrets when applicable.
- Keep public intake disabled during an unresolved material incident.
- Avoid sending applicant content through email or chat logs unless reviewed and necessary.

This runbook does not claim a formal incident-response certification.
