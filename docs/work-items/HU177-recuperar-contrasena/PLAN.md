# HU177 — recuperar contraseña

## Decisión

John, 2026-11-11: HU177 se hace con un flujo propio de la aplicación (enlace de un solo uso por correo), no con la pantalla de Keycloak. El botón "¿Olvidaste tu contraseña?" del login, que solo informaba, pasa a abrir el flujo real.

## Qué cambia en pantalla

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Login | `/login` | "¿Olvidaste tu contraseña?" ahora es un enlace a `/recuperar-clave` |
| Recuperar contraseña | `/recuperar-clave` (pública) | Pide el correo y muestra el mensaje del backend, que es el mismo exista o no la cuenta |
| Definir contraseña nueva | `/restablecer-clave#token=…` (pública) | Destino del enlace del correo. Pide la contraseña dos veces, muestra los requisitos y la guarda |

## Piezas

| Archivo | Qué hace |
|---|---|
| `src/app/core/services/password-recovery.service.ts` | `requestLink(correo)` y `resetPassword(token, clave)` contra `POST /api/v1/public/recuperacion-clave/solicitud` y `/confirmacion` |
| `src/app/features/auth/recover-password/recover-password.component.ts` | Página para pedir el enlace |
| `src/app/features/auth/reset-password/reset-password.component.ts` | Página para definir la contraseña |
| `src/app/app.routes.ts` | Las dos rutas públicas, bajo el layout público |
| `src/app/core/security/baseline-oidc.ts` | `/recuperar-clave` y `/restablecer-clave` entran a `PUBLIC_ROUTE_PREFIXES`: en ellas no se intenta la re-autenticación silenciosa |
| `src/app/features/auth/login/login.component.ts` | El botón pasa a ser un enlace; se retira el aviso de "aún no está habilitada" |

## Reglas

- El token llega en el fragmento de la URL. La página lo lee una sola vez, lo borra de la URL y del historial y lo envía solo en el cuerpo del POST. No se guarda en ningún almacén del navegador.
- La contraseña viaja solo en el cuerpo del POST y se borra de la memoria de la página al terminar.
- La pantalla de solicitud no dice si el correo existe: muestra el mensaje del backend tal cual.
- Los requisitos de la contraseña se validan en pantalla para avisar pronto (8 a 255 caracteres sin espacios, mayúscula, minúscula, número, carácter especial y coincidencia de las dos casillas). Quien decide es el backend: sus errores se muestran tal cual.
- Si el enlace no sirve, la página ofrece "Pedir un enlace nuevo".

## Dependencias

- Backend y BD de HU177 (migración 35).
- El correo sale solo si el canal de notificaciones del ambiente envía correos reales y su `platform-url` apunta a este frontend.

## Rollback

Revertir el commit. No hay datos ni contratos que deshacer en el frontend.
