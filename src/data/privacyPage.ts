export type PrivacyList = {
  title: string;
  items: string[];
};

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  lists?: PrivacyList[];
};

export const privacyMetadata = {
  title: "Privacy | DbState",
  description:
    "How DbState handles website and Private Beta application information, including application purpose, Cloudflare processing, retention, consent, correction, and deletion requests.",
};

export const privacyHero = {
  eyebrow: "DbState Privacy",
  title: "How Private Beta application information is handled.",
  description:
    "This notice explains what information DbState collects through the Private Beta application process, why it is collected, how it is stored, and how applicants can request correction or deletion.",
  status:
    "Applies to the DbState website and Private Beta application process.",
  effectiveDate: "Effective: July 23, 2026",
};

export const privacySections: PrivacySection[] = [
  {
    id: "scope",
    title: "Scope of this notice",
    paragraphs: [
      "This notice covers the public DbState website, the Private Beta application questionnaire, application processing, Turnstile verification, application records stored in Cloudflare D1, and optional DbState product-update consent.",
      "It does not yet cover future paid customer accounts, product telemetry, hosted DbState workspaces, billing, customer database contents, or production support systems. Those systems do not currently exist as part of this website workflow.",
      "Accepted participants may receive additional notices if future onboarding collects different information.",
    ],
  },
  {
    id: "information-collected",
    title: "Information collected",
    lists: [
      {
        title: "Contact information",
        items: ["Name", "Work email", "Company, team, or project", "Role"],
      },
      {
        title: "Technical environment",
        items: [
          "PostgreSQL versions",
          "Windows version",
          "Other database engines",
          "Git or repository workflow",
        ],
      },
      {
        title: "Current database-change workflow",
        items: [
          "Schema-change process",
          "Reference-data process",
          "Database reviewers",
          "Release SQL preparation and execution process",
        ],
      },
      {
        title: "Evaluation information",
        items: [
          "A difficult database change",
          "First DbState workflow to evaluate",
          "Important PostgreSQL object types",
          "Current reference-data Git practices",
          "Evaluation goals",
        ],
      },
      {
        title: "Consent records",
        items: [
          "Required processing consent",
          "Optional product-update consent",
          "Consent version",
          "Submission timestamp",
        ],
      },
      {
        title: "Application administration",
        items: [
          "Public application reference",
          "Application status",
          "Status history",
          "Retention date",
        ],
      },
      {
        title: "Do not submit",
        items: [
          "Passwords",
          "Credential-bearing connection strings",
          "Private keys",
          "Access tokens",
          "Customer records",
          "Production data",
          "Confidential SQL",
          "Proprietary schema definitions",
          "Uploaded files or attachments",
        ],
      },
    ],
    paragraphs: [
      "DbState does not claim to automatically detect every sensitive value an applicant might type. Applicants should describe workflows and evaluation goals without exposing secrets or database content.",
    ],
  },
  {
    id: "use",
    title: "How information is used",
    paragraphs: [
      "DbState uses application information to evaluate Private Beta fit, contact the applicant about the application, understand PostgreSQL workflows and product needs, manage application status, and investigate submission or security failures.",
      "Occasional DbState product updates are sent only when the optional update consent is separately selected.",
      "Submitting an application does not guarantee Private Beta access.",
    ],
    lists: [
      {
        title: "DbState does not use Private Beta application information for",
        items: [
          "Behavioral advertising",
          "Data brokerage",
          "Sale of applicant data",
          "Automated employment decisions",
          "Credit decisions",
          "Identity scoring",
          "Unrelated profiling",
        ],
      },
    ],
  },
  {
    id: "consent",
    title: "Required and optional consent",
    paragraphs: [
      "Required application-processing consent is needed to evaluate the application, contact the applicant about the application, and manage the application record.",
      "Optional product-update consent is separate. It may be used for occasional DbState product updates and future Private Beta announcements.",
      "Optional product-update consent is not preselected, is not required to submit an application, and may be withdrawn by contacting darwin@dbstate.com.",
    ],
  },
  {
    id: "cloudflare",
    title: "Cloudflare infrastructure and Turnstile",
    paragraphs: [
      "DbState uses Cloudflare services for static website delivery, Worker API execution, D1 application storage, and Turnstile bot and abuse verification.",
      "For Turnstile, Cloudflare may process browser and connection signals needed for bot detection. The Turnstile token is validated server-side and is not stored in the application database.",
      "DbState does not send the applicant IP address as a separate Siteverify parameter. Cloudflare may independently process connection and browser signals as described in its own notices.",
    ],
  },
  {
    id: "storage",
    title: "Storage and data location",
    paragraphs: [
      "Private Beta application records are stored in Cloudflare D1. Production and preview D1 databases currently report an APAC operating region, and preview and production are separate resources.",
      "Browser tests do not use remote D1.",
      "The APAC operating region is not presented as a legally guaranteed data-residency commitment.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "Private Beta application records are assigned a retention date 365 days after submission.",
      "The retention period applies to the application record and its status history. The retention date is stored with the application.",
      "Accepted applicants may later receive a separate onboarding notice for information needed during active participation. Records may be deleted earlier following an approved deletion request.",
      "Retention enforcement is an operational control and does not make recovery copies disappear instantly.",
      "Automated retention enforcement is being implemented before public intake is enabled. Until then, public application intake remains closed.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing and access",
    paragraphs: [
      "Application information may be accessed for application review, application administration, technical troubleshooting, security investigation, and required infrastructure processing.",
      "Cloudflare is used as an infrastructure provider.",
      "DbState does not currently sell Private Beta application data, provide application data to advertisers, publish applicant answers, use applicant answers for public testimonials without separate permission, or require applicants to participate in marketing.",
      "DbState may disclose information if required to respond to a valid legal requirement.",
    ],
  },
  {
    id: "security",
    title: "Security boundary",
    paragraphs: [
      "Implemented controls include HTTPS in production, server-side request validation, Turnstile verification, D1 prepared statements, duplicate-submission protection, no application-token persistence, no password collection, no applicant IP field in the application tables, and no browser local-storage or cookie persistence for application answers.",
      "No security measure can guarantee that an incident will never occur.",
    ],
  },
  {
    id: "requests",
    title: "Correction and deletion requests",
    paragraphs: [
      "Applicants may request correction of application information, withdrawal of optional update consent, deletion of an application, or information about the current application record.",
      "Requests should include the application reference when available. DbState may request reasonable information to verify the requester.",
      "Do not send passwords, IDs, database content, private keys, access tokens, customer records, or production data with a privacy request.",
      "Questions or requests about this notice may be sent to darwin@dbstate.com.",
    ],
  },
  {
    id: "children",
    title: "Children's information",
    paragraphs: [
      "The Private Beta application is intended for professionals evaluating database-development workflows and is not directed to children.",
      "Do not submit an application on behalf of a child.",
      "Age verification is not currently implemented.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this notice",
    paragraphs: [
      "This notice may be updated as the Private Beta process changes. The effective date will be updated when the notice changes.",
      "Material changes should be reflected before newly affected processing begins.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: ["Privacy questions and requests: darwin@dbstate.com"],
  },
];
