/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PRIVATE_BETA_INTAKE_MODE?: "disabled" | "test" | "enabled";
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
