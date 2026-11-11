# HU177 — recuperar contraseña: retiro del flujo propio

## Decisión

John, 2026-11-11: recuperar la contraseña **no es de esta aplicación**. Es del servicio de seguridad de terceros (Security Baseline / Keycloak), y la aplicación debe apoyarse en él. HU177 queda **pendiente de terceros**.

Esta decisión reemplaza la del mismo día que aprobó un flujo propio. Ese flujo estuvo unas horas en `develop` (PR #94) y se retira completo con un revert de ese merge.

## Qué se retira del frontend

| Pieza | Estado |
|---|---|
| Página pública `/recuperar-clave` (`RecoverPasswordComponent`) | Retirada |
| Página pública `/restablecer-clave` (`ResetPasswordComponent`) | Retirada |
| `PasswordRecoveryService` | Retirado |
| Las dos rutas en `app.routes.ts` y los dos prefijos en `PUBLIC_ROUTE_PREFIXES` | Retirados |
| El enlace del login a `/recuperar-clave` | Vuelve a ser el botón que solo informa |

## Cómo queda el login

"¿Olvidaste tu contraseña?" sigue visible. Al pulsarlo muestra un aviso: la recuperación por correo aún no está habilitada y, mientras tanto, el restablecimiento se pide al administrador de la plataforma. No llama al backend ni al proveedor de identidad.

## Qué queda para HU177

Cuando el servicio de seguridad de terceros active su recuperación de contraseña, el botón del login se conecta con ella. Ese cambio será pequeño y solo de enlace: la aplicación no pide el correo, no valida enlaces y no recibe contraseñas.

## Regla que deja esta decisión

Antes de construir cualquier pantalla de identidad o credenciales, confirmar si la cubre el componente de seguridad de terceros. Si la cubre, la aplicación solo enlaza.

## Validación

| Paso | Resultado |
|---|---|
| `npm run verify`, 2026-11-11 | exit 0; `TOTAL: 2692 SUCCESS`; `coverage:realtime` PASSED (line 95.26 %, branch 86.81 %); build correcto con la advertencia de presupuesto ya conocida (519.19 kB sobre 512 kB). Es el mismo total que tenía `develop` antes de HU177 |
| Comparación con `develop` anterior a HU177 | El código y las pruebas quedan idénticos; solo se agrega este documento |
