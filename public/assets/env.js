(function (window) {
  window.env = window.env || {};
  window.env['API_URL'] = 'http://localhost:8080/api/v1';
  window.env['KEYCLOAK_URL'] = 'http://keycloak.localhost:19090';
  window.env['KEYCLOAK_REALM'] = 'security-baseline';
  window.env['KEYCLOAK_CLIENT_ID'] = 'security-baseline-bff';
  window.env['USE_MOCKS'] = 'false';
  window.env['PDP_URL'] = 'http://localhost:18080';
  window.env['SECURITY_UI_URL'] = 'http://localhost:5175/security-administration.js';
  window.env['APPLICATION_NAME'] = 'asistencias-uco';
})(this);
