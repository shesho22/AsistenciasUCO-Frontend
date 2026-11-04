interface RuntimeEnv {
  API_URL?: string;
  KEYCLOAK_URL?: string;
  KEYCLOAK_REALM?: string;
  KEYCLOAK_CLIENT_ID?: string;
  USE_MOCKS?: string;
  SECURITY_PROVIDER?: string;
  SECURITY_BASELINE_URL?: string;
  SECURITY_BASELINE_UI_URL?: string;
  SECURITY_BASELINE_APPLICATION_ID?: string;
  SECURITY_BASELINE_ISSUER_URL?: string;
  SECURITY_BASELINE_CLIENT_ID?: string;
  MESSAGEUCOLAB_API_BASE_URL?: string;
  MESSAGEUCOLAB_APPLICATION_NAME?: string;
  MESSAGEUCOLAB_ENVIRONMENT_NAME?: string;
}

declare global {
  interface Window {
    env?: RuntimeEnv;
  }
}

export {};
