function getHost(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function configuredApiRoot(): string {
  const explicit = (window as any)['env']?.['API_URL'];
  if (explicit) {
    const normalized = trimTrailingSlashes(String(explicit));
    return normalized.replace(/\/api\/v1$/i, '').replace(/\/api$/i, '');
  }
  return `http://${getHost()}:8080`;
}

function runtimeFlag(key: string, fallback = false): boolean {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored !== null) return stored === 'true';
  }
  return (window as any)['env']?.[key] === 'true' || fallback;
}

export const environment = {
  production: false,
  get apiUrl(): string {
    return `${configuredApiRoot()}/api/v1`;
  },
  get apiV1Url(): string {
    return `${configuredApiRoot()}/api/v1`;
  },
  get apiV2Url(): string {
    return `${configuredApiRoot()}/api/v2`;
  },
  get useFrontendMocks(): boolean {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('USE_MOCKS') !== null) {
      return localStorage.getItem('USE_MOCKS') === 'true';
    }
    return (window as any)['env']?.['USE_MOCKS'] === 'true' || false;
  },
  get useMocks(): boolean {
    return this.useFrontendMocks;
  },
  get useSessionsV2(): boolean {
    // UTC V2 is the only normal session flow. V1 remains a server-side
    // compatibility surface during migration and is not selectable by a
    // runtime flag or a browser preference.
    return true;
  },
  features: {
    sessionsEnabled: true,
    attendanceEnabled: true,
    sessionsV2Enabled: true,
    // OUT_OF_GOLDEN_PATH (LB-001B.5A): acciones de sesión sin contrato en
    // BACKEND_GOLDEN_PATH_CONTRACT. Deshabilitadas hasta que exista un contrato propio.
    sessionCancelEnabled: false,
    sessionQrEnabled: false,
    // GET /usuarios/perfil para hidratar el nombre al iniciar sesión: apagado por defecto; habilitar con USER_PROFILE_ENDPOINT_ENABLED=true (el PUT fue retirado en CULM-001 A.2-14)
    userProfileEndpointEnabled: runtimeFlag('USER_PROFILE_ENDPOINT_ENABLED'),
  },
  keycloak: {
    get url(): string {
      const explicit = (window as any)['env']?.['KEYCLOAK_URL'];
      if (explicit) return explicit;
      return 'http://127.0.0.1:8081';
    },
    realm: (window as any)['env']?.['KEYCLOAK_REALM'] || 'asistencias-uco',
    clientId: (window as any)['env']?.['KEYCLOAK_CLIENT_ID'] || 'asistencias-uco-frontend',
  },
  security: {
    /**
     * Selector de proveedor de seguridad: solo configuración de runtime (env.js), NUNCA estado del navegador
     * (localStorage/sessionStorage) ni una afirmación de autoridad. Un valor desconocido NO se convierte en
     * legacy: devuelve 'invalid' y la aplicación queda sin autenticación (fail-closed).
     */
    get provider(): 'legacy' | 'baseline' | 'invalid' {
      const raw = (window as any)['env']?.['SECURITY_PROVIDER'];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        return 'legacy';
      }
      const normalized = String(raw).trim().toLowerCase();
      return normalized === 'legacy' || normalized === 'baseline' ? normalized : 'invalid';
    },
    /** Origen del PDP: solo para el login/logout BFF (navegación). El navegador no le envía datos de negocio. */
    get baselineUrl(): string {
      const explicit = (window as any)['env']?.['SECURITY_BASELINE_URL'];
      return String(explicit || 'http://localhost:18080').replace(/\/+$/, '');
    },
    /** Origen del bundle ESM público de Security UI; no se comparte el runtime Vue. */
    get securityUiUrl(): string {
      const explicit = (window as any)['env']?.['SECURITY_BASELINE_UI_URL'];
      return String(explicit || 'http://localhost:5175').replace(/\/+$/, '');
    },
    /** Identificador estable de la aplicación AsistenciasUCO en el PDP. */
    get applicationId(): string {
      const explicit = (window as any)['env']?.['SECURITY_BASELINE_APPLICATION_ID'];
      return String(explicit || 'a0b42637-39f8-4ddd-bec2-0781ba08e779');
    },
    /** Emisor OIDC central (realm security-baseline). */
    get baselineIssuerUrl(): string {
      const explicit = (window as any)['env']?.['SECURITY_BASELINE_ISSUER_URL'];
      return String(explicit || 'http://keycloak.localhost:19090/realms/security-baseline').replace(/\/+$/, '');
    },
    /** Cliente público (Authorization Code + PKCE) de la SPA en el realm central. */
    get baselineClientId(): string {
      return String((window as any)['env']?.['SECURITY_BASELINE_CLIENT_ID'] || 'asistencias-uco-spa');
    },
  },
  /** Administración de mensajes institucionales: micro frontend de MessageUcoLab (paquete minifront-mensajes). */
  messages: {
    /** Ruta relativa (mismo origen): el proxy la reenvía al gateway de MessageUcoLab para que viaje la cookie de sesión. */
    get apiBaseUrl(): string {
      return String((window as any)['env']?.['MESSAGEUCOLAB_API_BASE_URL'] || '/messageucolab').replace(/\/+$/, '');
    },
    /** Nombre exacto de la aplicación en MessageUcoLab. */
    get applicationName(): string {
      return String((window as any)['env']?.['MESSAGEUCOLAB_APPLICATION_NAME'] || 'Asistencias UCO');
    },
    /** Ambiente inicial (Develop, Testing o Produccion). */
    get environmentName(): string {
      return String((window as any)['env']?.['MESSAGEUCOLAB_ENVIRONMENT_NAME'] || 'Develop');
    },
  },
};

