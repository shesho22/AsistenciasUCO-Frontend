# TEST PLAN — P0-C ChromeHeadless

## RED snapshot

- Base: `fac2f640`.
- Comando: `npm run verify`.
- Resultado: build de tests generado; ChromeHeadlessCI no capturó en 60 s y
  falló dos veces.

## GREEN

- ejecutar `npm run test:ci -- --no-progress` con ChromeHeadlessCI;
- verificar contadores de specs y cobertura real;
- ejecutar build development, build production, realtime coverage y `npm run verify`.

Una prueba no capturada no cuenta como PASS.
