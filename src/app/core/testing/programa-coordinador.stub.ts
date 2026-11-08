import { computed, signal } from '@angular/core';
import { of } from 'rxjs';
import { ProgramaResumen } from '../models/role-management.model';
import { CoordinatorProgramService } from '../services/coordinator-program.service';

export const PROGRAMA_A: ProgramaResumen = { idPrograma: 'prg-a', nombrePrograma: 'Ingeniería de Sistemas' };
export const PROGRAMA_B: ProgramaResumen = { idPrograma: 'prg-b', nombrePrograma: 'Ingeniería de Software' };

/** Doble de CoordinatorProgramService para specs de pantallas del coordinador (sin peticiones HTTP). */
export function crearProgramaCoordinadorStub(programas: ProgramaResumen[] = [PROGRAMA_A], idActual: string | null = programas[0]?.idPrograma ?? null) {
  const lista = signal(programas);
  const programaId = signal<string | null>(idActual);
  return {
    programas: lista.asReadonly(),
    cargado: signal(true),
    programaId,
    requiereSelector: computed(() => lista().length > 1),
    cargar: jasmine.createSpy('cargar').and.callFake(() => of(lista())),
    seleccionar: jasmine.createSpy('seleccionar').and.callFake((id: string) => programaId.set(id)),
  } as unknown as CoordinatorProgramService;
}
