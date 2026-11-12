/**
 * Proxy del servidor de desarrollo (ng serve).
 *
 * /messageucolab -> gateway de MessageUcoLab (Kong). La administración de mensajes (micro frontend minifront-mensajes)
 * llama a esa ruta relativa para que el navegador envíe la cookie de sesión de seguridad (SECURITY_BASELINE_SESSION) al
 * mismo origen de la SPA. Se quita la cabecera Origin: sin esto el componente rechaza con 403 los POST/PUT/DELETE que
 * llegan de un origen que no conoce.
 *
 * El destino se cambia con MESSAGEUCOLAB_URL; por defecto es el gateway local (http://localhost:8000).
 *
 * /catalogo-parametros -> API del Catálogo de Parámetros (CATALOGO_PARAMETROS_URL, por defecto http://localhost:8081).
 * La administración de parámetros (micro frontend parametros-administration.js) llama a esa ruta relativa por la misma
 * razón: la cookie de sesión viaja al mismo origen. La API del Catálogo solo admite en CORS el origen de su propio
 * frontend (FRONTEND_ALLOWED_ORIGINS, 4201) y responde 403 a cualquier petición que traiga Origin: http://localhost:4200,
 * así que también se quita la cabecera. Los eventos SSE (…/administracion/events) pasan sin buffer.
 *
 * /parametros-ui -> frontend del Catálogo (CATALOGO_PARAMETROS_UI_ORIGIN, por defecto http://localhost:4201), que publica
 * el módulo ESM parametros-administration.js como artefacto público.
 */
const sinOrigin = (proxy) => {
  proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
};

module.exports = {
  '/messageucolab': {
    target: process.env.MESSAGEUCOLAB_URL || 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
    configure: sinOrigin,
  },
  '/catalogo-parametros': {
    target: process.env.CATALOGO_PARAMETROS_URL || 'http://localhost:8081',
    changeOrigin: true,
    secure: false,
    configure: sinOrigin,
  },
  '/parametros-ui': {
    target: process.env.CATALOGO_PARAMETROS_UI_ORIGIN || 'http://localhost:4201',
    changeOrigin: true,
    secure: false,
  },
};
