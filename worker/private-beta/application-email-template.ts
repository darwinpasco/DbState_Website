import type { NormalizedPrivateBetaApplicationRequest } from "./application-contract";

export interface PrivateBetaApplicationNotificationInput {
  applicationReference: string;
  application: NormalizedPrivateBetaApplicationRequest;
  submittedAt: string;
  retentionUntil: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const handoffNotice =
  "The complete application remains in the DbState Private Beta D1 record. Do not forward this email outside the application-review process.";

export function buildPrivateBetaApplicationEmail(
  input: PrivateBetaApplicationNotificationInput,
) {
  const lines = [
    "New DbState Private Beta application",
    "",
    `Application reference: ${input.applicationReference}`,
    `Applicant name: ${input.application.fullName}`,
    `Work email: ${input.application.workEmail}`,
    `Company, team, or project: ${input.application.companyTeamOrProject}`,
    `Role: ${input.application.role}`,
    `First workflow selected: ${input.application.firstWorkflow}`,
    `PostgreSQL versions: ${input.application.postgresqlVersions}`,
    `Submission timestamp: ${input.submittedAt}`,
    `Retention date: ${input.retentionUntil}`,
    "",
    handoffNotice,
  ];

  const rows = [
    ["Application reference", input.applicationReference],
    ["Applicant name", input.application.fullName],
    ["Work email", input.application.workEmail],
    ["Company, team, or project", input.application.companyTeamOrProject],
    ["Role", input.application.role],
    ["First workflow selected", input.application.firstWorkflow],
    ["PostgreSQL versions", input.application.postgresqlVersions],
    ["Submission timestamp", input.submittedAt],
    ["Retention date", input.retentionUntil],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 12px 6px 0;">${escapeHtml(label)}</th><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    subject: `[DbState Private Beta] New application ${input.applicationReference}`,
    text: lines.join("\n"),
    html: `<!doctype html>
<html lang="en">
  <body>
    <h1>New DbState Private Beta application</h1>
    <table>
      <tbody>${htmlRows}</tbody>
    </table>
    <p>${escapeHtml(handoffNotice)}</p>
  </body>
</html>`,
  };
}
