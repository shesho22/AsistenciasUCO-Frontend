import { crearEnvironment } from './environment.base';

/** Entorno de producción: `production=true` y sin modo simulado (se usa con `fileReplacements` en angular.json). */
export const environment = crearEnvironment(true);
