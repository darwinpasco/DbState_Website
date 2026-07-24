# Private Beta Production Preflight

This runbook prepares the first complete DbState website production preflight
while keeping application intake, notification side effects, and retention
deletion disabled.

The canonical production site is:

```text
https://dbstate.com
```

## Safety Posture

The committed production configuration must remain:

```text
PRIVATE_BETA_INTAKE_MODE=disabled
PRIVATE_BETA_RETENTION_ENFORCEMENT_MODE=disabled
PRIVATE_BETA_RETENTION_BATCH_SIZE=100
PUBLIC_PRIVATE_BETA_INTAKE_MODE=disabled
```

The preflight deployment may publish the website, static assets, Worker API
foundation, D1 binding, Turnstile validation configuration, restricted email
binding, and scheduled retention handler. It must not accept applications, send
application notification email, delete retained records, modify production D1,
or activate automated retention.

## 1. Confirm Account And Current Deployment

```powershell
npx.cmd wrangler whoami
npx.cmd wrangler deployments list
npx.cmd wrangler versions list
```

Record the current active version ID before making any change. Use that version
ID for rollback if the preflight deployment needs to be reverted.

## 2. Confirm Email Service Readiness

Verify in Cloudflare before any enabled-intake deployment:

- `dbstate.com` sending domain onboarded
- `private-beta@dbstate.com` permitted as sender
- `darwin@dbstate.com` verified as destination
- `PRIVATE_BETA_EMAIL` binding restrictions match `wrangler.jsonc`

Do not send application email during preflight.

## 3. Install The Turnstile Secret Without Immediate Deployment

Install the production secret only through a reviewed operator action. The
secret value must not be committed, printed, logged, or stored in documentation.

```powershell
npx.cmd wrangler versions secret put TURNSTILE_SECRET_KEY `
  --message "Configure DbState production Turnstile secret"
```

The operator enters the secret interactively.

Do not use:

```text
wrangler secret put
```

That command can create and immediately deploy a Worker version.

## 4. Confirm Secret Name

Use a command or dashboard view that lists secret names without exposing values.
Confirm that this name exists:

```text
TURNSTILE_SECRET_KEY
```

Do not print the value.

## 5. Build The Disabled Preflight

```powershell
npm.cmd run release:preflight:build
```

The script forces `PUBLIC_PRIVATE_BETA_INTAKE_MODE=disabled`, rejects inherited
enabled public intake, builds the static site, confirms 15 static pages,
verifies the closed Private Beta page, and verifies the homepage social image
metadata.

## 6. Run Complete Local Validation

```powershell
npm.cmd run validate:wrangler-config
npm.cmd run format:check
npm.cmd run check
npm.cmd run test:worker
npm.cmd run test:e2e
npm.cmd run test:e2e:private-beta-client
npm.cmd run quality
```

These commands must not install secrets, query remote D1, send real email,
upload a version, deploy, or enable intake.

## 7. Upload A Version Without Deployment

```powershell
npm.cmd run release:preflight:upload
```

Record:

- Version ID
- Version tag: `private-beta-preflight`
- Version message: `DbState Private Beta production preflight`

Do not deploy automatically.

## 8. Review Uploaded Version

```powershell
npx.cmd wrangler versions view <VERSION_ID>
```

Confirm:

- Application intake disabled
- Retention enforcement disabled
- `PRIVATE_BETA_DB` binding
- `PRIVATE_BETA_EMAIL` restricted sender and destination
- Turnstile public sitekey, expected action, expected hostnames, and required
  secret name
- Cron schedule `17 3 * * *`
- Static assets
- Social image at `/social/dbstate-home-hero-v1.png`

## 9. Deploy The Reviewed Version

Only after explicit operator approval:

```powershell
npx.cmd wrangler versions deploy <VERSION_ID>@100% -y
```

Deploying a version determines which uploaded Worker version receives traffic.

## 10. Apply Trigger Configuration

Current Wrangler behavior may require a separate reviewed trigger deployment
after version deployment. Confirm the only Cron remains:

```text
17 3 * * *
```

Do not run `wrangler triggers deploy` from CI or routine validation. Cron
propagation may take several minutes.

Retention mode remains disabled even when the trigger is present.

## 11. Verify Production

```powershell
npm.cmd run release:preflight:verify
```

The verification script checks public pages, the social preview asset and
metadata, disabled Private Beta public mode, the `503 intake_disabled` API
response, and Privacy wording. It does not write D1 records, send email, invoke
scheduled retention, install secrets, or deploy.

Also verify D1 counts remain zero with a read-only query:

```sql
SELECT
  (SELECT COUNT(*) FROM private_beta_applications) AS application_count,
  (SELECT COUNT(*) FROM private_beta_application_status_history) AS history_count;
```

Expected before activation:

```text
application_count = 0
history_count = 0
```

## 12. Verify Social Preview

Confirm the homepage-hero social image is publicly available:

```text
https://dbstate.com/social/dbstate-home-hero-v1.png
```

The homepage-hero social image becomes publicly available when this preflight
Worker version is deployed.

Re-scrape:

```text
https://dbstate.com/
```

through the relevant social-platform preview tools. Social platforms may
continue using cached homepage metadata until they re-scrape the URL.

## 13. Rollback

Rollback uses the previously recorded active version ID. Do not guess the ID.

```powershell
npx.cmd wrangler versions deploy <PREVIOUS_VERSION_ID>@100% -y
```

Rollback restores the previous Worker deployment. It does not roll back D1
state.

## Final Activation Remains Deferred

Enabling public application intake still requires a separate reviewed
configuration change for both Worker runtime mode and public page mode, verified
Turnstile secret installation, email readiness, privacy operations readiness,
and production validation.
