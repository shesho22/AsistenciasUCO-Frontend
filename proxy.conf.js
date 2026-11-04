/**
 * Proxy del servidor de desarrollo (ng serve).
 *
 * /messageucolab -> gateway de MessageUcoLab (Kong). La administración de mensajes (micro frontend minifront-mensajes)
 * llama a esa ruta relativa para que el navegador envíe la cookie de sesión de seguridad (SECURITY_BASELINE_SESSION) al
 * mismo origen de la SPA. Se quita la cabecera Origin: sin esto el componente rechaza con 403 los POST/PUT/DELETE que
 * llegan de un origen que no conoce.
 *
 * El destino se cambia con MESSAGEUCOLAB_URL; por defecto es el gateway local (http://localhost:8000).
 */
module.exports = {
  '/messageucolab': {
    target: process.env.MESSAGEUCOLAB_URL || 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
    },
  },
};
