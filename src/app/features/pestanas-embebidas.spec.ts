import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DeanCoordinadoresComponent } from './dean/dean-coordinadores/dean-coordinadores.component';
import { DeanCronogramaComponent } from './dean/dean-cronograma/dean-cronograma.component';
import { DeanProgramasComponent } from './dean/dean-programas/dean-programas.component';
import { CoordinatorDocentesComponent } from './coordinator/coordinator-docentes/coordinator-docentes.component';
import { CoordinatorGroupsComponent } from './coordinator/coordinator-groups/coordinator-groups.component';
import { CoordinatorPeriodsComponent } from './coordinator/coordinator-periods/coordinator-periods.component';
import { CoordinatorSubjectsComponent } from './coordinator/coordinator-subjects/coordinator-subjects.component';

/**
 * CULM-001: las pantallas que viven como pestañas (Mi facultad, Seguimiento y Programa) ocultan su propio título cuando
 * el cascarón de pestañas se lo pide con `embebido`; solo cambia la presentación del encabezado.
 */
describe('Pantallas embebidas en pestañas (CULM-001)', () => {
  const casos: Array<[string, Type<unknown>]> = [
    ['Gestión de coordinadores (Mi facultad)', DeanCoordinadoresComponent],
    ['Cronograma del decano (Seguimiento)', DeanCronogramaComponent],
    ['Programas del decano (Mi facultad)', DeanProgramasComponent],
    ['Docentes del coordinador (Programa)', CoordinatorDocentesComponent],
    ['Grupos del coordinador (Programa)', CoordinatorGroupsComponent],
    ['Períodos del coordinador (Programa)', CoordinatorPeriodsComponent],
    ['Materias del coordinador (Programa)', CoordinatorSubjectsComponent],
  ];

  for (const [nombre, componente] of casos) {
    it(`${nombre}: muestra su título por defecto y lo oculta embebido`, () => {
      TestBed.configureTestingModule({
        imports: [componente],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const fixture = TestBed.createComponent(componente);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('h1')).withContext('título por defecto').not.toBeNull();

      fixture.componentRef.setInput('embebido', true);
      fixture.detectChanges();
      expect(el.querySelector('h1')).withContext('título embebido').toBeNull();
    });
  }

  it('Programas del decano embebido oculta también los indicadores y el buscador de planes', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Planes Registrados');
    expect(el.querySelector('input[aria-label="Buscar programa o plan de estudios por código o nombre"]')).not.toBeNull();

    fixture.componentRef.setInput('embebido', true);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Planes Registrados');
    expect(el.querySelector('input[aria-label="Buscar programa o plan de estudios por código o nombre"]')).toBeNull();
    expect(el.textContent).not.toContain('Resumen de Facultad');
  });
});
