# Frontend: plan de remediación de hallazgos HIGH heredados

Estado: análisis preparado fuera del alcance funcional del PR #22.

## Evidencia y decisión de alcance

Los SARIF de Trivy comparados para los PR #21 y #22 presentan las mismas 19 alertas HIGH del filesystem y las mismas 3 alertas HIGH de la imagen. No se observa una alerta nueva atribuible al código de integración de Seguridad UCO del PR #22. El inventario no debe interpretarse como una excepción de seguridad: `exit-code: 0` permite publicar la evidencia y no silencia vulnerabilidades.

El PR #22 queda limitado a la corrección de configuración runtime de `env.js`. No se hace una migración mayor de Angular, no se cambian los perfiles del PDP, no se modifican Keycloak, SQL Server, datos ni asignaciones manuales.

## Matriz de remediación

| Área | Estado observado | Remediación independiente | Criterio de aceptación |
| --- | --- | --- | --- |
| Angular | `@angular/*` 18.2.14 aparece en `package-lock.json`; incluye alertas sobre `common`, `compiler`, `core` y `router`. | Actualizar desde el `develop` vigente con la guía de migración oficial de Angular, alineando CLI, compiler, TypeScript y Node. Resolver primero las migraciones automáticas y después revisar templates, builders y tests. | Versión soportada fijada en `package.json`/lockfile, `npm test`, build de producción, cobertura y Sonar sin exclusiones nuevas. |
| `source-map-js` | 1.2.1 está en el árbol de dependencias. | Identificar propietario con `npm why source-map-js` y llevarlo a `>=1.2.2` mediante actualización directa o del paquete transitivo que lo fija. | Lockfile reproducible, `npm ci`, Trivy filesystem sin el CVE y sin usar `npm audit fix --force` como sustituto del análisis. |
| Nginx/Alpine | La imagen final contiene `brotli-libs` y `curl/libcurl` vulnerables según el SARIF de imagen. | Seleccionar y fijar un tag/digest Nginx/Alpine que contenga al menos `brotli-libs >=1.2.1-r0` y `curl/libcurl >=8.23.0-r0`, verificando los paquetes reales con Trivy. | Imagen reproducible, Trivy de filesystem e imagen sin esos CVE o con dictamen documentado del proveedor; no excluir rutas. |
| Nginx no root | El Dockerfile actual no declara `USER`; Nginx escucha en 80 y el entrypoint escribe `assets/env.js`. | Cambiar el listener interno a 8080, mapear Compose `4200:8080`, preparar permisos de `/var/cache/nginx`, `/var/run` y `assets`, y ejecutar Nginx como usuario no root. Probar que el entrypoint puede generar `env.js` antes de arrancar el worker. | `id` del proceso no es root, `/assets/env.js` se genera y se sirve, no hay `${...}`, Compose resuelve puertos y variables, y el arranque no requiere un volumen escribible inseguro. |
| Build stage frente a imagen final | Angular compiler y `source-map-js` son dependencias de construcción; el Dockerfile copia solo `dist` a Nginx. `curl`, `libcurl` y `brotli-libs` sí pertenecen a la imagen final. | Separar el triage: corregir dependencias de build por riesgo de compilación/Supply Chain y evaluar los paquetes que realmente quedan en runtime. Para Angular runtime, revisar también el código generado y los escenarios afectados; no asumir que “no está en la imagen” elimina el riesgo del navegador. | Inventario de ambos stages, SBOM/SARIF conservados y conclusión por paquete: build-only, bundle navegador o runtime de imagen. |

## Matriz de pruebas de la rama de seguridad

1. `npm ci` y tests Angular completos con ChromeHeadless.
2. Build de producción y cobertura global/realtime sin bajar umbrales.
3. `npm why`/lockfile y Trivy filesystem con `vuln,misconfig,secret`.
4. Build de imagen, Trivy de imagen y comprobación de SBOM por stage.
5. Runtime Nginx como no root: UID, puerto interno 8080, permisos, generación de `env.js` y entrega HTTP.
6. `docker compose config` con valores no secretos para OAuth/OIDC, Keycloak, BFF/PEP-PDP y Seguridad UCO.
7. Validación integrada controlada: login OIDC en Keycloak, sesión BFF, decisión PEP/PDP y montaje de Seguridad UCO; sin reaprovisionar perfiles manuales ni modificar asignaciones.

## Condiciones de cierre

- No ocultar CVE, no excluir archivos del análisis y no cambiar umbrales para obtener verde.
- Registrar SHA, versión de imagen, digest, run CI, SARIF y paquetes afectados.
- Mantener el PR #22 separado de esta migración mayor; esta rama parte de `develop` actualizado y debe recibir su propio PR cuando la matriz esté completa.
