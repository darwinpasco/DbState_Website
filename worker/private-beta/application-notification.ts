import type { NormalizedPrivateBetaApplicationRequest } from "./application-contract";
import { buildPrivateBetaApplicationEmail } from "./application-email-template";

export interface SendEmailBinding {
  send(message: {
    to: string;
    from: { email: string; name: string };
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

export interface NotificationEnv {
  PRIVATE_BETA_EMAIL?: SendEmailBinding;
  PRIVATE_BETA_NOTIFICATION_TO?: string;
  PRIVATE_BETA_EMAIL_FROM?: string;
  PRIVATE_BETA_EMAIL_REPLY_TO?: string;
}

export interface NotificationInput {
  applicationReference: string;
  application: NormalizedPrivateBetaApplicationRequest;
  submittedAt: string;
  retentionUntil: string;
}

function classifyNotificationError(error: unknown) {
  if (error instanceof Error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^E_[A-Z0-9_]+$/.test(code)) {
      return code;
    }
  }

  return "notification_send_failed";
}

export async function sendPrivateBetaApplicationNotification(
  env: NotificationEnv,
  input: NotificationInput,
) {
  const to = env.PRIVATE_BETA_NOTIFICATION_TO;
  const from = env.PRIVATE_BETA_EMAIL_FROM;
  const replyTo = env.PRIVATE_BETA_EMAIL_REPLY_TO;

  if (!env.PRIVATE_BETA_EMAIL || !to || !from || !replyTo) {
    console.error(
      JSON.stringify({
        applicationReference: input.applicationReference,
        notificationFailure: "notification_not_configured",
      }),
    );
    return;
  }

  const email = buildPrivateBetaApplicationEmail(input);

  try {
    await env.PRIVATE_BETA_EMAIL.send({
      to,
      from: {
        email: from,
        name: "DbState Private Beta",
      },
      replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        applicationReference: input.applicationReference,
        notificationFailure: classifyNotificationError(error),
      }),
    );
  }
}
