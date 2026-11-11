# HU177 — validación

## Automatizada

| Paso | Resultado |
|---|---|
| `npm run verify` (`lint:tokens`, `test:ci`, `coverage:realtime:check`, `check:retiro-solicitudes`, `check:registro-individual`, `check:hu-en-ui` y build de producción), 2026-11-11 | exit 0; `TOTAL: 2706 SUCCESS`; cobertura global: statements 93.08 %, branches 79.42 %, functions 93.55 %, lines 94.05 %; `coverage:realtime` PASSED (line 95.26 %, branch 86.81 %); build correcto con la advertencia de presupuesto ya conocida (519.45 kB sobre 512 kB) |

Pruebas nuevas o ajustadas:

| Archivo | Qué cubre |
|---|---|
| `password-recovery.service.spec.ts` | Las dos rutas, con el correo, el token y la contraseña solo en el cuerpo; error del backend; modo de mocks |
| `recover-password.component.spec.ts` | No envía sin correo; correo recortado y mensaje uniforme; no envía dos veces; error con reintento |
| `reset-password.component.spec.ts` | Lee el token del fragmento y lo borra de la URL; requisitos de la contraseña; envío y éxito; enlace que no sirve con "Pedir un enlace nuevo"; no envía dos veces; mostrar u ocultar |
| `login.component.spec.ts` | "¿Olvidaste tu contraseña?" es un enlace a `/recuperar-clave` |

Una primera corrida dio 2705 de 2706: falló la prueba nueva del modo de mocks, que activaba los mocks de una forma que el entorno no lee. Se corrigió la prueba; el código no cambió.

## En pantalla (lab local, 2026-11-11)

Recorrido completo con el backend y la BD de HU177. El detalle paso a paso está en el `VALIDATION.md` del work item homónimo del backend. En lo que toca a estas pantallas:

- El enlace del login abre `/recuperar-clave`.
- La página muestra el mismo mensaje con un correo que existe y con uno que no.
- `/restablecer-clave#token=…` borra el fragmento de la URL al abrir y no muestra el token.
- El botón "Guardar contraseña" se habilita solo cuando se cumplen los seis requisitos.
- Con un enlace vencido muestra el mensaje del backend y "Pedir un enlace nuevo".
- Con un enlace vigente muestra "Su contraseña fue actualizada. Ya puede iniciar sesión." y el acceso al login.

## Sin validar

- El envío con un servidor de correo real: depende del ambiente.
