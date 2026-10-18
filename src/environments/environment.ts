function getHost(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

export const environment = {
  production: false,
  get apiUrl(): string {
    const explicit = (window as any)['env']?.['API_URL'];
    if (explicit) return explicit;
    const host = getHost();
    return `http://${host}:8080/api/v1`;
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
  features: {
    sessionsEnabled: true,
    attendanceEnabled: true,
    // OUT_OF_GOLDEN_PATH (LB-001B.5A): acciones de sesión sin contrato en
    // BACKEND_GOLDEN_PATH_CONTRACT. Deshabilitadas hasta que exista un contrato propio.
    sessionCancelEnabled: false,
    sessionQrEnabled: false,
    // Habilitado contractualmente para sincronización de perfil
    userProfileEndpointEnabled: true,
    // Módulo de reclamos docente en backend responde 501 (fuera de alcance en esta fase)
    teacherClaimsEnabled: false,
  },
  get pdpUrl(): string {
    const explicit = (window as any)['env']?.['PDP_URL'] || (window as any)['env']?.['VITE_PDP_URL'];
    if (explicit) return explicit;
    const host = getHost();
    return `http://${host}:18080`;
  },
  get securityUiUrl(): string {
    const explicit = (window as any)['env']?.['SECURITY_UI_URL'] || (window as any)['env']?.['VITE_SECURITY_UI_URL'];
    if (explicit) return explicit;
    const host = getHost();
    return `http://${host}:5175/security-administration.js`;
  },
  get applicationName(): string {
    return (window as any)['env']?.['APPLICATION_NAME'] || (window as any)['env']?.['VITE_APPLICATION_NAME'] || 'asistencias-uco';
  },
  keycloak: {
    get url(): string {
      const explicit = (window as any)['env']?.['KEYCLOAK_URL'];
      if (explicit) return explicit;
      return 'http://keycloak.localhost:19090';
    },
    realm: (window as any)['env']?.['KEYCLOAK_REALM'] || 'security-baseline',
    clientId: (window as any)['env']?.['KEYCLOAK_CLIENT_ID'] || 'security-baseline-bff',
  },
};

