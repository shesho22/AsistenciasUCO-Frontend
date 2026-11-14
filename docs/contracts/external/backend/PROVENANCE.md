# Provenance — BACKEND_GOLDEN_PATH_CONTRACT

SOURCE_REPOSITORY: C:\Users\josev\AsistenciasUCO\AsistenciasUCO
SOURCE_CONTRACT: docs\contracts\BACKEND_GOLDEN_PATH_CONTRACT.md
SOURCE_SHA256: 9b4830b468b58b49793658454a7b34deec20d2d9681943aa8f1e3942b15d8c62
SOURCE_CONTRACT_STATE: backend C.2A (fila 8 PUT legacy/deprecated, fila 9 PATCH `actualizarSesion`)
BACKEND_OPENAPI: docs\contracts\openapi\openapi-golden-path.yaml (canónico externo; NO copiado al frontend)
BACKEND_OPENAPI_SHA256: 72a3097bbae2a296ed6690bf89c239f56697764f25100b930d941a699736da54
COPIED_AT: 2026-09-24T17:58:18-0500 (local)
SOURCE_READ_ONLY: YES
COPY: byte-for-byte (verified with cmp and sha256sum)

## Historial
- Copia previa (LB-001B/MV-001): SHA-256 02a174564defb17313b7e74aee10351aa8452f161e8fab196403f40ede3db121, copiada 2026-09-24T00:59:48-0500. Anterior a C.2A: NO contenía PATCH; no representa C.2A.
- LB-001C.2B.1: sincronizada con el contrato backend C.2A (SHA arriba).

## OpenAPI golden path (VAL PRU-03, 2026-11-14)
- Archivo: `openapi-golden-path.yaml`, copia byte a byte de `AsistenciasUCO-Infra/docs/contracts/openapi/openapi-golden-path.yaml`
  en `origin/develop` 40658ce (ultimo cambio del contrato: fbcd977, 2026-11-09).
- SHA-256: c2e6d28f4842d70cf9d43b3e3f87c9f54d80fad9fc8ceb4a8c726a3bb391e95f (igual al `.sha256` publicado en Infra).
- Cambia la decision anterior ("NO copiado al frontend"): la lista de chequeo VAL (PRU-03) pide que el frontend valide sus
  DTO contra el contrato. `scripts/check-openapi-contract.mjs` (en `npm run verify` y en el CI) verifica el hash y la
  conformidad. Para actualizarla: copiar de nuevo desde Infra, regenerar el `.sha256` y anotar aqui el commit.
- Hallazgo del 2026-11-14: `CancelacionSesion.tipo` del contrato solo lista DOCENTE y FESTIVO; el frontend acepta tambien
  COORDINADOR (DEC-065). El contrato va atrasado; la compuerta lo informa como aviso.

