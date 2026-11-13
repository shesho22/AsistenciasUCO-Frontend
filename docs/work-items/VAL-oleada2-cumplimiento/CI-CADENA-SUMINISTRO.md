# VAL-oleada2-cumplimiento: cadena de suministro y CI del frontend (agente T)

Fecha: 2026-11-12. Rama `fix/VAL-oleada2-cumplimiento`. Ítems de `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`: TRI-03, TRI-06, TRI-07, SEC-05, SEC-08, EST-04, EST-07, EST-08, EST-09, EST-10 y EST-11.

## Plan y cambios

| Ítem | Cambio | Archivo |
| :--- | :--- | :--- |
| TRI-03 | Trivy fs e imagen en dos pasos: inventario SARIF (`exit-code 0`) subido a Code Scanning (`upload-sarif`) y compuerta `exit-code 1`, `HIGH,CRITICAL`, `ignore-unfixed: true`. Trivy 0.74.0 (antes 0.72.0), binario con checksum verificado | `.github/workflows/frontend-ci.yml` |
| TRI-06 | `.trivyignore` con una entrada por CVE, motivo y `exp:2027-02-12` | `.trivyignore` |
| SEC-05 / SEC-08 | Job `Gitleaks Secret Scan` (binario 8.30.1 con SHA-256 fijado, solo commits del PR/push) y `.github/gitleaks.toml` | `frontend-ci.yml`, `.github/gitleaks.toml` |
| EST-04 | Acción de Sonar cambiada de `sonarcloud-github-action` (deprecada, redirige por etiqueta mutable) a `SonarSource/sonarqube-scan-action` v8.4.1 fijada por SHA; sigue con `sonar.qualitygate.wait=true` | `frontend-ci.yml` |
| EST-07 | Job `CodeQL JavaScript/TypeScript Analysis` (`build-mode: none`) | `frontend-ci.yml` |
| EST-08 | Job `Dependency Review` en PR, `fail-on-severity: high` | `frontend-ci.yml` |
| EST-09 | Dependabot semanal: npm, docker y github-actions hacia `develop` | `.github/dependabot.yml` |
| EST-10 | Paso `npm audit --omit=dev --json` como reporte (artifact); el bloqueo lo hace la compuerta Trivy | `frontend-ci.yml` |
| EST-11 | ESLint 9 + angular-eslint 18.4.3 + typescript-eslint 8.72.2 (versiones exactas, compatibles con Angular 18.2 y TypeScript 5.5), `eslint.config.js` plano, script `npm run lint` y paso `Lint (ESLint)` en CI | `eslint.config.js`, `package.json`, `package-lock.json`, `frontend-ci.yml` |
| Fijado | Todas las acciones fijadas por SHA con comentario del tag; permisos mínimos por job | `frontend-ci.yml` |

## Validación

| Prueba | Resultado |
| :--- | :--- |
| `npm run lint` (ESLint sobre `src/**/*.{ts,html}`) | 0 errores, 427 avisos. Avisos por regla: `no-explicit-any` 348, `no-unused-vars` 45, `label-has-associated-control` 15, `template/eqeqeq` 5, `interactive-supports-focus` 5, `click-events-have-key-events` 4, `no-output-native` 2, `no-this-alias` 1, `prefer-const` 1, `no-input-rename` 1. Esas reglas quedaron en `warn` como deuda; el resto de las recomendadas bloquea |
| `rhysd/actionlint:1.7.12` (incluye shellcheck) | 0 hallazgos |
| Parseo YAML (js-yaml) de `frontend-ci.yml` y `dependabot.yml` | OK |
| Trivy local `aquasec/trivy:0.74.0 fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed` sobre el árbol rastreado | 18 filas HIGH (15 CVE únicos) en `package-lock.json`; 0 secretos; 0 misconfig (Dockerfile) |
| gitleaks 8.30.1 `dir` sin configuración / con `.github/gitleaks.toml` | 2 falsos positivos (digest SHA-256 en `docs/contracts/.../PROVENANCE.md`, contraseña de prueba en un spec) / 0 |
| gitleaks con configuración en modo `git`: rango `HEAD~5..HEAD` / historial completo (523 commits) | rc 0 / 0 hallazgos |
| Workflows en GitHub | No ejecutados; la primera corrida del PR es la evidencia |

### Triage Trivy (TRI-06 / TRI-07)

Todas las de Angular se corrigen solo con un salto de versión mayor (19.2.x, 20.3.x o 21.x); en la línea 18 no hay parche. Se clasificaron por uso real en `src/` (grep del 2026-11-12) y quedaron en `.trivyignore` con vencimiento:

| CVE | Paquete | Corregida en | Motivo de la excepción |
| :--- | :--- | :--- | :--- |
| CVE-2026-50170, CVE-2026-54266, CVE-2026-68945 | @angular/common | 20.3.22-20.3.27 / 21.2.x | HttpTransferCache: solo SSR. La app es CSR (sin `@angular/ssr` ni `provideClientHydration`) |
| CVE-2026-54267 | @angular/core | 20.3.25 | Hidratación de cliente: no se usa |
| CVE-2026-101896, CVE-2026-111752 | @angular/router | 20.3.32 / 20.3.33 | DoS durante SSR: no hay SSR |
| CVE-2026-32635, CVE-2026-69151, CVE-2026-27970 | @angular/core, @angular/compiler | 20.3.18-20.3.27 | XSS por i18n o traducciones: no hay i18n ni `$localize` |
| CVE-2026-50171, CVE-2026-54268 | @angular/common | 20.3.22 / 20.3.25 | DoS con formato del atacante: todos los formatos de DecimalPipe y DatePipe son literales |
| CVE-2025-66412, CVE-2026-22610 | @angular/compiler, @angular/core | 20.3.15 / 20.3.16 | XSS por SVG animado, MathML o href en SVG: no existen en las plantillas |
| CVE-2025-66035 | @angular/common | 20.3.14 | Fuga del token XSRF a URLs `//host`: la URL del API es absoluta o del host actual. Mitigado por configuración (API_URL nunca relativa al protocolo); riesgo residual bajo |
| CVE-2026-93749 | source-map-js 1.2.1 | 1.2.2 | DoS al leer source maps malformados: solo corre en el build con mapas propios, no va al bundle |

Conteo real HIGH/CRITICAL con corrección disponible: 15 CVE (0 CRITICAL). Ninguno se ignora "porque sí": todos vencen el 2027-02-12 y la corrección de fondo es subir Angular (EST-10, decisión pendiente) y `source-map-js` a 1.2.2 en el lockfile.

> Actualización 2026-11-13 (VAL oleada 3): Angular subió a 22.2.4 y `source-map-js` quedó en 1.2.2; las 15 excepciones se retiraron de `.trivyignore`. Ver `docs/work-items/VAL-oleada3-angular/VALIDATION.md`.

## Pendiente externo

- Decidir y planear el salto de Angular 18 a una versión soportada (cierra las 14 de Angular de raíz).
- Habilitar Dependency Graph y Code Scanning en el repo (admin) para que `Dependency Review` y `upload-sarif` funcionen.
- Marcar `Gitleaks Secret Scan`, `CodeQL JavaScript/TypeScript Analysis` y `Dependency Review` como required checks.
- Bajar el número de avisos de ESLint y subir esas reglas a `error` por lotes.
