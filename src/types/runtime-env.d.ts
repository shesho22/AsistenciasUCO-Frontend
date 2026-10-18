interface RuntimeEnv {
  API_URL?: string;
  KEYCLOAK_URL?: string;
  KEYCLOAK_REALM?: string;
  KEYCLOAK_CLIENT_ID?: string;
  USE_MOCKS?: string;
  USE_SESSIONS_V2?: string;
  SECURITY_BASELINE_ENABLED?: string;
  PDP_URL?: string;
  SECURITY_UI_URL?: string;
  APPLICATION_NAME?: string;
  VITE_PDP_URL?: string;
  VITE_SECURITY_UI_URL?: string;
  VITE_APPLICATION_NAME?: string;
  VITE_API_URL?: string;
}

declare global {
  interface Window {
    env?: RuntimeEnv;
  }
}

export {};
