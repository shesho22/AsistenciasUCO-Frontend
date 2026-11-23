/** Variables de ejecución que `assets/env.js` publica en `window.env` (todas texto, todas opcionales). */
type RuntimeEnv = Readonly<Partial<Record<string, string>>>;

function runtimeEnv(): RuntimeEnv | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as { env?: RuntimeEnv }).env;
}

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
  const explicit = runtimeEnv()?.['API_URL'];
  if (explicit) {
    const normalized = trimTrailingSlashes(String(explicit));
    return normalized.replace(/\/api\/v1$/i, '').replace(/\/api$/i, '');
  }
  return `http://${getHost()}:8080`;
}

function runtimeFlag(key: string, fallback = false): boolean {
  return runtimeEnv()?.[key] === 'true' || fallback;
}

/**
 * Construye el objeto de entorno. `production` lo fija el archivo de entorno de cada configuración de compilación
 * (`environment.ts` en desarrollo y pruebas, `environment.prod.ts` en producción vía `fileReplacements`). Con
 * `production=true` el modo simulado queda apagado sin importar lo que publique `env.js`.
 */
export function crearEnvironment(production: boolean) {
  return {
    production,
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
      return !production && runtimeEnv()?.['USE_MOCKS'] === 'true';
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
      sessionsV2Enabled: true,
      // CULM-001 B.1 (HU047): la cancelación de sesión tiene contrato (CONTRACT B 3.2.1). La bandera queda como
      // interruptor de retirada. CULM-001 B.2 (HU175): el QR de asistencia tiene contrato (CONTRACT B 3.2.6).
      sessionCancelEnabled: true,
      sessionQrEnabled: true,
      // GET /usuarios/perfil para hidratar el nombre al iniciar sesión: apagado por defecto; habilitar con USER_PROFILE_ENDPOINT_ENABLED=true (el PUT fue retirado en CULM-001 A.2-14)
      userProfileEndpointEnabled: runtimeFlag('USER_PROFILE_ENDPOINT_ENABLED'),
      // CULM-001 C.1: cancelación por inasistencia y flujo de revisión
      cancelacionInasistenciaEnabled: true,
    },
    keycloak: {
      get url(): string {
        const explicit = runtimeEnv()?.['KEYCLOAK_URL'];
        if (explicit) return explicit;
        return 'http://127.0.0.1:8081';
      },
      realm: runtimeEnv()?.['KEYCLOAK_REALM'] || 'asistencias-uco',
      clientId: runtimeEnv()?.['KEYCLOAK_CLIENT_ID'] || 'asistencias-uco-frontend',
    },
    security: {
      /**
       * Selector de proveedor de seguridad: solo configuración de runtime (env.js), NUNCA estado del navegador
       * (localStorage/sessionStorage) ni una afirmación de autoridad. Sin valor el defecto es 'baseline'; para usar
       * legacy en desarrollo hay que fijar SECURITY_PROVIDER='legacy' en env.js. Un valor desconocido NO se convierte en
       * legacy: devuelve 'invalid' y la aplicación queda sin autenticación (fail-closed).
       */
      get provider(): 'legacy' | 'baseline' | 'invalid' {
        const raw = runtimeEnv()?.['SECURITY_PROVIDER'];
        if (raw === undefined || raw === null || String(raw).trim() === '') {
          // VAL SEG-12: por defecto baseline (igual que el backend y docker-compose). Legacy debe fijarse explicito en env.js.
          return 'baseline';
        }
        const normalized = String(raw).trim().toLowerCase();
        return normalized === 'legacy' || normalized === 'baseline' ? normalized : 'invalid';
      },
      /** Origen del PDP: solo para el login/logout BFF (navegación). El navegador no le envía datos de negocio. */
      get baselineUrl(): string {
        const explicit = runtimeEnv()?.['SECURITY_BASELINE_URL'];
        return String(explicit || 'http://localhost:18080').replace(/\/+$/, '');
      },
      /** Origen del bundle ESM público de Security UI; no se comparte el runtime Vue. */
      get securityUiUrl(): string {
        const explicit = runtimeEnv()?.['SECURITY_BASELINE_UI_URL'];
        return String(explicit || 'http://localhost:5175').replace(/\/+$/, '');
      },
      /** Identificador estable de la aplicación AsistenciasUCO en el PDP. */
      get applicationId(): string {
        const explicit = runtimeEnv()?.['SECURITY_BASELINE_APPLICATION_ID'];
        // SEC-12: sin id real por defecto; lo entrega env.js (entrypoint del contenedor o archivo local).
        return String(explicit || '');
      },
      /** Emisor OIDC central (realm security-baseline). */
      get baselineIssuerUrl(): string {
        const explicit = runtimeEnv()?.['SECURITY_BASELINE_ISSUER_URL'];
        return String(explicit || 'http://keycloak.localhost:19090/realms/security-baseline').replace(/\/+$/, '');
      },
      /** Cliente público (Authorization Code + PKCE) de la SPA en el realm central. */
      get baselineClientId(): string {
        return String(runtimeEnv()?.['SECURITY_BASELINE_CLIENT_ID'] || 'asistencias-uco-spa');
      },
    },
    /** Administración de mensajes institucionales: micro frontend de MessageUcoLab (paquete minifront-mensajes). */
    messages: {
      /** Ruta relativa (mismo origen): el proxy la reenvía al gateway de MessageUcoLab para que viaje la cookie de sesión. */
      get apiBaseUrl(): string {
        return String(runtimeEnv()?.['MESSAGEUCOLAB_API_BASE_URL'] || '/messageucolab').replace(/\/+$/, '');
      },
      /** Nombre exacto de la aplicación en MessageUcoLab. */
      get applicationName(): string {
        return String(runtimeEnv()?.['MESSAGEUCOLAB_APPLICATION_NAME'] || 'Asistencias UCO');
      },
      /** Ambiente inicial (Develop, Testing o Produccion). */
      get environmentName(): string {
        return String(runtimeEnv()?.['MESSAGEUCOLAB_ENVIRONMENT_NAME'] || 'Develop');
      },
      /**
       * INT-003 (MessageUcoLab 0.3.0, paso 12): los textos de la interfaz se leen del catálogo a través del Backend
       * (`GET /public/mensajes-interfaz/{codigo}`, sin sesión). Apagado por defecto: la SPA usa sus textos de respaldo.
       */
      get textosDesdeCatalogo(): boolean {
        return String(runtimeEnv()?.['MENSAJES_UI_DESDE_CATALOGO'] || '').trim().toLowerCase() === 'true';
      },
    },
    /**
     * Administración de parámetros: micro frontend del equipo del Catálogo de Parámetros
     * (`parametros-administration.js`), cargado en tiempo de ejecución. Es la única administración de parámetros de la UI.
     */
    parametros: {
      /** URL del módulo ESM (mismo origen; el proxy o el servidor web la reenvían al frontend del Catálogo). */
      get uiUrl(): string {
        return String(
          runtimeEnv()?.['CATALOGO_PARAMETROS_UI_URL'] || '/parametros-ui/parametros-administration.js'
        ).trim();
      },
      /** Base de la API del Catálogo, relativa al origen de la SPA para que viaje la cookie de sesión. */
      get apiBaseUrl(): string {
        return String(runtimeEnv()?.['CATALOGO_PARAMETROS_API_BASE_URL'] || '/catalogo-parametros/api/v1')
          .trim()
          .replace(/\/+$/, '');
      },
      /** UUID de la aplicación AsistenciasUCO en el Catálogo. Sin valor por defecto: se configura en env.js. */
      get applicationId(): string {
        return String(runtimeEnv()?.['CATALOGO_PARAMETROS_APPLICATION_ID'] || '').trim();
      },
    },
  };
}
