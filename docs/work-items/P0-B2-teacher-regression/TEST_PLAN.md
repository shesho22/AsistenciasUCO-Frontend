# TEST PLAN — P0-B2 teacher regression

## RED/GREEN evidence

La rama de consolidación contiene pruebas observables para: cero horarios,
varios horarios, múltiples grupos, error de horarios, error de asignaturas,
grupos ajenos y deduplicación. Se conserva el snapshot de la rama; no se
modifican los specs para ocultar fallos.

## VALIDATE

- `npm run test:ci -- --no-progress`
- `npm run build -- --configuration=production`
- `npm run coverage:realtime:check`
- `npm run verify` como gate agregado si los comandos anteriores pasan.

Los resultados de mocks HTTP certifican el consumidor frontend, no el provider
backend. El flujo real docente queda `NOT_RUN` si no existe entorno integrado.

