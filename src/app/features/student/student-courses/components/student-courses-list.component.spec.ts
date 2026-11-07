import { TestBed } from '@angular/core/testing';
import { StudentCoursesListComponent } from './student-courses-list.component';
import { crearMateria } from '../../../../core/testing/student-portal.fixtures';
import { IndicadoresAsistenciaResponse } from '../../../../core/models/indicadores-asistencia.model';

const indicadores = (parcial: Partial<IndicadoresAsistenciaResponse> = {}): IndicadoresAsistenciaResponse => ({
  sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 16, horasFalta: 3, horasExcusa: 1, horasSinRegistro: 0,
  porcentajeInasistencia: 15, porcentajeAsistencia: 80, codigoPermanencia: 'RIESGO', umbralAdvertencia: 15, umbralPerdida: 20,
  ...parcial,
});

describe('StudentCoursesListComponent — indicadores por horas (CULM-001 B.2)', () => {
  function render(materias = [crearMateria({ indicadores: indicadores() })]) {
    const fixture = TestBed.configureTestingModule({ imports: [StudentCoursesListComponent] }).createComponent(
      StudentCoursesListComponent
    );
    fixture.componentRef.setInput('materias', materias);
    fixture.detectChanges();
    return fixture;
  }
  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');

  it('B2-F-16 muestra el % de inasistencia por horas y las horas de falta sobre las dictadas', () => {
    const t = texto(render());
    expect(t).toContain('15% de inasistencia');
    expect(t).toContain('3 h de falta de 20 h dictadas');
  });

  it('B2-F-16 el semaforo sale de codigoPermanencia y de los umbrales del backend', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-asistencia"]')!.textContent).toContain('En riesgo');
    expect(texto(fixture)).toContain('Advertencia desde 15%');
    expect(texto(fixture)).toContain('pérdida desde 20%');
  });

  it('B2-F-16 un % por encima de 15 sin codigoPermanencia no inventa semaforo (sin umbrales 85/75 en el cliente)', () => {
    const fixture = render([crearMateria({ indicadores: indicadores({ codigoPermanencia: null, porcentajeInasistencia: 40 }) })]);
    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-asistencia"]')).toBeNull();
    expect((fixture.componentInstance as unknown as Record<string, unknown>)['getProgressColor']).toBeUndefined();
  });

  it('B2-F-16 sin indicadores muestra "No disponible" sin NaN', () => {
    const fixture = render([crearMateria()]);
    expect(fixture.nativeElement.querySelector('[data-testid="asistencia-no-disponible"]')).not.toBeNull();
    expect(texto(fixture)).not.toContain('NaN');
  });

  it('B2-F-17 el boton "Registrar asistencia con PIN" emite registrarConPin y mide 44 px', () => {
    const fixture = render();
    const emitido = jasmine.createSpy('pin');
    fixture.componentInstance.registrarConPin.subscribe(emitido);
    const boton = fixture.nativeElement.querySelector('[data-testid="registrar-con-pin"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Registrar asistencia con PIN');
    expect(boton.className).toContain('min-h-[44px]');
    boton.click();
    expect(emitido).toHaveBeenCalledTimes(1);
  });
});
