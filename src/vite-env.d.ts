/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_USERNAME?: string;
  readonly VITE_DATA_PATH?: string;
  readonly TASKBOARD_DATA_PATH?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __DETECTED_OS_USERNAME__: string | undefined;
declare const __CONFIGURED_DATA_PATH__: string | undefined;
