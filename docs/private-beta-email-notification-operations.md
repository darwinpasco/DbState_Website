# Private Beta Email Notification Operations

This document captures the internal notification boundary for DbState Private
Beta applications.

Public intake remains disabled. Do not deploy, enable application submission,
install Turnstile secrets, or send production email unless that work is
explicitly approved in a later operational slice.

## Configured Binding

The Worker uses one Cloudflare Email Service binding:

```text
PRIVATE_BETA_EMAIL
```

The binding is restricted in `wrangler.jsonc`:

```text
Allowed sender: private-beta@dbstate.com
Destination: darwin@dbstate.com
```

No API tokens, SMTP credentials, or email secrets are stored in the repository.

## Notification Addresses

```text
From: DbState Private Beta <private-beta@dbstate.com>
To: darwin@dbstate.com
Reply-To: darwin@dbstate.com
```

These addresses are non-secret configuration. They are not exposed to browser
code.

## Notification Order

The application record and initial status-history record are authoritative.

Notification happens in this order:

1. Validate the application request.
2. Validate the Turnstile token server-side.
3. Persist the application row and initial status-history row in D1.
4. Prepare the normal public success response.
5. Schedule the internal notification with `waitUntil()`.

The email is never sent before durable persistence.

## Public Response

The public success response remains unchanged:

```json
{
  "applicationReference": "DBS-PB-XXXXXXXXXXXX",
  "status": "received",
  "submittedAt": "ISO-8601 timestamp"
}
```

The response does not include notification state, internal IDs, applicant
answers, D1 metadata, or status-history IDs.

## Email Content

The notification subject is:

```text
[DbState Private Beta] New application <APPLICATION_REFERENCE>
```

The plain-text and HTML bodies include only:

- Application reference
- Applicant name
- Work email
- Company, team, or project
- Role
- First workflow selected
- PostgreSQL versions
- Submission timestamp
- Retention date

The notification includes this handling note:

```text
The complete application remains in the DbState Private Beta D1 record. Do not forward this email outside the application-review process.
```

The email does not include:

- Difficult-change narrative
- Schema-change process
- Reference-data process
- Release SQL process
- Evaluation goals
- Git workflow narrative
- Customer data
- Turnstile token
- Turnstile secret
- Consent wording
- Raw request body
- Full applicant record

## Failure Posture

Notification failure does not:

- Roll back D1 persistence
- Change a public `201` response after successful persistence
- Ask the applicant to retry
- Create a duplicate application

The Worker logs only the application reference and a safe notification failure
classification. It must not log applicant email, applicant name, application
answers, Turnstile data, the email body, or raw provider error details.

Automatic retry, durable reconciliation, queues, cron, and notification outbox
handling are deferred.

## Applicant Email

This slice does not send an applicant acknowledgment email. Only the internal
notification to `darwin@dbstate.com` is implemented.

## Retention Jobs

Scheduled retention execution does not send new-application notifications and
does not reuse the `PRIVATE_BETA_EMAIL` binding.

Retention failure notification is deferred. Retention jobs log only safe count
and classification data.

## Testing

Worker tests use a deterministic fake email binding. Automated tests do not send
real email.

The tests verify that email is not sent when intake is disabled, validation
fails, Turnstile fails, D1 persistence fails, or a duplicate application is
rejected. They also verify that one minimal notification is scheduled after
successful persistence and that notification failure does not invalidate the
application record.

## Operator Prerequisites

Before any enabled-intake deployment, the operator must verify:

- Cloudflare Email Service is available for the Worker.
- The sender domain is ready for `private-beta@dbstate.com`.
- The binding is restricted to `darwin@dbstate.com`.
- The public intake mode and Worker intake mode are reviewed together.
- Turnstile secret installation is complete through a reviewed path.

Deployment remains deferred from this repository task.

## Production Preflight

The production preflight can include the restricted `PRIVATE_BETA_EMAIL`
binding, but application intake remains disabled. While intake is disabled, the
application endpoint returns before validation, persistence, and notification
scheduling, so no application notification email should be sent.

Before any later enabled-intake deployment, verify Email Service readiness:

- `dbstate.com` sending domain onboarded
- `private-beta@dbstate.com` permitted as sender
- `darwin@dbstate.com` verified as destination
- `wrangler.jsonc` still restricts the binding to the configured sender and
  destination

The production preflight does not send an applicant acknowledgment email and
does not add notification retry or reconciliation.
