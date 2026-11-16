import { getApiErrorCode } from './api-error.util';

/** HU178: roles cuyo ámbito (programa, facultad o institución) puede faltar sin que sea un fallo del aplicativo. */
export type RolSinAmbito = 'DECANO' | 'COORDINADOR' | 'ADMINISTRADOR';

/**
 * HU178: códigos canónicos con los que el backend responde que el usuario aún no tiene su ámbito asignado
 * (`DbCodeTranslator`). Son un estado de negocio esperado, no un fallo. Los demás 403 llegan con el código genérico
 * `FORBIDDEN` y no se pueden distinguir: para esos el frontend decide antes de consultar con el perfil.
 */
const ROL_POR_CODIGO: Readonly<Record<string, RolSinAmbito>> = {
  KPI_001: 'COORDINADOR',
  KPI_003: 'DECANO',
  KPI_004: 'ADMINISTRADOR',
};

/** Rol al que le falta el ámbito según el código canónico del error, o `null` si es otro error. Nunca lee el texto. */
export function rolSinAmbito(error: unknown): RolSinAmbito | null {
  return ROL_POR_CODIGO[getApiErrorCode(error)] ?? null;
}
