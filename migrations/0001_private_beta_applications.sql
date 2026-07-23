CREATE TABLE private_beta_applications (
  application_id TEXT PRIMARY KEY,
  application_reference TEXT NOT NULL UNIQUE,

  full_name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  company_team_project TEXT NOT NULL,
  role TEXT NOT NULL,

  postgresql_versions TEXT NOT NULL,
  windows_version TEXT NOT NULL,
  other_database_engines TEXT,
  git_workflow TEXT,

  schema_change_process TEXT NOT NULL,
  reference_data_process TEXT NOT NULL,
  database_reviewers TEXT NOT NULL,
  release_sql_process TEXT NOT NULL,

  difficult_change TEXT NOT NULL,
  first_workflow TEXT NOT NULL CHECK (
    first_workflow IN (
      'schema-database-to-repository',
      'schema-repository-to-database',
      'reference-data-database-to-repository',
      'reference-data-repository-to-database'
    )
  ),
  important_object_types TEXT NOT NULL,
  manages_reference_data_in_git TEXT NOT NULL CHECK (
    manages_reference_data_in_git IN ('yes', 'no', 'partially')
  ),
  evaluation_goals TEXT NOT NULL,

  processing_consent INTEGER NOT NULL CHECK (processing_consent IN (0, 1)),
  future_updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (
    future_updates_opt_in IN (0, 1)
  ),
  consent_version TEXT NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN (
      'new',
      'reviewing',
      'contacted',
      'accepted',
      'waitlisted',
      'declined',
      'withdrawn'
    )
  ),
  submission_bucket INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',

  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retention_until TEXT NOT NULL
);

CREATE UNIQUE INDEX private_beta_applications_normalized_email_bucket_idx
  ON private_beta_applications (normalized_email, submission_bucket);

CREATE INDEX private_beta_applications_status_idx
  ON private_beta_applications (status);

CREATE INDEX private_beta_applications_submitted_at_idx
  ON private_beta_applications (submitted_at);

CREATE INDEX private_beta_applications_retention_until_idx
  ON private_beta_applications (retention_until);

CREATE TABLE private_beta_application_status_history (
  status_history_id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'new',
      'reviewing',
      'contacted',
      'accepted',
      'waitlisted',
      'declined',
      'withdrawn'
    )
  ),
  changed_at TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (application_id) REFERENCES private_beta_applications (application_id)
);

CREATE INDEX private_beta_application_status_history_application_changed_idx
  ON private_beta_application_status_history (application_id, changed_at);
