/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SITE_ID?: string;
  readonly VITE_APP_STATE_TABLE?: string;
  readonly VITE_APP_STATE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
