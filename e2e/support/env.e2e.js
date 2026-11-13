// PRU-06 (VAL oleada 3): configuracion de runtime SOLO para las pruebas E2E con backend simulado.
// La sirve e2e/support/serve-dist.mjs en lugar de /assets/env.js; nunca se copia al build ni a la imagen.
// USE_MOCKS=true activa mock-backend.interceptor; SECURITY_PROVIDER=legacy muestra el formulario de login (en modo mock
// no se llama a Keycloak). API_URL apunta al mismo origen para que ninguna peticion salga del navegador de prueba.
(function (window) {
  window.env = window.env || {};
  window.env['API_URL'] = window.location.origin + '/api/v1';
  window.env['USE_MOCKS'] = 'true';
  window.env['SECURITY_PROVIDER'] = 'legacy';
  window.env['KEYCLOAK_URL'] = window.location.origin + '/keycloak-no-disponible';
})(this);
