(function (window) {
  window.env = window.env || {};
  var host = window.location.hostname || 'localhost';
  window.env['API_URL'] = 'http://' + host + ':8080/api/v1';
  window.env['KEYCLOAK_URL'] = 'http://' + host + ':8081';
  window.env['KEYCLOAK_REALM'] = 'asistencias-uco';
  window.env['KEYCLOAK_CLIENT_ID'] = 'asistencias-uco-frontend';
  window.env['USE_MOCKS'] = 'false';
  window.env['SECURITY_PROVIDER'] = 'baseline';
  window.env['SECURITY_BASELINE_URL'] = 'http://' + host + ':18080';
  window.env['SECURITY_BASELINE_UI_URL'] = 'http://' + host + ':5175';
  window.env['SECURITY_BASELINE_APPLICATION_ID'] = 'a0b42637-39f8-4ddd-bec2-0781ba08e779';
  window.env['SECURITY_BASELINE_ISSUER_URL'] = 'http://keycloak.localhost:19090/realms/security-baseline';
  window.env['SECURITY_BASELINE_CLIENT_ID'] = 'asistencias-uco-spa';
  // Catálogo de Parámetros: UUID de la aplicación AsistenciasUCO en el Catálogo (no es secreto) y rutas del mismo origen.
  window.env['CATALOGO_PARAMETROS_APPLICATION_ID'] = '0d24a3a4-8c9d-4ac3-9b1a-a97ef16ea186';
  window.env['CATALOGO_PARAMETROS_UI_URL'] = '/parametros-ui/parametros-administration.js';
  window.env['CATALOGO_PARAMETROS_API_BASE_URL'] = '/catalogo-parametros/api/v1';
})(this);
