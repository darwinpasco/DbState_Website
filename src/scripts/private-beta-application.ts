type TurnstileWidgetId = string;

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme: "dark";
  size: "flexible";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "unsupported-callback": () => void;
};

type TurnstileClient = {
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions,
  ) => TurnstileWidgetId;
  reset: (widgetId?: TurnstileWidgetId) => void;
  remove: (widgetId?: TurnstileWidgetId) => void;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

type SuccessBody = {
  applicationReference?: string;
  status?: string;
  submittedAt?: string;
};

declare global {
  interface Window {
    turnstile?: TurnstileClient;
  }
}

export {};

const form = document.querySelector<HTMLFormElement>(
  "[data-private-beta-application-form]",
);

const optionalStringFields = new Set(["otherDatabaseEngines", "gitWorkflow"]);

const turnstileScriptUrl =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const endpoint = "/api/private-beta-applications";
const genericVerificationMessage =
  "The verification could not be confirmed. Refresh the verification and try again.";
const temporaryErrorMessage =
  "The application could not be submitted right now. Review your answers and try again.";

if (form) {
  initializePrivateBetaForm(form);
}

function getElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing private beta form element: ${selector}`);
  }

  return element;
}

function initializePrivateBetaForm(applicationForm: HTMLFormElement) {
  const intakeMode = applicationForm.dataset.intakeMode;

  if (intakeMode !== "test" && intakeMode !== "enabled") {
    return;
  }

  const siteKey = applicationForm.dataset.turnstileSiteKey;
  const action = applicationForm.dataset.turnstileAction;

  if (!siteKey || !action) {
    return;
  }

  const errorSummary = getElement<HTMLElement>(
    applicationForm,
    "[data-error-summary]",
  );
  const errorSummaryTitle = getElement<HTMLElement>(
    applicationForm,
    "[data-error-summary-title]",
  );
  const errorSummaryList = getElement<HTMLUListElement>(
    applicationForm,
    "[data-error-summary-list]",
  );
  const successPanel = getElement<HTMLElement>(
    applicationForm,
    "[data-success-panel]",
  );
  const referenceElement = getElement<HTMLElement>(
    applicationForm,
    "[data-application-reference]",
  );
  const submitButton = getElement<HTMLButtonElement>(
    applicationForm,
    "[data-submit-button]",
  );
  const submissionStatus = getElement<HTMLElement>(
    applicationForm,
    "[data-submission-status]",
  );
  const turnstileContainer = getElement<HTMLElement>(
    applicationForm,
    "[data-turnstile-container]",
  );
  const turnstileStatus = getElement<HTMLElement>(
    applicationForm,
    "[data-turnstile-status]",
  );

  let turnstileToken = "";
  let widgetId: TurnstileWidgetId | undefined;
  let isSubmitting = false;
  let isSubmitted = false;

  function setSubmitState() {
    submitButton.disabled = isSubmitted || isSubmitting || !turnstileToken;
  }

  function setVerificationStatus(message: string) {
    turnstileStatus.textContent = message;
  }

  function clearFieldErrors() {
    for (const control of Array.from(applicationForm.elements)) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        control.removeAttribute("aria-invalid");
      }
    }

    for (const error of Array.from(
      applicationForm.querySelectorAll<HTMLElement>("[data-field-error-for]"),
    )) {
      error.hidden = true;
      error.textContent = "";
    }
  }

  function hideErrorSummary() {
    errorSummary.hidden = true;
    errorSummaryList.replaceChildren();
  }

  function fieldLabel(control: HTMLElement) {
    if (!control.id) {
      return "Field";
    }

    const label = applicationForm.querySelector<HTMLLabelElement>(
      `label[for="${control.id}"]`,
    );

    return label?.textContent?.replace(/\s+/g, " ").trim() ?? control.id;
  }

  function setFieldError(name: string, message: string) {
    const control = applicationForm.elements.namedItem(name);

    if (!(
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    )) {
      return;
    }

    control.setAttribute("aria-invalid", "true");

    const errorElement = applicationForm.querySelector<HTMLElement>(
      `[data-field-error-for="${name}"]`,
    );

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
  }

  function showErrorSummary(
    title: string,
    errors: Array<{ label: string; message: string; target?: HTMLElement }>,
  ) {
    errorSummaryTitle.textContent = title;
    errorSummaryList.replaceChildren();

    for (const error of errors) {
      const item = document.createElement("li");
      item.textContent = `${error.label}: ${error.message}`;
      errorSummaryList.append(item);
    }

    errorSummary.hidden = false;
    errorSummary.focus();
  }

  function resetTurnstile(message: string) {
    turnstileToken = "";
    setVerificationStatus(message);

    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
    }

    setSubmitState();
  }

  function removeTurnstile() {
    turnstileToken = "";

    if (window.turnstile && widgetId) {
      window.turnstile.remove(widgetId);
      widgetId = undefined;
    }

    setSubmitState();
  }

  function showInvalidFormSummary() {
    const invalidControls = Array.from(
      applicationForm.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea"),
    ).filter((control) => !control.validity.valid);

    const errors = invalidControls.map((control) => {
      const message = control.validationMessage || "Complete this field.";
      setFieldError(control.name, message);

      return {
        label: fieldLabel(control),
        message,
        target: control,
      };
    });

    showErrorSummary("Check the required fields.", errors);
    invalidControls[0]?.focus();
  }

  function collectApplicationPayload() {
    const data = new FormData(applicationForm);
    const payload: Record<string, string | boolean> = {};

    for (const [name, value] of data.entries()) {
      if (typeof value !== "string") {
        continue;
      }

      if (name === "processingConsent" || name === "futureUpdatesOptIn") {
        continue;
      }

      const trimmedValue = value.trim();

      if (optionalStringFields.has(name) && trimmedValue.length === 0) {
        continue;
      }

      payload[name] = trimmedValue;
    }

    payload.processingConsent = data.has("processingConsent");

    if (data.has("futureUpdatesOptIn")) {
      payload.futureUpdatesOptIn = true;
    }

    payload.turnstileToken = turnstileToken;

    return payload;
  }

  async function readApiBody(response: Response) {
    try {
      return (await response.json()) as ApiErrorBody | SuccessBody;
    } catch {
      return {};
    }
  }

  function applyServerFieldErrors(fields: Record<string, string>) {
    const errors: Array<{
      label: string;
      message: string;
      target?: HTMLElement;
    }> = [];

    for (const [name, message] of Object.entries(fields)) {
      setFieldError(name, message);
      const control = applicationForm.elements.namedItem(name);

      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        errors.push({
          label: fieldLabel(control),
          message,
          target: control,
        });
      } else {
        errors.push({
          label: name,
          message,
        });
      }
    }

    return errors;
  }

  function showApiError(responseStatus: number, body: ApiErrorBody) {
    const code = body.error?.code;
    const fields = body.error?.fields;
    const serverMessage = body.error?.message;
    let message = serverMessage || temporaryErrorMessage;

    if (
      code === "turnstile_required" ||
      code === "turnstile_invalid" ||
      code === "turnstile_action_mismatch" ||
      code === "turnstile_hostname_mismatch"
    ) {
      message = genericVerificationMessage;
    } else if (code === "duplicate_application") {
      message =
        "An application from this email address was already received recently.";
    } else if (
      code === "intake_disabled" ||
      code === "intake_not_configured" ||
      code === "turnstile_not_configured"
    ) {
      message = "Application intake is currently closed.";
    } else if (code === "turnstile_unavailable") {
      message =
        "Application verification is temporarily unavailable. Try again later.";
    } else if (responseStatus >= 500) {
      message = temporaryErrorMessage;
    }

    const errors = fields
      ? applyServerFieldErrors(fields)
      : [{ label: "Submission", message }];

    showErrorSummary(message, errors);
  }

  async function submitApplication() {
    if (isSubmitting || isSubmitted) {
      return;
    }

    clearFieldErrors();
    hideErrorSummary();
    successPanel.hidden = true;

    if (!applicationForm.checkValidity()) {
      showInvalidFormSummary();
      return;
    }

    if (!turnstileToken) {
      showErrorSummary("Complete verification before submitting.", [
        {
          label: "Verification",
          message:
            "Complete the verification before submitting the application.",
          target: turnstileContainer,
        },
      ]);
      return;
    }

    const payload = collectApplicationPayload();

    isSubmitting = true;
    applicationForm.setAttribute("aria-busy", "true");
    submissionStatus.textContent = "Submitting application...";
    setSubmitState();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await readApiBody(response);

      if (response.status === 201) {
        const successBody = body as SuccessBody;
        referenceElement.textContent =
          successBody.applicationReference ?? "Reference unavailable";
        successPanel.hidden = false;
        successPanel.focus();
        isSubmitted = true;
        applicationForm.reset();
        removeTurnstile();
        submissionStatus.textContent = "";
        return;
      }

      resetTurnstile("Complete verification again before retrying.");
      showApiError(response.status, body as ApiErrorBody);
    } catch {
      resetTurnstile("Complete verification again before retrying.");
      showErrorSummary(temporaryErrorMessage, [
        {
          label: "Network",
          message: temporaryErrorMessage,
        },
      ]);
    } finally {
      isSubmitting = false;
      applicationForm.removeAttribute("aria-busy");
      if (!isSubmitted) {
        submissionStatus.textContent = "";
      }
      setSubmitState();
    }
  }

  async function loadTurnstile() {
    if (window.turnstile) {
      return window.turnstile;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = turnstileScriptUrl;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("load failed")), {
        once: true,
      });
      document.head.append(script);
    });

    if (!window.turnstile) {
      throw new Error("Turnstile unavailable");
    }

    return window.turnstile;
  }

  applicationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitApplication();
  });

  setSubmitState();

  void loadTurnstile()
    .then((turnstile) => {
      widgetId = turnstile.render(turnstileContainer, {
        sitekey: siteKey,
        action,
        theme: "dark",
        size: "flexible",
        callback(token: string) {
          turnstileToken = token;
          setVerificationStatus("Verification complete.");
          setSubmitState();
        },
        "error-callback"() {
          resetTurnstile(genericVerificationMessage);
        },
        "expired-callback"() {
          resetTurnstile("Verification expired. Complete it again.");
        },
        "timeout-callback"() {
          resetTurnstile("Verification timed out. Complete it again.");
        },
        "unsupported-callback"() {
          resetTurnstile(
            "This browser cannot complete verification. Try another browser.",
          );
        },
      });
    })
    .catch(() => {
      setVerificationStatus(
        "Verification is temporarily unavailable. Try again later.",
      );
      setSubmitState();
    });
}
